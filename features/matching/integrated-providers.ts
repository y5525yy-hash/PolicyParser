import type { Resident } from "@/shared/types";
import {
  getActivePolicyChunksByIds,
  getPolicyEligibilityClauses,
} from "@/features/policy/knowledge-base/retrieval";
import type {
  AtomicPolicyCondition,
  PolicyConditionNode,
} from "@/features/policy/knowledge-base/schema";
import { mockResidents } from "@/features/resident/mock-residents";
import { residentDirectoryRecords } from "@/features/resident/resident-directory-data";

import { alignCriterionToFacts } from "./field-aligner";
import type {
  CriterionOperator,
  FactValueType,
  PolicyCriterion,
  PolicyCriterionExtractor,
  PolicyEvidenceChunk,
  PolicyEvidenceProvider,
  PolicyRuleNode,
  PolicyRuleSet,
  ResidentFactDisplayItem,
  ResidentFact,
  ResidentFactProvider,
} from "./integration-contracts";
import { getPolicyFieldMetadata } from "./policy-field-metadata";

function isUnknownText(value: string) {
  return /待核实|待补充|未知|不完整|待确认/.test(value);
}

function normalizedResidentValue(
  value: ResidentFact["value"] | undefined,
): ResidentFact["value"] {
  if (typeof value === "string" && isUnknownText(value)) return null;
  return value ?? null;
}

function normalizedLowIncomeStatus(value: string | undefined) {
  if (value === "低收入家庭") return "低收入但未享受低保";
  return normalizedResidentValue(value);
}

function pushFact(
  facts: ResidentFact[],
  residentId: string,
  key: string,
  label: string,
  value: ResidentFact["value"],
  valueType: FactValueType,
  aliases: string[] = [],
) {
  facts.push({ residentId, key, label, value, valueType, aliases });
}

export function integratedResidentToFacts(resident: Resident): ResidentFact[] {
  const facts: ResidentFact[] = [];
  pushFact(
    facts,
    resident.id,
    "resident_age",
    "居民年龄",
    normalizedResidentValue(resident.age),
    "number",
    ["age", "年龄"],
  );
  pushFact(
    facts,
    resident.id,
    "register_area",
    "户籍登记地区",
    normalizedResidentValue(resident.hukou),
    "string",
    ["hukou", "户籍", "户籍所在地"],
  );
  pushFact(
    facts,
    resident.id,
    "living_status",
    "居住状态",
    normalizedResidentValue(resident.livingStatus),
    "string",
    ["livingStatus", "居住状态"],
  );
  pushFact(
    facts,
    resident.id,
    "low_income_status",
    "低收入状态",
    normalizedLowIncomeStatus(resident.lowIncomeStatus),
    "string",
    ["lowIncomeStatus", "低保状态", "困难身份"],
  );
  pushFact(
    facts,
    resident.id,
    "disability_status",
    "失能评估状态",
    normalizedResidentValue(resident.disabilityStatus),
    "string",
    ["disabilityStatus", "残疾状态"],
  );
  pushFact(
    facts,
    resident.id,
    "insurance_status",
    "参保状态",
    normalizedResidentValue(resident.insuranceStatus),
    "string",
    ["insuranceStatus", "保险状态"],
  );

  const directoryRecord = residentDirectoryRecords.find(
    (record) => record.resident.id === resident.id,
  );
  if (directoryRecord) {
    const { metadata } = directoryRecord;
    pushFact(facts, resident.id, "gender", "性别", metadata.gender, "string", ["性别"]);
    pushFact(
      facts,
      resident.id,
      "administrative_village",
      "行政村",
      metadata.administrativeVillage,
      "string",
      ["村", "社区"],
    );
    pushFact(
      facts,
      resident.id,
      "grid_name",
      "网格",
      metadata.gridName,
      "string",
      ["网格编号", "网格名称"],
    );
    pushFact(
      facts,
      resident.id,
      "family_population",
      "家庭人口",
      metadata.familyPopulation,
      "number",
      ["家庭成员数量"],
    );
    const { policyFacts } = metadata;
    pushFact(
      facts,
      resident.id,
      "isStudent",
      "是否为在校学生",
      policyFacts.isStudent,
      "boolean",
    );
    pushFact(
      facts,
      resident.id,
      "isGovernmentOrPublicInstitutionStaff",
      "是否为国家机关或事业单位工作人员",
      policyFacts.isGovernmentOrPublicInstitutionStaff,
      "boolean",
    );
    pushFact(
      facts,
      resident.id,
      "coveredByEmployeePensionInsurance",
      "是否属于职工基本养老保险覆盖范围",
      policyFacts.coveredByEmployeePensionInsurance,
      "boolean",
    );
    pushFact(
      facts,
      resident.id,
      "contributionYears",
      "城乡居民养老保险累计缴费年限",
      policyFacts.contributionYears,
      "number",
    );
    pushFact(
      facts,
      resident.id,
      "receivesOtherBasicPensionBenefit",
      "是否领取其他基本养老保障待遇",
      policyFacts.receivesOtherBasicPensionBenefit,
      "boolean",
    );
    pushFact(
      facts,
      resident.id,
      "hukouType",
      "户籍类型",
      policyFacts.hukouType,
      "string",
    );
    pushFact(
      facts,
      resident.id,
      "householdMonthlyIncomePerCapitaPrevious12Months",
      "前12个月家庭月人均收入",
      policyFacts.householdMonthlyIncomePerCapitaPrevious12Months,
      "number",
    );
    pushFact(
      facts,
      resident.id,
      "householdHasHousingInBeijing",
      "家庭成员在北京市是否有住房",
      policyFacts.householdHasHousingInBeijing,
      "boolean",
    );
    pushFact(
      facts,
      resident.id,
      "householdNetAssets",
      "家庭净资产",
      policyFacts.householdNetAssets,
      "number",
    );
    pushFact(
      facts,
      resident.id,
      "familyStatus",
      "家庭特殊身份",
      normalizedResidentValue(policyFacts.familyStatus),
      "string",
      ["家庭类别", "特殊家庭身份"],
    );
    pushFact(
      facts,
      resident.id,
      "disabilityCertificate",
      "是否持有符合条件的残疾人证",
      normalizedResidentValue(policyFacts.disabilityCertificate),
      "boolean",
      ["残疾人证", "残疾证持有情况"],
    );
  }
  return facts;
}

