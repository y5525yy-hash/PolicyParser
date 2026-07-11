import { mockPolicies } from "@/features/policy/mock-policies";
import { mockResidentMatches } from "@/features/resident/mock-matches";
import {
  residentDirectoryRecords,
  type ResidentDirectoryRecord,
} from "@/features/resident/resident-directory-data";

export interface SimilarResident {
  reason: string;
  record: ResidentDirectoryRecord;
}

export function getSimilarResidents(
  residentId: string,
  limit = 4,
): SimilarResident[] {
  const currentRecord = residentDirectoryRecords.find(
    ({ resident }) => resident.id === residentId,
  );
  if (!currentRecord) return [];

  const currentMatches = mockResidentMatches.filter(
    (match) => match.residentId === residentId && match.status !== "unmatched",
  );

  return residentDirectoryRecords
    .filter(({ resident }) => resident.id !== residentId)
    .map((record) => {
      const candidateMatches = mockResidentMatches.filter(
        (match) =>
          match.residentId === record.resident.id && match.status !== "unmatched",
      );
      const sharedPolicy = currentMatches.find((currentMatch) =>
        candidateMatches.some(
          (candidateMatch) => candidateMatch.policyId === currentMatch.policyId,
        ),
      );
      const sharedMissingField = currentMatches
        .flatMap((match) => match.missingFields)
        .find((field) =>
          candidateMatches.some((match) => match.missingFields.includes(field)),
        );
      const sharedLabels = currentRecord.resident.labels.filter((label) =>
        record.resident.labels.includes(label),
      );
      const score =
        (sharedPolicy ? 6 : 0) +
        (sharedMissingField ? 3 : 0) +
        Math.min(sharedLabels.length, 3);

      let reason = "同属当前乡村网格管理范围";
      if (sharedPolicy) {
        const policy = mockPolicies.find(
          (item) => item.id === sharedPolicy.policyId,
        );
        reason = `共同匹配${policy?.name ?? "同一政策"}`;
      } else if (sharedMissingField) {
        reason = `均需核实${sharedMissingField}`;
      } else if (sharedLabels.length > 0) {
        reason = `共同标签：${sharedLabels.slice(0, 2).join("、")}`;
      }

      return { reason, record, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ reason, record }) => ({ reason, record }));
}

