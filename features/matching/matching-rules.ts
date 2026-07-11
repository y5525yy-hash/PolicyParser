import type {
  MatchResult,
  MatchStatus,
  Policy,
  Resident,
} from "@/shared/types";
import type {
  KernelDecision,
  PolicyCriterion,
  ResidentFact,
} from "./integration-contracts";
import { evaluateCriteriaForFacts } from "./matching-kernel";

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