function inferValueType(condition: AtomicPolicyCondition): FactValueType | null {
  if (typeof condition.value === "number") return "number";
  if (typeof condition.value === "boolean") return "boolean";
  if (Array.isArray(condition.value)) return "string";
  if (typeof condition.value === "string") {
    if (/Date$/.test(condition.field) || /^\d{4}-\d{2}-\d{2}$/.test(condition.value)) {
      return "date";
    }
    if (
      [
        "greater_than",
        "greater_than_or_equal",
        "less_than",
        "less_than_or_equal",
      ].includes(condition.operator)
    ) {
      return "number";
    }
    return "string";
  }
  if (condition.operator === "exists") return "boolean";
  return null;
}

function mapOperator(
  operator: AtomicPolicyCondition["operator"],
): CriterionOperator | null {
  switch (operator) {
    case "equals":
      return "equals";
    case "not_equals":
      return "notEquals";
    case "greater_than":
      return "greaterThan";
    case "greater_than_or_equal":
      return "greaterThanOrEqual";
    case "less_than":
      return "lessThan";
    case "less_than_or_equal":
      return "lessThanOrEqual";
    case "contains":
      return "contains";
    case "in":
      return "in";
    case "exists":
      return "exists";
    default:
      return null;
  }
}

function collectSourceChunkIds(
  node: PolicyConditionNode,
  output: Set<string>,
) {
  for (const chunkId of node.sourceChunkIds) output.add(chunkId);
  if (node.type !== "condition") {
    for (const condition of node.conditions) {
      collectSourceChunkIds(condition, output);
    }
  }
}

function reasonsFor(condition: AtomicPolicyCondition, label: string) {
  if (
    condition.field === "age" &&
    condition.operator === "greater_than_or_equal" &&
    typeof condition.value === "number"
  ) {
    return {
      satisfiedReason: `年龄已满${condition.value}周岁`,
      failedReason: `未达到${condition.value}周岁`,
    };
  }
  if (
    condition.field === "hukou" &&
    condition.operator === "equals" &&
    condition.value === "北京市"
  ) {
    return {
      satisfiedReason: "具有北京市户籍",
      failedReason: "户籍不符合",
    };
  }
  if (
    condition.field === "contributionYears" &&
    condition.operator === "greater_than_or_equal" &&
    typeof condition.value === "number"
  ) {
    return {
      satisfiedReason: `累计缴费已达到${condition.value}年`,
      failedReason: `累计缴费不足${condition.value}年`,
    };
  }
  if (typeof condition.value === "boolean") {
    return condition.value
      ? {
          satisfiedReason: `${label}：是，符合该项条件`,
          failedReason: `${label}：否，不符合该项条件`,
        }
      : {
          satisfiedReason: `${label}：否，符合该项条件`,
          failedReason: `${label}：是，不符合该项条件`,
        };
  }
  return {
    satisfiedReason: `${label}符合政策条件`,
    failedReason: `${label}不符合政策条件`,
  };
}

