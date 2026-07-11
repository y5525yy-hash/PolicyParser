import {
  FIELD_ALIGNMENT_SCHEMA_VERSION,
  POLICY_EXTRACTION_SCHEMA_VERSION,
  type LlmConditionNode,
  type LlmExpectedValue,
  type LlmFieldAlignmentOutput,
  type LlmFieldMapping,
  type LlmGroupNode,
  type LlmNotNode,
  type LlmPolicyExtraction,
  type LlmRuleNode,
  type LlmUnresolvedItem,
  type ValidationResult,
} from "./llm-contracts";

const FORBIDDEN_DECISION_KEYS = new Set([
  "decision",
  "eligibility",
  "eligible",
  "matchStatus",
  "status",
  "matched",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  errors: string[],
) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(`${path}.${key} 不是允许的字段`);
    }
    if (FORBIDDEN_DECISION_KEYS.has(key)) {
      errors.push(`${path}.${key} 试图让模型输出资格结论`);
    }
  }
}

function readNonEmptyString(
  value: unknown,
  path: string,
  errors: string[],
): string {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} 必须是非空字符串`);
    return "";
  }
  return value.trim();
}

function readStringArray(
  value: unknown,
  path: string,
  errors: string[],
  requireItem = true,
): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是字符串数组`);
    return [];
  }
  const items = value.map((item, index) =>
    readNonEmptyString(item, `${path}[${index}]`, errors),
  );
  if (requireItem && items.length === 0) {
    errors.push(`${path} 至少需要一项`);
  }
  return items;
}

function parseExpectedValue(
  value: unknown,
  path: string,
  errors: string[],
): LlmExpectedValue | null {
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象`);
    return null;
  }
  if (value.kind === "literal") {
    hasOnlyKeys(value, ["kind", "value"], path, errors);
    if (!["string", "number", "boolean"].includes(typeof value.value)) {
      errors.push(`${path}.value 必须是字符串、数字或布尔值`);
      return null;
    }
    return { kind: "literal", value: value.value as string | number | boolean };
  }
  if (value.kind === "reference") {
    hasOnlyKeys(value, ["kind", "reference"], path, errors);
    return {
      kind: "reference",
      reference: readNonEmptyString(value.reference, `${path}.reference`, errors),
    };
  }
  errors.push(`${path}.kind 必须是 literal 或 reference`);
  return null;
}

function parseCondition(
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): LlmConditionNode {
  hasOnlyKeys(
    value,
    [
      "type",
      "field",
      "label",
      "operator",
      "expected",
      "valueType",
      "required",
      "sourceText",
      "sourceChunkIds",
    ],
    path,
    errors,
  );
  const allowedOperators = [
    "equals",
    "notEquals",
    "greaterThanOrEqual",
    "lessThanOrEqual",
  ] as const;
  const allowedValueTypes = ["string", "number", "boolean", "date"] as const;
  const operator = allowedOperators.find((item) => item === value.operator);
  if (!operator) {
    errors.push(`${path}.operator 不受支持`);
  }
  const valueType = allowedValueTypes.find((item) => item === value.valueType);
  if (!valueType) {
    errors.push(`${path}.valueType 不受支持`);
  }
  if (typeof value.required !== "boolean") {
    errors.push(`${path}.required 必须是布尔值`);
  }
  const expected = parseExpectedValue(value.expected, `${path}.expected`, errors);
  return {
    type: "condition",
    field: readNonEmptyString(value.field, `${path}.field`, errors),
    label: readNonEmptyString(value.label, `${path}.label`, errors),
    operator: operator ?? "equals",
    expected: expected ?? { kind: "literal", value: "" },
    valueType: valueType ?? "string",
    required: typeof value.required === "boolean" ? value.required : true,
    sourceText: readNonEmptyString(
      value.sourceText,
      `${path}.sourceText`,
      errors,
    ),
    sourceChunkIds: readStringArray(
      value.sourceChunkIds,
      `${path}.sourceChunkIds`,
      errors,
    ),
  };
}

function parseRuleNode(
  value: unknown,
  path: string,
  errors: string[],
  depth = 0,
): LlmRuleNode {
  if (depth > 8) {
    errors.push(`${path} 嵌套层级过深`);
    return { type: "allOf", items: [] };
  }
  if (!isRecord(value)) {
    errors.push(`${path} 必须是规则对象`);
    return { type: "allOf", items: [] };
  }
  if (value.type === "condition") {
    return parseCondition(value, path, errors);
  }
  if (value.type === "allOf" || value.type === "anyOf") {
    hasOnlyKeys(value, ["type", "items"], path, errors);
    if (!Array.isArray(value.items) || value.items.length === 0) {
      errors.push(`${path}.items 至少需要一项规则`);
      return { type: value.type, items: [] } as LlmGroupNode;
    }
    return {
      type: value.type,
      items: value.items.map((item, index) =>
        parseRuleNode(item, `${path}.items[${index}]`, errors, depth + 1),
      ),
    };
  }
  if (value.type === "not") {
    hasOnlyKeys(value, ["type", "item", "unless"], path, errors);
    const node: LlmNotNode = {
      type: "not",
      item: parseRuleNode(value.item, `${path}.item`, errors, depth + 1),
    };
    if (value.unless !== undefined) {
      node.unless = parseRuleNode(
        value.unless,
        `${path}.unless`,
        errors,
        depth + 1,
      );
    }
    return node;
  }
  errors.push(`${path}.type 必须是 condition、allOf、anyOf 或 not`);
  return { type: "allOf", items: [] };
}

function parseUnresolvedItem(
  value: unknown,
  path: string,
  errors: string[],
): LlmUnresolvedItem {
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象`);
    return { question: "", reason: "", relatedChunkIds: [] };
  }
  hasOnlyKeys(value, ["question", "reason", "relatedChunkIds"], path, errors);
  return {
    question: readNonEmptyString(value.question, `${path}.question`, errors),
    reason: readNonEmptyString(value.reason, `${path}.reason`, errors),
    relatedChunkIds: readStringArray(
      value.relatedChunkIds,
      `${path}.relatedChunkIds`,
      errors,
      false,
    ),
  };
}

