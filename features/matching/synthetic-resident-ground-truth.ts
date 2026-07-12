import type { MatchStatus } from "@/shared/types";

export const SYNTHETIC_EVALUATION_POLICY_IDS = [
  "policy-001",
  "policy-002",
  "policy-003",
  "policy-004",
  "policy-014",
] as const;

export type SyntheticEvaluationPolicyId =
  (typeof SYNTHETIC_EVALUATION_POLICY_IDS)[number];

interface ExpectedPolicyOutcome {
  status: MatchStatus;
  humanBasis: string;
}

export interface SyntheticResidentGroundTruth {
  residentId: string;
  constructedWithoutLlm: true;
  expected: Record<SyntheticEvaluationPolicyId, ExpectedPolicyOutcome>;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value)) deepFreeze(nestedValue);
    Object.freeze(value);
  }
  return value;
}

/**
 * 冻结的人工正确答案。这里的结论由测试场景设计直接推出，不读取模型输出。
 * 真实 LLM 只在后续验证阶段尝试把测试字段元数据对齐到政策条件。
 */
export const syntheticResidentGroundTruth = deepFreeze([
  {
    residentId: "resident-009",
    constructedWithoutLlm: true,
    expected: {
      "policy-001": {
        status: "matched",
        humanBasis: "83岁且为北京市户籍",
      },
      "policy-002": {
        status: "unmatched",
        humanBasis: "非低保、非低收入且无特殊家庭身份",
      },
      "policy-003": {
        status: "matched",
        humanBasis: "北京市户籍且评估为重度失能",
      },
      "policy-004": {
        status: "matched",
        humanBasis: "非学生、非机关事业人员、未被职工养老覆盖且缴费满15年",
      },
      "policy-014": {
        status: "matched",
        humanBasis: "三人家庭收入、无房和57万元资产上限均在边界内",
      },
    },
  },
  {
    residentId: "resident-010",
    constructedWithoutLlm: true,
    expected: {
      "policy-001": {
        status: "unmatched",
        humanBasis: "78岁，未达到80周岁",
      },
      "policy-002": {
        status: "matched",
        humanBasis: "北京市户籍且属于计划生育特殊家庭",
      },
      "policy-003": {
        status: "matched",
        humanBasis: "能力评估未达到重度失能，但明确持有符合条件的有效残疾人证",
      },
      "policy-004": {
        status: "matched",
        humanBasis: "参保身份条件满足，且缴费16年、未领取其他养老待遇",
      },
      "policy-014": {
        status: "unmatched",
        humanBasis: "三人家庭净资产570001元，超过上限1元",
      },
    },
  },
  {
    residentId: "resident-011",
    constructedWithoutLlm: true,
    expected: {
      "policy-001": {
        status: "unmatched",
        humanBasis: "19岁，未达到80周岁",
      },
      "policy-002": {
        status: "unmatched",
        humanBasis: "无困难身份和特殊家庭身份",
      },
      "policy-003": {
        status: "unmatched",
        humanBasis: "能力评估明确未达到重度失能，且未持符合条件的残疾人证",
      },
      "policy-004": {
        status: "unmatched",
        humanBasis: "当前为在校学生且未达到领取待遇年龄",
      },
      "policy-014": {
        status: "unmatched",
        humanBasis: "家庭收入超过标准且在北京有住房",
      },
    },
  },
  {
    residentId: "resident-012",
    constructedWithoutLlm: true,
    expected: {
      "policy-001": {
        status: "unmatched",
        humanBasis: "62岁，未达到80周岁",
      },
      "policy-002": {
        status: "unmatched",
        humanBasis: "无困难身份和特殊家庭身份",
      },
      "policy-003": {
        status: "unmatched",
        humanBasis: "能力评估明确未达到重度失能，且未持符合条件的残疾人证",
      },
      "policy-004": {
        status: "unmatched",
        humanBasis: "属于机关事业单位和职工养老覆盖范围，且已领取其他养老待遇",
      },
      "policy-014": {
        status: "matched",
        humanBasis: "四人家庭收入、无房和76万元资产上限均在边界内",
      },
    },
  },
  {
    residentId: "resident-013",
    constructedWithoutLlm: true,
    expected: {
      "policy-001": {
        status: "pending",
        humanBasis: "户籍缺失，不能仅凭年龄认定",
      },
      "policy-002": {
        status: "pending",
        humanBasis: "户籍和困难身份均待核实",
      },
      "policy-003": {
        status: "pending",
        humanBasis: "户籍、失能评估和残疾人证均待核实",
      },
      "policy-004": {
        status: "pending",
        humanBasis: "参保身份、缴费年限和待遇领取信息均待核实",
      },
      "policy-014": {
        status: "pending",
        humanBasis: "户籍类型、收入、住房和资产信息均待核实",
      },
    },
  },
] satisfies SyntheticResidentGroundTruth[]);