async function loadVerifiedPolicyContext(policyId: string) {
  const extraction = await getPolicyEligibilityClauses(policyId);
  if (!extraction) return null;
  const eligibilityChunkIds = new Set<string>();
  for (const node of extraction.eligibility) {
    collectSourceChunkIds(node, eligibilityChunkIds);
  }
  const chunks = await getActivePolicyChunksByIds([...eligibilityChunkIds]);
  const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
  return { extraction, chunks, chunksById };
}

function compileCondition(
  policyId: string,
  condition: AtomicPolicyCondition,
  path: string,
  chunksById: Map<
    string,
    { chunkId: string; officialUrl: string }
  >,
  fallbackChunk: { chunkId: string; officialUrl: string } | undefined,
): PolicyRuleNode | null {
  const operator = mapOperator(condition.operator);
  const valueType = inferValueType(condition);
  const expectedValue =
    condition.value ?? (condition.operator === "exists" ? true : undefined);
  if (!operator || !valueType || expectedValue === undefined) return null;

  const chunkId =
    condition.sourceChunkIds.find((id) => chunksById.has(id)) ??
    fallbackChunk?.chunkId;
  const chunk = chunkId ? (chunksById.get(chunkId) ?? fallbackChunk) : null;
  if (!chunkId || !chunk) return null;
  const metadata = getPolicyFieldMetadata(condition.field, condition.sourceText);
  return {
    type: "criterion",
    criterion: {
      id: `${policyId}:${path}:${condition.field}`,
      policyId,
      concept: condition.field,
      label: metadata.label,
      operator,
      expectedValue,
      valueType,
      required: true,
      fieldAliases: metadata.aliases,
      missingFieldLabel: metadata.missingFieldLabel,
      ...reasonsFor(condition, metadata.label),
      evidence: {
        chunkId,
        quote: condition.sourceText,
        sourceUrl: chunk.officialUrl,
      },
    },
  };
}

function compilePolicyNode(
  policyId: string,
  node: PolicyConditionNode,
  path: string,
  chunksById: Map<string, { chunkId: string; officialUrl: string }>,
  fallbackChunk: { chunkId: string; officialUrl: string } | undefined,
): PolicyRuleNode | null {
  if (node.type === "condition") {
    return compileCondition(
      policyId,
      node,
      path,
      chunksById,
      fallbackChunk,
    );
  }
  const compiledChildren = node.conditions.map((condition, index) =>
    compilePolicyNode(
      policyId,
      condition,
      `${path}.${index}`,
      chunksById,
      fallbackChunk,
    ),
  );
  if (compiledChildren.some((child) => child === null)) return null;
  const children = compiledChildren.filter(
    (child): child is PolicyRuleNode => child !== null,
  );
  if (node.type === "not") {
    const child: PolicyRuleNode =
      children.length === 1
        ? children[0]
        : { type: "allOf", nodes: children };
    return { type: "not", node: child };
  }
  return { type: node.type, nodes: children };
}

const POLICY_SCENARIO_LABELS: Record<string, string[]> = {
  "policy-004": ["参保条件", "领取待遇条件"],
};

const POLICY_FOLLOW_UP_FIELDS: Record<string, string[]> = {
  "policy-001": ["是否已经领取高龄津贴"],
};

export async function extractVerifiedPolicyRuleSet(
  policyId: string,
): Promise<PolicyRuleSet | null> {
  const context = await loadVerifiedPolicyContext(policyId);
  if (!context) return null;
  const scenarios = context.extraction.eligibility.flatMap((node, index) => {
    const root = compilePolicyNode(
      policyId,
      node,
      `scenario-${index}`,
      context.chunksById,
      context.chunks[0],
    );
    if (!root) return [];
    return [
      {
        id: `${policyId}:scenario-${index}`,
        label:
          POLICY_SCENARIO_LABELS[policyId]?.[index] ??
          (context.extraction.eligibility.length === 1
            ? "资格条件"
            : `资格情形${index + 1}`),
        sourceText: node.sourceText,
        root,
      },
    ];
  });
  if (scenarios.length !== context.extraction.eligibility.length) return null;
  return {
    policyId,
    scenarios,
    followUpFields: POLICY_FOLLOW_UP_FIELDS[policyId] ?? [],
  };
}