export function validatePolicyExtraction(
  value: unknown,
): ValidationResult<LlmPolicyExtraction> {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["模型输出必须是 JSON 对象"] };
  }
  hasOnlyKeys(value, ["schemaVersion", "policyId", "rule", "unresolved"], "$", errors);
  if (value.schemaVersion !== POLICY_EXTRACTION_SCHEMA_VERSION) {
    errors.push(`$.schemaVersion 必须是 ${POLICY_EXTRACTION_SCHEMA_VERSION}`);
  }
  const policyId = readNonEmptyString(value.policyId, "$.policyId", errors);
  const rule = parseRuleNode(value.rule, "$.rule", errors);
  if (!Array.isArray(value.unresolved)) {
    errors.push("$.unresolved 必须是数组");
  }
  const unresolved = Array.isArray(value.unresolved)
    ? value.unresolved.map((item, index) =>
        parseUnresolvedItem(item, `$.unresolved[${index}]`, errors),
      )
    : [];
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
      policyId,
      rule,
      unresolved,
    },
  };
}

function parseFieldMapping(
  value: unknown,
  path: string,
  errors: string[],
): LlmFieldMapping {
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象`);
    return { criterionId: "", factKey: null, confidence: 0, rationale: "" };
  }
  hasOnlyKeys(value, ["criterionId", "factKey", "confidence", "rationale"], path, errors);
  const factKey =
    value.factKey === null
      ? null
      : readNonEmptyString(value.factKey, `${path}.factKey`, errors);
  if (
    typeof value.confidence !== "number" ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    errors.push(`${path}.confidence 必须是 0 到 1 之间的数字`);
  }
  return {
    criterionId: readNonEmptyString(
      value.criterionId,
      `${path}.criterionId`,
      errors,
    ),
    factKey,
    confidence: typeof value.confidence === "number" ? value.confidence : 0,
    rationale: readNonEmptyString(value.rationale, `${path}.rationale`, errors),
  };
}

export function validateFieldAlignmentOutput(
  value: unknown,
): ValidationResult<LlmFieldAlignmentOutput> {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["模型输出必须是 JSON 对象"] };
  }
  hasOnlyKeys(value, ["schemaVersion", "mappings", "unresolved"], "$", errors);
  if (value.schemaVersion !== FIELD_ALIGNMENT_SCHEMA_VERSION) {
    errors.push(`$.schemaVersion 必须是 ${FIELD_ALIGNMENT_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(value.mappings)) {
    errors.push("$.mappings 必须是数组");
  }
  const mappings = Array.isArray(value.mappings)
    ? value.mappings.map((item, index) =>
        parseFieldMapping(item, `$.mappings[${index}]`, errors),
      )
    : [];
  const unresolved = readStringArray(
    value.unresolved,
    "$.unresolved",
    errors,
    false,
  );
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      schemaVersion: FIELD_ALIGNMENT_SCHEMA_VERSION,
      mappings,
      unresolved,
    },
  };
}
