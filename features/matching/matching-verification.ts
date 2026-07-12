import { alignCriterionToFacts } from "./field-aligner";
import type {
  FactValueType,
  PolicyCriterion,
  PolicyRuleNode,
  ResidentFact,
} from "./integration-contracts";
import {
  evaluateCriteriaForFacts,
  evaluatePolicyRuleForFacts,
} from "./matching-kernel";
import { extractCriteriaFromEvidence } from "./policy-criterion-extractor";

interface VerificationCase {
  name: string;
  passed: boolean;
}

const evidence = {
  chunkId: "verification-chunk",
  quote: "验证用模拟政策条款",
  sourceUrl: "https://example.invalid/verification",
};

function createCriterion(
  overrides: Partial<PolicyCriterion> & Pick<PolicyCriterion, "id" | "concept">,
): PolicyCriterion {
  return {
    policyId: "verification-policy",
    label: overrides.concept,
    operator: "equals",
    expectedValue: true,
    valueType: "boolean",
    required: true,
    fieldAliases: [overrides.concept],
    missingFieldLabel: overrides.concept,
    evidence,
    ...overrides,
  };
}

function createFact(
  key: string,
  label: string,
  value: ResidentFact["value"],
  valueType: FactValueType,
  aliases: string[] = [],
): ResidentFact {
  return {
    residentId: "verification-resident",
    key,
    label,
    value,
    valueType,
    aliases,
  };
}

