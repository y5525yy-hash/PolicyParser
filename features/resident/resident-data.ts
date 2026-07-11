import type {
  GetResident,
  MatchPoliciesByResident,
} from "@/shared/contracts";

import { mockResidentMatches } from "@/features/resident/mock-matches";
import { mockResidents } from "@/features/resident/mock-residents";

export const getResident: GetResident = async (residentId) => {
  return mockResidents.find((resident) => resident.id === residentId) ?? null;
};

export const matchPoliciesByResident: MatchPoliciesByResident = async (
  residentId,
) => {
  return mockResidentMatches.filter(
    (result) => result.residentId === residentId,
  );
};

