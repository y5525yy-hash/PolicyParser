import type {
  MatchResult,
  MatchStatus,
  Policy,
  Resident,
} from "@/shared/types";
import type {
  KernelDecision,
  FieldAligner,
  PolicyCriterion,
  PolicyRuleSet,
  ResidentFact,
} from "./integration-contracts";
import {
  evaluateCriteriaForFacts,
  evaluatePolicyRuleForFacts,
} from "./matching-kernel";

/**
 * 确定性规则出口。政策证据和居民事实由 service/provider 准备，
 * 本文件只调用纯匹配内核并转换为公共 MatchResult。
 */
const DECISION_TO_MATCH_STATUS: Record<KernelDecision, MatchStatus> = {
  candidate: "matched",
  "needs-verification": "pending",
  "not-candidate": "unmatched",
};

export async function evaluatePolicyForResident(
  policy: Policy,
  resident: Resident,
  criteria: PolicyCriterion[],
  facts: ResidentFact[],
): Promise<MatchResult> {
  const evaluation = await evaluateCriteriaForFacts(criteria, facts);
  return {
    policyId: policy.id,
    residentId: resident.id,
    status: DECISION_TO_MATCH_STATUS[evaluation.decision],
    reasons: evaluation.reasons,
    missingFields: evaluation.missingFields,
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

const POLICY_SCENARIO_MATCH_SUMMARIES: Record<
  string,
  Record<string, string>
> = {
  "policy-004": {
    参保条件: "符合“参保条件”：户籍、年龄及参保身份条件均已核对",
    领取待遇条件:
      "符合“领取待遇条件”：年龄、缴费年限及其他养老待遇情况均已核对",
  },
};

export async function evaluatePolicyRuleSetForResident(
  policy: Policy,
  resident: Resident,
  ruleSet: PolicyRuleSet | null,
  facts: ResidentFact[],
  fieldAligner?: FieldAligner,
): Promise<MatchResult> {
  if (!ruleSet || ruleSet.scenarios.length === 0) {
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "pending",
      reasons: ["该政策暂未形成可安全执行的匹配规则，需要人工核实"],
      missingFields: [],
    };
  }

  const scenarioEvaluations = await Promise.all(
    ruleSet.scenarios.map(async (scenario) => ({
      scenario,
      evaluation: await evaluatePolicyRuleForFacts(scenario.root, facts, {
        fieldAligner,
      }),
    })),
  );
  const matched = scenarioEvaluations.filter(
    ({ evaluation }) => evaluation.decision === "candidate",
  );
  if (matched.length > 0) {
    const reasons =
      ruleSet.scenarios.length === 1
        ? matched.flatMap(({ evaluation }) => evaluation.reasons)
        : matched.map(
            ({ scenario, evaluation }) =>
              POLICY_SCENARIO_MATCH_SUMMARIES[policy.id]?.[scenario.label] ??
              `符合“${scenario.label}”：${evaluation.reasons.join("；")}`,
          );
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "matched",
      reasons: unique(reasons),
      missingFields: unique(ruleSet.followUpFields),
    };
  }

  const pending = scenarioEvaluations.filter(
    ({ evaluation }) => evaluation.decision === "needs-verification",
  );
  if (pending.length > 0) {
    const missingFields = unique(
      pending.flatMap(({ evaluation }) => evaluation.missingFields),
    );
    const reasons =
      ruleSet.scenarios.length === 1
        ? missingFields.length > 1
          ? [`该政策仍需补充${missingFields.length}项居民信息后核实`]
          : pending.flatMap(({ evaluation }) => evaluation.reasons)
        : pending.map(
            ({ scenario }) => `“${scenario.label}”仍需补充居民信息后核实`,
          );
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "pending",
      reasons: unique(reasons),
      missingFields,
    };
  }

  const reasons =
    ruleSet.scenarios.length === 1
      ? scenarioEvaluations.flatMap(({ evaluation }) => evaluation.reasons)
      : scenarioEvaluations.map(
          ({ scenario, evaluation }) =>
            `“${scenario.label}”：${evaluation.reasons.join("；")}`,
        );
  return {
    policyId: policy.id,
    residentId: resident.id,
    status: "unmatched",
    reasons: unique(reasons),
    missingFields: [],
  };
}
