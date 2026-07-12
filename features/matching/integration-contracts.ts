export type FactValue = string | number | boolean | null;

export type FactValueType = "string" | "number" | "boolean" | "date";

export type CriterionOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "contains"
  | "in"
  | "exists";

export type CriterionExpectedValue = Exclude<FactValue, null> | string[];

export interface PolicyEvidenceChunk {
  policyId: string;
  chunkId: string;
  text: string;
  sectionTitle?: string;
  clauseNumber?: string;
  sourceUrl: string;
}

export interface ResidentFact {
  residentId: string;
  key: string;
  label: string;
  value: FactValue;
  valueType: FactValueType;
  aliases?: string[];
}

export interface CriterionEvidence {
  chunkId: string;
  quote: string;
  sourceUrl: string;
}

export interface PolicyCriterion {
  id: string;
  policyId: string;
  concept: string;
  label: string;
  operator: CriterionOperator;
  expectedValue: CriterionExpectedValue;
  valueType: FactValueType;
  required: boolean;
  fieldAliases: string[];
  missingFieldLabel: string;
  satisfiedReason?: string;
  failedReason?: string;
  evidence: CriterionEvidence;
}

export interface PolicyRuleCriterionNode {
  type: "criterion";
  criterion: PolicyCriterion;
}

export interface PolicyRuleGroupNode {
  type: "allOf" | "anyOf";
  nodes: PolicyRuleNode[];
}

export interface PolicyRuleNotNode {
  type: "not";
  node: PolicyRuleNode;
}

export type PolicyRuleNode =
  | PolicyRuleCriterionNode
  | PolicyRuleGroupNode
  | PolicyRuleNotNode;

export interface PolicyRuleScenario {
  id: string;
  label: string;
  sourceText: string;
  root: PolicyRuleNode;
}

export interface PolicyRuleSet {
  policyId: string;
  scenarios: PolicyRuleScenario[];
  followUpFields: string[];
}

export interface ResidentFactDisplayItem {
  label: string;
  value: string;
}

export type FieldAlignmentMethod =
  | "exact"
  | "alias"
  | "derived"
  | "semantic-fallback"
  | "unresolved";

export interface FieldAlignment {
  criterionId: string;
  factKey: string | null;
  confidence: number;
  method: FieldAlignmentMethod;
}

export interface PolicyEvidenceRequest {
  policyId?: string;
  queryText?: string;
  limit?: number;
}

export interface PolicyEvidenceProvider {
  retrievePolicyEvidence(
    request: PolicyEvidenceRequest,
  ): Promise<PolicyEvidenceChunk[]>;
}

export interface ResidentFactProvider {
  getResidentFacts(residentId: string): Promise<ResidentFact[]>;
}

export interface PolicyCriterionExtractor {
  extractCriteria(
    policyId: string,
    evidence: PolicyEvidenceChunk[],
  ): Promise<PolicyCriterion[]>;
}

export interface FieldAligner {
  alignField(
    criterion: PolicyCriterion,
    facts: ResidentFact[],
  ): Promise<FieldAlignment>;
}

export type CriterionEvaluationState = "satisfied" | "failed" | "unknown";

export interface CriterionEvaluation {
  criterionId: string;
  state: CriterionEvaluationState;
  alignment: FieldAlignment;
  actualValue: FactValue;
  reason: string;
  evidence: CriterionEvidence;
}

export type KernelDecision = "candidate" | "needs-verification" | "not-candidate";

export interface KernelMatchEvaluation {
  decision: KernelDecision;
  reasons: string[];
  missingFields: string[];
  criteria: CriterionEvaluation[];
}
