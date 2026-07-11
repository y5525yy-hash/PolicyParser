import type { MatchResidentsByPolicy, MatchPoliciesByResident } from "@/shared/contracts";
import { demoPolicies, demoResidents } from "./match-fixtures";
import { mockPolicyEvidenceProvider, mockResidentFactProvider } from "./mock-providers";
import { patternPolicyCriterionExtractor } from "./policy-criterion-extractor";
import { evaluatePolicyForResident } from "./matching-rules";

/**
 * 编排 A/B provider、条件抽取器和纯规则内核，不在 service 中判断资格。
 * 接入真实模块时只替换 provider，公共函数签名和页面保持不变。
 */

export const matchResidentsByPolicy: MatchResidentsByPolicy = async (
  policyId,
) => {
  const policy = demoPolicies.find((item) => item.id === policyId);
  if (!policy) {
    throw new Error(`未找到政策：${policyId}`);
  }
  const evidence = await mockPolicyEvidenceProvider.retrievePolicyEvidence({
    policyId,
  });
  const criteria = await patternPolicyCriterionExtractor.extractCriteria(
    policyId,
    evidence,
  );
  return Promise.all(
    demoResidents.map(async (resident) => {
      const facts = await mockResidentFactProvider.getResidentFacts(resident.id);
      return await evaluatePolicyForResident(policy, resident, criteria, facts);
    }),
  );
};

export const matchPoliciesByResident: MatchPoliciesByResident = async (
  residentId,
) => {
  const resident = demoResidents.find((item) => item.id === residentId);
  if (!resident) {
    throw new Error(`未找到居民：${residentId}`);
  }
  const facts = await mockResidentFactProvider.getResidentFacts(residentId);
  return Promise.all(
    demoPolicies.map(async (policy) => {
      const evidence = await mockPolicyEvidenceProvider.retrievePolicyEvidence({
        policyId: policy.id,
      });
      const criteria = await patternPolicyCriterionExtractor.extractCriteria(
        policy.id,
        evidence,
      );
      return await evaluatePolicyForResident(policy, resident, criteria, facts);
    }),
  );
};
