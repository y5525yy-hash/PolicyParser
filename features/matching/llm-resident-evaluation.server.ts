import { mockPolicies } from "@/features/policy/mock-policies";
import { mockResidents } from "@/features/resident/mock-residents";
import { syntheticResidents } from "@/features/resident/synthetic-residents";
import type { MatchResult, Policy, Resident } from "@/shared/types";

import { alignCriterionToFacts } from "./field-aligner";
import {
  extractVerifiedPolicyRuleSet,
  integratedResidentToFacts,
} from "./integrated-providers";
import type {
  FieldAligner,
  FieldAlignmentMethod,
  PolicyCriterion,
  PolicyRuleNode,
  PolicyRuleSet,
  ResidentFact,
} from "./integration-contracts";
import { createPreparedLlmAssistedFieldAligner } from "./llm-field-aligner.server";
import type { LlmJsonClient, LlmJsonRequest } from "./llm-contracts";
import { evaluatePolicyRuleSetForResident } from "./matching-rules";
import {
  SYNTHETIC_EVALUATION_POLICY_IDS,
  syntheticResidentGroundTruth,
  type SyntheticEvaluationPolicyId,
} from "./synthetic-resident-ground-truth";

const MAX_LIVE_REQUESTS = 30;

interface FieldProjection {
  key: string;
  label: string;
  aliases: string[];
}

const FIELD_PROJECTIONS: Record<string, FieldProjection> = {
  resident_age: {
    key: "demographic_year_count",
    label: "Chronological lifetime years",
    aliases: ["completed years since birth"],
  },
  register_area: {
    key: "civil_registry_jurisdiction",
    label: "Registered civil jurisdiction",
    aliases: ["municipal registration authority"],
  },
  low_income_status: {
    key: "economic_support_class",
    label: "Household economic support classification",
    aliases: ["assistance tier"],
  },
  familyStatus: {
    key: "household_exception_group",
    label: "Special household classification",
    aliases: ["exception family category"],
  },
  disability_status: {
    key: "care_dependency_assessment",
    label: "Resident disability status or severe loss-of-ability assessment",
    aliases: ["disability status", "severe care dependency grade"],
  },
  disabilityCertificate: {
    key: "supporting_disability_document_flag",
    label: "Official disability credential held",
    aliases: ["verified support credential"],
  },
  isStudent: {
    key: "formal_education_enrolment_flag",
    label: "Currently enrolled in formal education",
    aliases: ["active school enrolment"],
  },
  isGovernmentOrPublicInstitutionStaff: {
    key: "public_body_employment_flag",
    label: "Employment in a government-funded public body",
    aliases: ["public service institution worker"],
  },
  coveredByEmployeePensionInsurance: {
    key: "employment_pension_scheme_flag",
    label: "Covered by an employment-based retirement scheme",
    aliases: ["occupational pension coverage"],
  },
  contributionYears: {
    key: "resident_scheme_paid_years",
    label: "Completed contribution years in the resident scheme",
    aliases: ["resident retirement contribution duration"],
  },
  receivesOtherBasicPensionBenefit: {
    key: "other_state_pension_receipt_flag",
    label: "Receiving another state basic retirement benefit",
    aliases: ["other public pension payment"],
  },
  hukouType: {
    key: "urban_registry_household_class",
    label: "Household civil-registration class",
    aliases: ["urban registration category"],
  },
  householdMonthlyIncomePerCapitaPrevious12Months: {
    key: "twelve_month_member_income",
    label: "Average monthly income per household member over twelve months",
    aliases: ["rolling per-capita household income"],
  },
  householdHasHousingInBeijing: {
    key: "capital_home_ownership_flag",
    label: "Household owns housing within the capital municipality",
    aliases: ["local dwelling ownership"],
  },
  householdNetAssets: {
    key: "net_family_asset_amount",
    label: "Total net assets held by the household",
    aliases: ["household asset balance"],
  },
};

const PASSTHROUGH_FACT_KEYS = new Set(["family_population"]);

function uniqueCriteria(criteria: PolicyCriterion[]) {
  return Array.from(
    new Map(criteria.map((criterion) => [criterion.id, criterion])).values(),
  );
}

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

function collectCriteria(ruleSets: PolicyRuleSet[]) {
  const criteria: PolicyCriterion[] = [];
  for (const ruleSet of ruleSets) {
    for (const scenario of ruleSet.scenarios) {
      collectCriteriaFromNode(scenario.root, criteria);
    }
  }
  return uniqueCriteria(criteria);
}

function projectFactsForLlm(facts: ResidentFact[]) {
  return facts.flatMap<ResidentFact>((fact) => {
    const projection = FIELD_PROJECTIONS[fact.key];
    if (projection) {
      return [
        {
          ...fact,
          key: projection.key,
          label: projection.label,
          aliases: projection.aliases,
        },
      ];
    }
    return PASSTHROUGH_FACT_KEYS.has(fact.key) ? [fact] : [];
  });
}

