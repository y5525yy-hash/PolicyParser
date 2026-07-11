export type MatchStatus = "matched" | "pending" | "unmatched";

export type CaseStatus =
  | "todo"
  | "collecting"
  | "submitted"
  | "processing"
  | "completed";

export interface Policy {
  id: string;
  name: string;
  originalName: string;
  region: string;
  summary: string;
  applicableTo: string[];
  benefitText: string;
  materials: string[];
  officialUrl: string;
  effectiveDate: string;
  updatedAt: string;
}

export interface Resident {
  id: string;
  name: string;
  age?: number;
  hukou?: string;
  livingStatus?: string;
  lowIncomeStatus?: string;
  disabilityStatus?: string;
  insuranceStatus?: string;
  labels: string[];
}

export interface MatchResult {
  policyId: string;
  residentId: string;
  status: MatchStatus;
  reasons: string[];
  missingFields: string[];
}

export interface CaseTask {
  id: string;
  residentId: string;
  policyId: string;
  status: CaseStatus;
  missingMaterials: string[];
  assignee: string;
  nextFollowUpAt?: string;
}

