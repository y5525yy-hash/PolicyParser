export type DocumentStatus = "active" | "historical" | "superseded" | "invalid";

export type VerificationStatus =
  | "collected"
  | "extracted"
  | "ai_draft"
  | "human_verified";

export type ExtractionMethod = "manual" | "rule" | "ai";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "contains"
  | "in"
  | "exists";

export interface AtomicPolicyCondition {
  type: "condition";
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
  unit?: string;
  sourceText: string;
  sourceChunkIds: string[];
}

export interface PolicyConditionGroup {
  type: "allOf" | "anyOf" | "not";
  conditions: PolicyConditionNode[];
  sourceText: string;
  sourceChunkIds: string[];
}

export type PolicyConditionNode = AtomicPolicyCondition | PolicyConditionGroup;

export interface SourceDocument {
  documentId: string;
  policyIds: string[];
  officialName: string;
  documentNumber?: string;
  officialCategory: string;
  issuingAuthorities: string[];
  region: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: DocumentStatus;
  replacesDocumentIds: string[];
  replacedByDocumentId?: string;
  officialUrl: string;
  interpretationUrls: string[];
  sourceTextPath: string;
  sourceFilePath?: string;
  contentSha256: string;
  collectedAt: string;
  verifiedAt?: string;
  verificationStatus: VerificationStatus;
  tags: string[];
}

export interface PolicyItem {
  policyId: string;
  documentIds: string[];
  name: string;
  region: string;
  tags: string[];
  status: DocumentStatus;
  verificationStatus: VerificationStatus;
}

export interface PolicyChunk {
  policyId: string;
  documentId: string;
  chunkId: string;
  policyName: string;
  section: string;
  clauseNumber?: string;
  region: string;
  officialCategory: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: DocumentStatus;
  verificationStatus: VerificationStatus;
  officialUrl: string;
  text: string;
  tags: string[];
}

export interface ExtractedPolicySection {
  title: string;
  text: string;
  sourceChunkIds: string[];
}

export interface PolicyPlainLanguage {
  officialInterpretationSourceIds: string[];
  aiDraft?: string;
  humanVerified?: string;
}

export interface PolicyExtraction {
  policyId: string;
  documentIds: string[];
  sourceChunkIds: string[];
  extractionMethod: ExtractionMethod;
  verificationStatus: VerificationStatus;
  eligibility: PolicyConditionNode[];
  applicablePopulation: ExtractedPolicySection[];
  benefits: ExtractedPolicySection[];
  materials: ExtractedPolicySection[];
  procedures: ExtractedPolicySection[];
  restrictions: ExtractedPolicySection[];
  unresolvedQuestions: string[];
  plainLanguage: PolicyPlainLanguage;
  extractedAt: string;
  verifiedAt?: string;
}

export interface PolicyManifest {
  schemaVersion: 1;
  generatedAt?: string;
  documents: SourceDocument[];
  policies: PolicyItem[];
}

export interface PolicyRetrievalResult {
  policyId: string;
  chunkId: string;
  policyName: string;
  section: string;
  text: string;
  officialUrl: string;
  region: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: "active";
  tags: string[];
  score: number;
}