function expectedOutcome(residentId: string, policyId: string) {
  const resident = syntheticResidentGroundTruth.find(
    (item) => item.residentId === residentId,
  );
  return resident?.expected[policyId as SyntheticEvaluationPolicyId] ?? null;
}

interface EvaluationContext {
  policies: Policy[];
  residents: Resident[];
  ruleSets: Map<string, PolicyRuleSet>;
  canonicalFacts: Map<string, ResidentFact[]>;
  projectedFacts: Map<string, ResidentFact[]>;
  criteria: PolicyCriterion[];
}

async function createEvaluationContext(): Promise<EvaluationContext> {
  const policies = SYNTHETIC_EVALUATION_POLICY_IDS.map((policyId) => {
    const policy = mockPolicies.find((item) => item.id === policyId);
    if (!policy) throw new Error(`缺少评测政策：${policyId}`);
    return policy;
  });
  const residents = syntheticResidents.map((syntheticResident) => {
    const resident = mockResidents.find(
      (item) => item.id === syntheticResident.id,
    );
    if (!resident) throw new Error(`合成居民未进入产品数据：${syntheticResident.id}`);
    return resident;
  });
  const ruleSetEntries = await Promise.all(
    policies.map(async (policy) => {
      const ruleSet = await extractVerifiedPolicyRuleSet(policy.id);
      if (!ruleSet) throw new Error(`政策缺少已核验规则：${policy.id}`);
      return [policy.id, ruleSet] as const;
    }),
  );
  const ruleSets = new Map(ruleSetEntries);
  const canonicalFacts = new Map(
    residents.map((resident) => [resident.id, integratedResidentToFacts(resident)]),
  );
  const projectedFacts = new Map(
    residents.map((resident) => [
      resident.id,
      projectFactsForLlm(canonicalFacts.get(resident.id) ?? []),
    ]),
  );
  return {
    policies,
    residents,
    ruleSets,
    canonicalFacts,
    projectedFacts,
    criteria: collectCriteria([...ruleSets.values()]),
  };
}

interface CaseResult {
  residentId: string;
  policyId: string;
  expectedStatus: MatchResult["status"];
  actualStatus: MatchResult["status"];
  passed: boolean;
  humanBasis: string;
}

async function evaluateGroundTruth(
  context: EvaluationContext,
  factSource: Map<string, ResidentFact[]>,
  fieldAligner?: FieldAligner,
) {
  const cases: CaseResult[] = [];
  for (const resident of context.residents) {
    const facts = factSource.get(resident.id) ?? [];
    for (const policy of context.policies) {
      const expected = expectedOutcome(resident.id, policy.id);
      if (!expected) throw new Error(`缺少人工答案：${resident.id}/${policy.id}`);
      const result = await evaluatePolicyRuleSetForResident(
        policy,
        resident,
        context.ruleSets.get(policy.id) ?? null,
        facts,
        fieldAligner,
      );
      cases.push({
        residentId: resident.id,
        policyId: policy.id,
        expectedStatus: expected.status,
        actualStatus: result.status,
        passed: result.status === expected.status,
        humanBasis: expected.humanBasis,
      });
    }
  }
  return cases;
}

export interface SyntheticTrackingClient {
  client: LlmJsonClient;
  report(): {
    requestCount: number;
    metadataOnly: boolean;
    leakedResidentTokens: string[];
    clientErrors: string[];
    modelMappings: Array<{
      criterionId: string;
      factKey: string | null;
      confidence: number | null;
    }>;
  };
}

