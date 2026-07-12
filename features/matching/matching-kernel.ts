import { alignCriterionToFacts } from "./field-aligner";
import type {
  CriterionEvaluation,
  FactValue,
  FieldAligner,
  KernelMatchEvaluation,
  PolicyCriterion,
  PolicyRuleNode,
  ResidentFact,
} from "./integration-contracts";

export interface MatchingKernelOptions {
  asOfDate?: Date;
  fieldAligner?: FieldAligner;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function findAlignedFact(
  alignmentFactKey: string | null,
  facts: ResidentFact[],
) {
  if (!alignmentFactKey) {
    return null;
  }
  return facts.find((fact) => fact.key === alignmentFactKey) ?? null;
}

function calculateAge(birthDateValue: string, asOfDate: Date) {
  const birthDate = new Date(`${birthDateValue}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    asOfDate.getMonth() > birthDate.getMonth() ||
    (asOfDate.getMonth() === birthDate.getMonth() &&
      asOfDate.getDate() >= birthDate.getDate());
  if (!birthdayHasPassed) {
    age -= 1;
  }
  return age;
}

function resolveActualValue(
  criterion: PolicyCriterion,
  fact: ResidentFact,
  asOfDate: Date,
): FactValue {
  if (
    criterion.concept === "age" &&
    fact.valueType === "date" &&
    typeof fact.value === "string"
  ) {
    return calculateAge(fact.value, asOfDate);
  }
  return fact.value;
}

function normalizeBoolean(value: FactValue) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLocaleLowerCase();
  if (["true", "yes", "是", "已领取"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "否", "未领取"].includes(normalized)) {
    return false;
  }
  return null;
}

function normalizeComparableValue(
  value: FactValue,
  valueType: PolicyCriterion["valueType"],
): string | number | boolean | null {
  if (value === null) {
    return null;
  }
  if (valueType === "number") {
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }
  if (valueType === "boolean") {
    return normalizeBoolean(value);
  }
  if (valueType === "date") {
    if (typeof value !== "string") {
      return null;
    }
    const timestamp = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  return String(value).trim();
}

function compareValues(
  criterion: PolicyCriterion,
  actualValue: FactValue,
  expectedValue: PolicyCriterion["expectedValue"] = criterion.expectedValue,
): boolean | null {
  if (criterion.operator === "exists") {
    if (actualValue === null) return null;
    const actualExists =
      typeof actualValue === "boolean"
        ? actualValue
        : typeof actualValue === "string"
          ? actualValue.trim().length > 0
          : true;
    return actualExists === Boolean(expectedValue);
  }

  if (criterion.operator === "in") {
    if (!Array.isArray(expectedValue) || actualValue === null) {
      return null;
    }
    return expectedValue.includes(String(actualValue).trim());
  }

  if (Array.isArray(expectedValue)) {
    return null;
  }

  const actual = normalizeComparableValue(actualValue, criterion.valueType);
  const expected = normalizeComparableValue(
    expectedValue,
    criterion.valueType,
  );
  if (actual === null || expected === null) {
    return null;
  }

  switch (criterion.operator) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "greaterThan":
      return typeof actual === "number" && typeof expected === "number"
        ? actual > expected
        : null;
    case "greaterThanOrEqual":
      return typeof actual === "number" && typeof expected === "number"
        ? actual >= expected
        : null;
    case "lessThan":
      return typeof actual === "number" && typeof expected === "number"
        ? actual < expected
        : null;
    case "lessThanOrEqual":
      return typeof actual === "number" && typeof expected === "number"
        ? actual <= expected
        : null;
    case "contains":
      return typeof actual === "string" && typeof expected === "string"
        ? actual.includes(expected)
        : null;
  }
}

function numericFactValue(facts: ResidentFact[], key: string) {
  const value = facts.find((fact) => fact.key === key)?.value;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }
  return null;
}

function resolveExpectedValue(
  criterion: PolicyCriterion,
  facts: ResidentFact[],
): PolicyCriterion["expectedValue"] | null {
  if (
    criterion.concept === "householdNetAssets" &&
    typeof criterion.expectedValue === "string" &&
    criterion.expectedValue.includes("3人及以下57万元")
  ) {
    const familyPopulation = numericFactValue(facts, "family_population");
    if (familyPopulation === null) return null;
    return familyPopulation <= 3 ? 570000 : 760000;
  }
  if (
    criterion.concept === "householdAnnualIncome" &&
    typeof criterion.expectedValue === "string" &&
    criterion.expectedValue.includes("3口及以下10万元")
  ) {
    const familyPopulation = numericFactValue(facts, "family_population");
    if (familyPopulation === null) return null;
    return familyPopulation <= 3 ? 100000 : 130000;
  }
  return criterion.expectedValue;
}

async function evaluateCriterion(
  criterion: PolicyCriterion,
  facts: ResidentFact[],
  asOfDate: Date,
  fieldAligner: FieldAligner,
): Promise<CriterionEvaluation> {
  const alignment = await fieldAligner.alignField(criterion, facts);
  const fact = findAlignedFact(alignment.factKey, facts);
  if (!fact) {
    return {
      criterionId: criterion.id,
      state: "unknown",
      alignment,
      actualValue: null,
      reason: `${criterion.missingFieldLabel}信息缺失`,
      evidence: criterion.evidence,
    };
  }

  const actualValue = resolveActualValue(criterion, fact, asOfDate);
  if (actualValue === null) {
    return {
      criterionId: criterion.id,
      state: "unknown",
      alignment,
      actualValue,
      reason: `${criterion.missingFieldLabel}信息缺失`,
      evidence: criterion.evidence,
    };
  }
  const expectedValue = resolveExpectedValue(criterion, facts);
  if (expectedValue === null) {
    return {
      criterionId: criterion.id,
      state: "unknown",
      alignment,
      actualValue,
      reason: `${criterion.missingFieldLabel}适用标准需要核实`,
      evidence: criterion.evidence,
    };
  }
  const comparison = compareValues(criterion, actualValue, expectedValue);
  if (comparison === null) {
    return {
      criterionId: criterion.id,
      state: "unknown",
      alignment,
      actualValue,
      reason: `${criterion.missingFieldLabel}信息格式无法核实`,
      evidence: criterion.evidence,
    };
  }

  return {
    criterionId: criterion.id,
    state: comparison ? "satisfied" : "failed",
    alignment,
    actualValue,
    reason: comparison
      ? (criterion.satisfiedReason ?? `${criterion.label}符合条件`)
      : (criterion.failedReason ?? `${criterion.label}不符合条件`),
    evidence: criterion.evidence,
  };
}

export async function evaluateCriteriaForFacts(
  criteria: PolicyCriterion[],
  facts: ResidentFact[],
  options: MatchingKernelOptions = {},
): Promise<KernelMatchEvaluation> {
  if (criteria.length === 0) {
    return {
      decision: "needs-verification",
      reasons: ["未提取到可执行的政策条件，需要人工核实"],
      missingFields: [],
      criteria: [],
    };
  }

  const asOfDate = options.asOfDate ?? new Date();
  const fieldAligner = options.fieldAligner ?? {
    async alignField(criterion: PolicyCriterion, residentFacts: ResidentFact[]) {
      return alignCriterionToFacts(criterion, residentFacts);
    },
  };
  const evaluations = await Promise.all(
    criteria.map((criterion) =>
      evaluateCriterion(criterion, facts, asOfDate, fieldAligner),
    ),
  );
  const criterionById = new Map(
    criteria.map((criterion) => [criterion.id, criterion]),
  );
  const requiredUnknown = evaluations.filter(
    (evaluation) =>
      evaluation.state === "unknown" &&
      criterionById.get(evaluation.criterionId)?.required,
  );
  const requiredFailed = evaluations.filter(
    (evaluation) =>
      evaluation.state === "failed" &&
      criterionById.get(evaluation.criterionId)?.required,
  );
  const missingFieldFor = (evaluation: CriterionEvaluation) =>
    criterionById.get(evaluation.criterionId)?.missingFieldLabel ?? "未知字段";

  if (requiredUnknown.length > 0) {
    return {
      decision: "needs-verification",
      reasons: unique(requiredUnknown.map((evaluation) => evaluation.reason)),
      missingFields: unique(requiredUnknown.map(missingFieldFor)),
      criteria: evaluations,
    };
  }

  if (requiredFailed.length > 0) {
    return {
      decision: "not-candidate",
      reasons: unique(requiredFailed.map((evaluation) => evaluation.reason)),
      missingFields: [],
      criteria: evaluations,
    };
  }

  const satisfiedRequired = evaluations.filter(
    (evaluation) =>
      evaluation.state === "satisfied" &&
      criterionById.get(evaluation.criterionId)?.required,
  );
  return {
    decision: "candidate",
    reasons: unique(satisfiedRequired.map((evaluation) => evaluation.reason)),
    missingFields: unique(
      evaluations
        .filter((evaluation) => evaluation.state === "unknown")
        .map(missingFieldFor),
    ),
    criteria: evaluations,
  };
}

function mergeCriteria(evaluations: KernelMatchEvaluation[]) {
  return evaluations.flatMap((evaluation) => evaluation.criteria);
}

async function evaluateRuleNode(
  node: PolicyRuleNode,
  facts: ResidentFact[],
  options: MatchingKernelOptions,
): Promise<KernelMatchEvaluation> {
  if (node.type === "criterion") {
    const asOfDate = options.asOfDate ?? new Date();
    const fieldAligner = options.fieldAligner ?? {
      async alignField(
        criterion: PolicyCriterion,
        residentFacts: ResidentFact[],
      ) {
        return alignCriterionToFacts(criterion, residentFacts);
      },
    };
    const evaluation = await evaluateCriterion(
      node.criterion,
      facts,
      asOfDate,
      fieldAligner,
    );
    if (evaluation.state === "satisfied") {
      return {
        decision: "candidate",
        reasons: [evaluation.reason],
        missingFields: [],
        criteria: [evaluation],
      };
    }
    if (evaluation.state === "failed") {
      return {
        decision: "not-candidate",
        reasons: [evaluation.reason],
        missingFields: [],
        criteria: [evaluation],
      };
    }
    return {
      decision: "needs-verification",
      reasons: [evaluation.reason],
      missingFields: [node.criterion.missingFieldLabel],
      criteria: [evaluation],
    };
  }

  if (node.type === "not") {
    const evaluation = await evaluateRuleNode(node.node, facts, options);
    if (evaluation.decision === "needs-verification") {
      return {
        ...evaluation,
        reasons: ["政策排除情形仍需核实"],
      };
    }
    return {
      decision:
        evaluation.decision === "candidate" ? "not-candidate" : "candidate",
      reasons: [
        evaluation.decision === "candidate"
          ? "存在政策规定的排除情形"
          : "未发现政策规定的排除情形",
      ],
      missingFields: [],
      criteria: evaluation.criteria,
    };
  }

  const childEvaluations = await Promise.all(
    node.nodes.map((child) => evaluateRuleNode(child, facts, options)),
  );
  if (childEvaluations.length === 0) {
    return {
      decision: "needs-verification",
      reasons: ["政策条件结构为空，需要人工核实"],
      missingFields: [],
      criteria: [],
    };
  }

  if (node.type === "allOf") {
    const failed = childEvaluations.filter(
      (evaluation) => evaluation.decision === "not-candidate",
    );
    if (failed.length > 0) {
      return {
        decision: "not-candidate",
        reasons: unique(failed.flatMap((evaluation) => evaluation.reasons)),
        missingFields: [],
        criteria: mergeCriteria(childEvaluations),
      };
    }
    const unknown = childEvaluations.filter(
      (evaluation) => evaluation.decision === "needs-verification",
    );
    if (unknown.length > 0) {
      return {
        decision: "needs-verification",
        reasons: unique(unknown.flatMap((evaluation) => evaluation.reasons)),
        missingFields: unique(
          unknown.flatMap((evaluation) => evaluation.missingFields),
        ),
        criteria: mergeCriteria(childEvaluations),
      };
    }
    return {
      decision: "candidate",
      reasons: unique(
        childEvaluations.flatMap((evaluation) => evaluation.reasons),
      ),
      missingFields: [],
      criteria: mergeCriteria(childEvaluations),
    };
  }

  const matched = childEvaluations.filter(
    (evaluation) => evaluation.decision === "candidate",
  );
  if (matched.length > 0) {
    return {
      decision: "candidate",
      reasons: unique(matched.flatMap((evaluation) => evaluation.reasons)),
      missingFields: [],
      criteria: mergeCriteria(childEvaluations),
    };
  }
  const unknown = childEvaluations.filter(
    (evaluation) => evaluation.decision === "needs-verification",
  );
  if (unknown.length > 0) {
    return {
      decision: "needs-verification",
      reasons: ["至少一个资格分支仍需补充信息后核实"],
      missingFields: unique(
        unknown.flatMap((evaluation) => evaluation.missingFields),
      ),
      criteria: mergeCriteria(childEvaluations),
    };
  }
  return {
    decision: "not-candidate",
    reasons: unique(
      childEvaluations.flatMap((evaluation) => evaluation.reasons),
    ),
    missingFields: [],
    criteria: mergeCriteria(childEvaluations),
  };
}

export async function evaluatePolicyRuleForFacts(
  rule: PolicyRuleNode,
  facts: ResidentFact[],
  options: MatchingKernelOptions = {},
) {
  return await evaluateRuleNode(rule, facts, options);
}