function collectRuleCriteria(node: PolicyRuleNode, output: PolicyCriterion[]) {
  if (node.type === "criterion") {
    output.push(node.criterion);
    return;
  }
  if (node.type === "not") {
    collectRuleCriteria(node.node, output);
    return;
  }
  for (const child of node.nodes) collectRuleCriteria(child, output);
}

export const integratedPolicyEvidenceProvider: PolicyEvidenceProvider = {
  async retrievePolicyEvidence({ policyId, limit }) {
    if (!policyId) return [];
    const context = await loadVerifiedPolicyContext(policyId);
    if (!context) return [];
    return context.chunks.slice(0, limit).map((chunk) => ({
      policyId: chunk.policyId,
      chunkId: chunk.chunkId,
      sectionTitle: chunk.section,
      clauseNumber: chunk.clauseNumber,
      text: chunk.text,
      sourceUrl: chunk.officialUrl,
    }));
  },
};

export const verifiedPolicyCriterionExtractor: PolicyCriterionExtractor = {
  async extractCriteria(policyId) {
    const ruleSet = await extractVerifiedPolicyRuleSet(policyId);
    if (!ruleSet) return [];
    const criteria: PolicyCriterion[] = [];
    for (const scenario of ruleSet.scenarios) {
      collectRuleCriteria(scenario.root, criteria);
    }
    return criteria;
  },
};

export const integratedResidentFactProvider: ResidentFactProvider = {
  async getResidentFacts(residentId) {
    const resident = mockResidents.find((item) => item.id === residentId);
    if (!resident) throw new Error(`未找到居民事实：${residentId}`);
    return integratedResidentToFacts(resident);
  },
};

export async function getPolicyEvidenceForDisplay(
  policyId: string,
): Promise<PolicyEvidenceChunk[]> {
  return await integratedPolicyEvidenceProvider.retrievePolicyEvidence({ policyId });
}

function formatFactValue(item: ResidentFact, criterion: PolicyCriterion) {
  if (item.value === null) return "待核实";
  if (typeof item.value === "boolean") return item.value ? "是" : "否";
  if (typeof item.value === "number" && criterion.concept === "age") {
    return `${item.value}岁`;
  }
  if (
    typeof item.value === "number" &&
    criterion.concept === "contributionYears"
  ) {
    return `${item.value}年`;
  }
  if (
    typeof item.value === "number" &&
    criterion.concept === "householdMonthlyIncomePerCapitaPrevious12Months"
  ) {
    return `${item.value.toLocaleString("zh-CN")}元/月`;
  }
  if (
    typeof item.value === "number" &&
    criterion.concept === "householdNetAssets"
  ) {
    return `${item.value.toLocaleString("zh-CN")}元`;
  }
  return String(item.value);
}

export async function getPolicyResidentFactDisplay(
  policyId: string,
): Promise<Record<string, ResidentFactDisplayItem[]>> {
  const ruleSet = await extractVerifiedPolicyRuleSet(policyId);
  if (!ruleSet) return {};
  const criteria: PolicyCriterion[] = [];
  for (const scenario of ruleSet.scenarios) {
    collectRuleCriteria(scenario.root, criteria);
  }

  const entries = await Promise.all(
    mockResidents.map(async (resident) => {
      const facts = await integratedResidentFactProvider.getResidentFacts(
        resident.id,
      );
      const seenLabels = new Set<string>();
      const displayItems = criteria.flatMap<ResidentFactDisplayItem>(
        (criterion) => {
          if (seenLabels.has(criterion.label)) return [];
          seenLabels.add(criterion.label);
          const alignment = alignCriterionToFacts(criterion, facts);
          const fact = alignment.factKey
            ? facts.find((item) => item.key === alignment.factKey)
            : null;
          return [
            {
              label: criterion.label,
              value: fact ? formatFactValue(fact, criterion) : "待核实",
            },
          ];
        },
      );
      return [resident.id, displayItems] as const;
    }),
  );
  return Object.fromEntries(entries);
}