export function createSyntheticTrackingClient(
  delegate: LlmJsonClient,
): SyntheticTrackingClient {
  let requestCount = 0;
  let metadataOnly = true;
  const leakedResidentTokens = new Set<string>();
  const clientErrors: string[] = [];
  const modelMappings: Array<{
    criterionId: string;
    factKey: string | null;
    confidence: number | null;
  }> = [];
  const forbiddenTokens = syntheticResidents.flatMap((resident) => [
    resident.id,
    resident.name,
  ]);

  return {
    client: {
      async generateJson(request: LlmJsonRequest) {
        requestCount += 1;
        if (requestCount > MAX_LIVE_REQUESTS) {
          throw new Error(`合成居民评测超过${MAX_LIVE_REQUESTS}次模型请求上限`);
        }
        const promptText = `${request.systemPrompt}\n${request.userPrompt}`;
        for (const token of forbiddenTokens) {
          if (promptText.includes(token)) leakedResidentTokens.add(token);
        }
        try {
          const payload = JSON.parse(request.userPrompt) as {
            residentFieldMetadata?: Array<Record<string, unknown>>;
          };
          const allowedKeys = new Set(["key", "label", "valueType", "aliases"]);
          if (
            !Array.isArray(payload.residentFieldMetadata) ||
            payload.residentFieldMetadata.some((item) =>
              Object.keys(item).some((key) => !allowedKeys.has(key)),
            )
          ) {
            metadataOnly = false;
          }
        } catch {
          metadataOnly = false;
        }
        let response: unknown;
        try {
          response = await delegate.generateJson(request);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          clientErrors.push(
            message.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]"),
          );
          throw error;
        }
        if (
          typeof response === "object" &&
          response !== null &&
          "mappings" in response &&
          Array.isArray(response.mappings)
        ) {
          for (const mapping of response.mappings) {
            if (typeof mapping !== "object" || mapping === null) continue;
            const criterionId =
              "criterionId" in mapping && typeof mapping.criterionId === "string"
                ? mapping.criterionId
                : "invalid";
            const factKey =
              "factKey" in mapping &&
              (typeof mapping.factKey === "string" || mapping.factKey === null)
                ? mapping.factKey
                : null;
            const confidence =
              "confidence" in mapping && typeof mapping.confidence === "number"
                ? mapping.confidence
                : null;
            modelMappings.push({ criterionId, factKey, confidence });
          }
        }
        return response;
      },
    },
    report() {
      return {
        requestCount,
        metadataOnly,
        leakedResidentTokens: [...leakedResidentTokens],
        clientErrors,
        modelMappings,
      };
    },
  };
}

export async function runSyntheticResidentEvaluation(
  trackingClient: SyntheticTrackingClient,
) {
  const context = await createEvaluationContext();
  const deterministicCases = await evaluateGroundTruth(
    context,
    context.canonicalFacts,
  );

  const sampleProjectedFacts =
    context.projectedFacts.get(context.residents[0]?.id ?? "") ?? [];
  const dictionaryPrecheck = context.criteria.map((criterion) => {
    const alignment = alignCriterionToFacts(criterion, sampleProjectedFacts);
    return {
      criterionId: criterion.id,
      factKey: alignment.factKey,
      confidence: alignment.confidence,
      unresolved: alignment.factKey === null,
    };
  });
  if (dictionaryPrecheck.some((item) => !item.unresolved)) {
    return {
      ok: false,
      category: "dictionary_precheck_failed",
      message: "陌生字段仍能被本地词典直接解析，无法证明真实 LLM 参与。",
      deterministicCases,
      dictionaryPrecheck,
      liveCases: [],
      tracking: trackingClient.report(),
      alignmentMethods: {} as Record<FieldAlignmentMethod, number>,
    };
  }

  const preparedAligner = await createPreparedLlmAssistedFieldAligner(
    context.criteria,
    sampleProjectedFacts,
    { client: trackingClient.client },
  );
  const methodCounts: Record<FieldAlignmentMethod, number> = {
    exact: 0,
    alias: 0,
    derived: 0,
    "semantic-fallback": 0,
    unresolved: 0,
  };
  const observedCriteria = new Set<string>();
  const recordingAligner: FieldAligner = {
    async alignField(criterion, facts) {
      const alignment = await preparedAligner.alignField(criterion, facts);
      if (!observedCriteria.has(criterion.id)) {
        methodCounts[alignment.method] += 1;
        observedCriteria.add(criterion.id);
      }
      return alignment;
    },
  };
  const liveCases = await evaluateGroundTruth(
    context,
    context.projectedFacts,
    recordingAligner,
  );
  const tracking = trackingClient.report();
  const deterministicPassed = deterministicCases.every((item) => item.passed);
  const livePassed = liveCases.every((item) => item.passed);
  const modelParticipated =
    tracking.requestCount > 0 && methodCounts["semantic-fallback"] > 0;
  const privacyPassed =
    tracking.metadataOnly && tracking.leakedResidentTokens.length === 0;

  return {
    ok:
      deterministicPassed &&
      livePassed &&
      modelParticipated &&
      privacyPassed &&
      tracking.requestCount <= MAX_LIVE_REQUESTS,
    category: "synthetic_resident_evaluation",
    message:
      "人工答案先冻结，真实模型只做陌生字段语义对齐，资格结果由确定性内核计算。",
    constructedWithoutLlm: syntheticResidentGroundTruth.every(
      (item) => item.constructedWithoutLlm,
    ),
    residentCount: context.residents.length,
    policyCount: context.policies.length,
    caseCount: deterministicCases.length,
    deterministicCases,
    dictionaryPrecheck,
    liveCases,
    tracking,
    alignmentMethods: methodCounts,
    qualificationAuthority: "deterministic-kernel" as const,
  };
}
