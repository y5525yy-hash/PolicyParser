import type { MatchResult, Policy, Resident } from "@/shared/types";
import { DEMO_IDS } from "@/shared/demo-constants";

/**
 * 确定性规则引擎。只做资格判断，不调用大模型，不访问页面或数据库。
 * 未知信息一律不得判定为 matched：缺关键字段 → pending。
 */

function evaluateElderlyAllowance(
  policy: Policy,
  resident: Resident,
): MatchResult {
  const age = resident.age;
  const hukou = resident.hukou?.trim();
  const reasons: string[] = [];
  const missingFields: string[] = [];

  if (age === undefined) {
    missingFields.push("年龄");
  }
  if (!hukou) {
    missingFields.push("户籍");
  }

  if (age === undefined || !hukou) {
    reasons.push(...missingFields.map((field) => `${field}信息缺失`));
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "pending",
      reasons,
      missingFields,
    };
  }

  if (age < 80) {
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "unmatched",
      reasons: ["未达到80周岁"],
      missingFields: [],
    };
  }

  if (hukou !== "北京市") {
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "unmatched",
      reasons: ["户籍不符合"],
      missingFields: [],
    };
  }

  return {
    policyId: policy.id,
    residentId: resident.id,
    status: "matched",
    reasons: ["年龄已满80周岁", "具有北京市户籍"],
    missingFields: ["是否已经领取高龄津贴"],
  };
}

/**
 * 政策 → 规则函数的映射。新增政策规则时只在这里注册，
 * 不在 matching-service.ts 或页面中重复判断资格。
 */
const POLICY_RULES: Record<
  string,
  (policy: Policy, resident: Resident) => MatchResult
> = {
  [DEMO_IDS.policies.elderlyAllowance]: evaluateElderlyAllowance,
};

/**
 * 未配置规则的政策统一返回 pending，并在 reasons 中说明原因。
 * 这样 P1 阶段增加新政策前，接口行为始终稳定、可预期。
 */
export function evaluatePolicyForResident(
  policy: Policy,
  resident: Resident,
): MatchResult {
  const rule = POLICY_RULES[policy.id];
  if (!rule) {
    return {
      policyId: policy.id,
      residentId: resident.id,
      status: "pending",
      reasons: ["该政策暂未配置匹配规则，仅供代办员初步核查，最终资格以经办部门审核为准"],
      missingFields: [],
    };
  }
  return rule(policy, resident);
}
