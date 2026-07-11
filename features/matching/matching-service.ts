import type { MatchResidentsByPolicy, MatchPoliciesByResident } from "@/shared/contracts";
import { demoPolicies, demoResidents } from "./match-fixtures";
import { evaluatePolicyForResident } from "./matching-rules";

/**
 * 只负责按 ID 找数据、调用 matching-rules.ts 的规则，不在这里重复资格判断。
 * 当前数据来源是 match-fixtures.ts；后续接入真实政策/居民数据时，
 * 只替换这里的数据查找方式，不改变函数签名和调用方式。
 */

export const matchResidentsByPolicy: MatchResidentsByPolicy = async (
  policyId,
) => {
  const policy = demoPolicies.find((item) => item.id === policyId);
  if (!policy) {
    throw new Error(`未找到政策：${policyId}`);
  }
  return demoResidents.map((resident) =>
    evaluatePolicyForResident(policy, resident),
  );
};

export const matchPoliciesByResident: MatchPoliciesByResident = async (
  residentId,
) => {
  const resident = demoResidents.find((item) => item.id === residentId);
  if (!resident) {
    throw new Error(`未找到居民：${residentId}`);
  }
  return demoPolicies.map((policy) =>
    evaluatePolicyForResident(policy, resident),
  );
};
