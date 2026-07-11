import type {
  CaseStatus,
  CaseTask,
  MatchResult,
  Policy,
  Resident,
} from "@/shared/types";

export type GetPolicy = (policyId: string) => Promise<Policy | null>;
export type GetResident = (residentId: string) => Promise<Resident | null>;
export type MatchResidentsByPolicy = (
  policyId: string,
) => Promise<MatchResult[]>;
export type MatchPoliciesByResident = (
  residentId: string,
) => Promise<MatchResult[]>;
export type CreateCaseTask = (
  residentId: string,
  policyId: string,
) => Promise<CaseTask>;
export type UpdateCaseTask = (
  taskId: string,
  status: CaseStatus,
) => Promise<CaseTask | null>;

