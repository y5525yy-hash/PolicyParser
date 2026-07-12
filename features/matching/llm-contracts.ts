import type { FactValueType } from "./integration-contracts";

export const POLICY_EXTRACTION_SCHEMA_VERSION = "policy-criteria-v1";
export const FIELD_ALIGNMENT_SCHEMA_VERSION = "field-alignment-v1";

export type LlmLiteralValue = string | number | boolean;

export type LlmCriterionOperator =
  | "equals"
  | "notEquals"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

export interface LlmLiteralExpectedValue {
  kind: "literal";
  value: LlmLiteralValue;
}

export interface LlmReferenceExpectedValue {
  kind: "reference";
  reference: string;
}

export type LlmExpectedValue =
  | LlmLiteralExpectedValue
  | LlmReferenceExpectedValue;

export interface LlmConditionNode {
  type: "condition";
  field: string;
  label: string;
  operator: LlmCriterionOperator;
  expected: LlmExpectedValue;
  valueType: FactValueType;
  required: boolean;
  sourceText: string;
  sourceChunkIds: string[];
}

export interface LlmGroupNode {
  type: "allOf" | "anyOf";
  items: LlmRuleNode[];
}

export interface LlmNotNode {
  type: "not";
  item: LlmRuleNode;
  unless?: LlmRuleNode;
}

export type LlmRuleNode = LlmConditionNode | LlmGroupNode | LlmNotNode;

export interface LlmUnresolvedItem {
  question: string;
  reason: string;
  relatedChunkIds: string[];
}

export interface LlmPolicyExtraction {
  schemaVersion: typeof POLICY_EXTRACTION_SCHEMA_VERSION;
  policyId: string;
  rule: LlmRuleNode;
  unresolved: LlmUnresolvedItem[];
}

export interface LlmFieldMapping {
  criterionId: string;
  factKey: string | null;
  confidence: number;
  rationale: string;
}

export interface LlmFieldAlignmentOutput {
  schemaVersion: typeof FIELD_ALIGNMENT_SCHEMA_VERSION;
  mappings: LlmFieldMapping[];
  unresolved: string[];
}

export interface LlmJsonRequest {
  task: "policy-criteria-extraction" | "resident-field-alignment";
  schemaVersion:
    | typeof POLICY_EXTRACTION_SCHEMA_VERSION
    | typeof FIELD_ALIGNMENT_SCHEMA_VERSION;
  systemPrompt: string;
  userPrompt: string;
}

export interface LlmJsonClient {
  generateJson(request: LlmJsonRequest): Promise<unknown>;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };
