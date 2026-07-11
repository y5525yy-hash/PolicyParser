export type FactValue = string | number | boolean | null;

export type FactValueType = "string" | "number" | "boolean" | "date";

export type CriterionOperator =
  | "equals"
  | "notEquals"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

export interface PolicyEvidenceChunk {
  policyId: string;
  chunkId: string;
  text: string;
  sectionTitle?: string;
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
  expectedValue: Exclude<FactValue, null>;
  valueType: FactValueType;
  required: boolean;
  fieldAliases: string[];
  missingFieldLabel: string;
  satisfiedReason?: string;
  failedReason?: string;
  evidence: CriterionEvidence;
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
