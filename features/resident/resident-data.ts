import type {
  GetResident,
  MatchPoliciesByResident,
} from "@/shared/contracts";

import { matchPoliciesByResident as matchPoliciesByResidentWithRules } from "@/features/matching/matching-service";
import { mockResidents } from "@/features/resident/mock-residents";

export const getResident: GetResident = async (residentId) => {
  return mockResidents.find((resident) => resident.id === residentId) ?? null;
};

export const matchPoliciesByResident: MatchPoliciesByResident =
  matchPoliciesByResidentWithRules;
