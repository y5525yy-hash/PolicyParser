import type { MatchResidentsByPolicy, MatchPoliciesByResident } from "@/shared/contracts";
import { mockPolicies } from "@/features/policy/mock-policies";
import { mockResidents } from "@/features/resident/mock-residents";
import type {
  PolicyCriterion,
  PolicyRuleNode,
  PolicyRuleSet,
} from "./integration-contracts";
import {
  extractVerifiedPolicyRuleSet,
  integratedResidentFactProvider,
} from "./integrated-providers";
import { createPreparedLlmAssistedFieldAligner } from "./llm-field-aligner.server";
import { DEFAULT_OPENAI_COMPATIBLE_MODEL } from "./llm-openai-chat-client.server";
import { evaluatePolicyRuleSetForResident } from "./matching-rules";

/**
 * 编排 A/B provider、条件抽取器和纯规则内核，不在 service 中判断资格。
 * 接入真实模块时只替换 provider，公共函数签名和页面保持不变。
 */

function collectCriteriaFromNode(
  node: PolicyRuleNode,
  output: PolicyCriterion[],
) {
  if (node.type === "criterion") {
    output.push(node.criterion);
    return;
  }
  if (node.type === "not") {
    collectCriteriaFromNode(node.node, output);
    return;
  }
  for (const child of node.nodes) collectCriteriaFromNode(child, output);
}

function collectRuleSetCriteria(ruleSets: Array<PolicyRuleSet | null>) {
  const criteria: PolicyCriterion[] = [];
  for (const ruleSet of ruleSets) {
    if (!ruleSet) continue;
    for (const scenario of ruleSet.scenarios) {
      collectCriteriaFromNode(scenario.root, criteria);
    }
  }
  return criteria;
}

export function getMatchingRuntimeInfo() {
  const llmEnabled = Boolean(process.env.OPENAI_COMPATIBLE_API_KEY?.trim());
  return {
    llmEnabled,
    model: llmEnabled
      ? process.env.OPENAI_COMPATIBLE_MODEL?.trim() ||
        DEFAULT_OPENAI_COMPATIBLE_MODEL
      : null,
  };
}

export const matchResidentsByPolicy: MatchResidentsByPolicy = async (
  policyId,
) => {
  const policy = mockPolicies.find((item) => item.id === policyId);
  if (!policy) {
    throw new Error(`未找到政策：${policyId}`);
  }
  const ruleSet = await extractVerifiedPolicyRuleSet(policyId);
  const residentFacts = await Promise.all(
    mockResidents.map(async (resident) => ({
      resident,
      facts: await integratedResidentFactProvider.getResidentFacts(resident.id),
    })),
  );
  const fieldAligner = await createPreparedLlmAssistedFieldAligner(
    collectRuleSetCriteria([ruleSet]),
    residentFacts[0]?.facts ?? [],
  );
  return Promise.all(
    residentFacts.map(async ({ resident, facts }) => {
      return await evaluatePolicyRuleSetForResident(
        policy,
        resident,
        ruleSet,
        facts,
        fieldAligner,
      );
    }),
  );
};

export const matchPoliciesByResident: MatchPoliciesByResident = async (
  residentId,
) => {
  const resident = mockResidents.find((item) => item.id === residentId);
  if (!resident) {
    throw new Error(`未找到居民：${residentId}`);
  }
  const facts = await integratedResidentFactProvider.getResidentFacts(residentId);
  const ruleSets = await Promise.all(
    mockPolicies.map((policy) => extractVerifiedPolicyRuleSet(policy.id)),
  );
  const fieldAligner = await createPreparedLlmAssistedFieldAligner(
    collectRuleSetCriteria(ruleSets),
    facts,
  );
  return Promise.all(
    mockPolicies.map(async (policy, index) => {
      return await evaluatePolicyRuleSetForResident(
        policy,
        resident,
        ruleSets[index] ?? null,
        facts,
        fieldAligner,
      );
    }),
  );
};

export async function matchAllResidentsAndPolicies() {
  const [ruleSets, residentFacts] = await Promise.all([
    Promise.all(
      mockPolicies.map((policy) => extractVerifiedPolicyRuleSet(policy.id)),
    ),
    Promise.all(
      mockResidents.map(async (resident) => ({
        resident,
        facts: await integratedResidentFactProvider.getResidentFacts(
          resident.id,
        ),
      })),
    ),
  ]);
  const fieldAligner = await createPreparedLlmAssistedFieldAligner(
    collectRuleSetCriteria(ruleSets),
    residentFacts[0]?.facts ?? [],
  );

  const rows = await Promise.all(
    residentFacts.flatMap(({ resident, facts }) =>
      mockPolicies.map(async (policy, index) =>
        evaluatePolicyRuleSetForResident(
          policy,
          resident,
          ruleSets[index] ?? null,
          facts,
          fieldAligner,
        ),
      ),
    ),
  );
  return rows;
}