export async function runMatchingKernelVerification(): Promise<VerificationCase[]> {
  const elderlyAllowanceCriteria = extractCriteriaFromEvidence("policy-001", [
    {
      policyId: "policy-001",
      chunkId: "policy-001-verification",
      text: "申请人应为80周岁及以上、具有北京市户籍。办理前需核实是否已经领取高龄津贴。",
      sourceUrl: "https://example.invalid/policy-001",
    },
  ]);
  const zhangResult = await evaluateCriteriaForFacts(elderlyAllowanceCriteria, [
    createFact("resident_age", "居民年龄", 82, "number", ["年龄"]),
    createFact("register_area", "户籍登记地区", "北京市", "string"),
  ]);
  const liResult = await evaluateCriteriaForFacts(elderlyAllowanceCriteria, [
    createFact("resident_age", "居民年龄", 66, "number", ["年龄"]),
    createFact("register_area", "户籍登记地区", "北京市", "string"),
  ]);
  const wangResult = await evaluateCriteriaForFacts(elderlyAllowanceCriteria, [
    createFact("resident_age", "居民年龄", 85, "number", ["年龄"]),
  ]);

  const aliasCriterion = createCriterion({
    id: "alias-hukou",
    concept: "hukou",
    label: "户籍",
    operator: "equals",
    expectedValue: "北京市",
    valueType: "string",
    fieldAliases: ["hukou", "户籍所在地", "register_area"],
    missingFieldLabel: "户籍",
  });
  const aliasFact = createFact(
    "register_area",
    "户籍登记地区",
    "北京市",
    "string",
  );
  const aliasAlignment = alignCriterionToFacts(aliasCriterion, [aliasFact]);

  const notEqualsCriterion = createCriterion({
    id: "not-equals",
    concept: "receives_other_benefit",
    operator: "notEquals",
    expectedValue: true,
    valueType: "boolean",
  });
  const notEqualsResult = await evaluateCriteriaForFacts(
    [notEqualsCriterion],
    [
      createFact(
        "receives_other_benefit",
        "是否领取其他待遇",
        false,
        "boolean",
      ),
    ],
  );
  const existsCriterion = createCriterion({
    id: "exists-boolean",
    concept: "credential_present",
    operator: "exists",
    expectedValue: true,
    valueType: "boolean",
  });
  const [existsTrueResult, existsFalseResult] = await Promise.all([
    evaluateCriteriaForFacts(
      [existsCriterion],
      [createFact("credential_present", "是否持证", true, "boolean")],
    ),
    evaluateCriteriaForFacts(
      [existsCriterion],
      [createFact("credential_present", "是否持证", false, "boolean")],
    ),
  ]);

  const ageCriterion = createCriterion({
    id: "derived-age",
    concept: "age",
    label: "年龄",
    operator: "greaterThanOrEqual",
    expectedValue: 80,
    valueType: "number",
    fieldAliases: ["age", "birth_date", "出生日期"],
    missingFieldLabel: "年龄",
  });
  const ageResult = await evaluateCriteriaForFacts(
    [ageCriterion],
    [createFact("birth_date", "出生日期", "1946-07-11", "date")],
    { asOfDate: new Date("2026-07-11T12:00:00") },
  );

  const maximumCriterion = createCriterion({
    id: "maximum-income",
    concept: "monthly_income",
    operator: "lessThanOrEqual",
    expectedValue: 3000,
    valueType: "number",
  });
  const maximumResult = await evaluateCriteriaForFacts(
    [maximumCriterion],
    [createFact("monthly_income", "月收入", "2800", "number")],
  );

  const dateCriterion = createCriterion({
    id: "date-limit",
    concept: "application_date",
    operator: "lessThanOrEqual",
    expectedValue: "2026-12-31",
    valueType: "date",
  });
  const dateResult = await evaluateCriteriaForFacts(
    [dateCriterion],
    [createFact("application_date", "申请日期", "2026-07-11", "date")],
  );

  const missingResult = await evaluateCriteriaForFacts([aliasCriterion], []);
  const unknownValueResult = await evaluateCriteriaForFacts(
    [aliasCriterion],
    [createFact("register_area", "户籍登记地区", null, "string")],
  );
  const lowConfidenceAlignment = alignCriterionToFacts(aliasCriterion, [
    createFact("current_address", "当前居住地址", "西红门镇", "string"),
  ]);

  const trueCriterion = createCriterion({
    id: "logic-true",
    concept: "logic_true",
  });
  const falseCriterion = createCriterion({
    id: "logic-false",
    concept: "logic_false",
  });
  const missingCriterion = createCriterion({
    id: "logic-missing",
    concept: "logic_missing",
  });
  const logicFacts = [
    createFact("logic_true", "逻辑真值", true, "boolean"),
    createFact("logic_false", "逻辑假值", false, "boolean"),
  ];
  const anyOfRule: PolicyRuleNode = {
    type: "anyOf",
    nodes: [
      { type: "criterion", criterion: trueCriterion },
      { type: "criterion", criterion: missingCriterion },
    ],
  };
  const allOfRule: PolicyRuleNode = {
    type: "allOf",
    nodes: [
      { type: "criterion", criterion: falseCriterion },
      { type: "criterion", criterion: missingCriterion },
    ],
  };
  const notRule: PolicyRuleNode = {
    type: "not",
    node: { type: "criterion", criterion: falseCriterion },
  };
  const [anyOfResult, allOfResult, notResult] = await Promise.all([
    evaluatePolicyRuleForFacts(anyOfRule, logicFacts),
    evaluatePolicyRuleForFacts(allOfRule, logicFacts),
    evaluatePolicyRuleForFacts(notRule, logicFacts),
  ]);

  return [
    {
      name: "张奶奶保持高度匹配基线",
      passed:
        zhangResult.decision === "candidate" &&
        zhangResult.reasons.join("|") ===
          "年龄已满80周岁|具有北京市户籍" &&
        zhangResult.missingFields.join("|") === "是否已经领取高龄津贴",
    },
    {
      name: "李叔保持暂不匹配基线",
      passed:
        liResult.decision === "not-candidate" &&
        liResult.reasons.join("|") === "未达到80周岁" &&
        liResult.missingFields.length === 0,
    },
    {
      name: "王奶奶保持待核实基线",
      passed:
        wangResult.decision === "needs-verification" &&
        wangResult.reasons.join("|") === "户籍信息缺失" &&
        wangResult.missingFields.join("|") === "户籍",
    },
    {
      name: "字段别名可以映射到不同数据库字段名",
      passed:
        aliasAlignment.factKey === "register_area" &&
        aliasAlignment.confidence >= 0.75,
    },
    {
      name: "notEquals 支持 boolean 条件",
      passed: notEqualsResult.decision === "candidate",
    },
    {
      name: "exists 对 boolean true 判定为存在",
      passed: existsTrueResult.decision === "candidate",
    },
    {
      name: "exists 对 boolean false 判定为不满足",
      passed: existsFalseResult.decision === "not-candidate",
    },
    {
      name: "出生日期可以派生边界年龄",
      passed:
        ageResult.decision === "candidate" &&
        ageResult.criteria[0]?.actualValue === 80,
    },
    {
      name: "lessThanOrEqual 支持数字字符串",
      passed: maximumResult.decision === "candidate",
    },
    {
      name: "date 类型支持确定性比较",
      passed: dateResult.decision === "candidate",
    },
    {
      name: "缺失字段返回 needs-verification",
      passed:
        missingResult.decision === "needs-verification" &&
        missingResult.missingFields.includes("户籍"),
    },
    {
      name: "未知字段值返回 needs-verification",
      passed:
        unknownValueResult.decision === "needs-verification" &&
        unknownValueResult.missingFields.includes("户籍"),
    },
    {
      name: "低置信度字段不会被强制映射",
      passed: lowConfidenceAlignment.factKey === null,
    },
    {
      name: "anyOf 有一个分支满足即可成为候选",
      passed: anyOfResult.decision === "candidate",
    },
    {
      name: "allOf 有明确失败条件时不会被未知字段覆盖",
      passed: allOfResult.decision === "not-candidate",
    },
    {
      name: "not 可以确定性反转排除条件",
      passed: notResult.decision === "candidate",
    },
  ];
}
