import { alignCriterionToFacts } from "./field-aligner";
import type {
  CriterionEvaluation,
  FactValue,
  FieldAligner,
  KernelMatchEvaluation,
  PolicyCriterion,
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
): boolean | null {
  const actual = normalizeComparableValue(actualValue, criterion.valueType);
  const expected = normalizeComparableValue(
    criterion.expectedValue,
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
    case "greaterThanOrEqual":
      return typeof actual === "number" && typeof expected === "number"
        ? actual >= expected
        : null;
    case "lessThanOrEqual":
      return typeof actual === "number" && typeof expected === "number"
        ? actual <= expected
        : null;
  }
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
  const comparison = compareValues(criterion, actualValue);
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
