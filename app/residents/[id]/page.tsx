import { notFound } from "next/navigation";

import {
  residentDirectoryRecords,
} from "@/features/resident/resident-directory-data";
import { matchPoliciesByResident } from "@/features/resident/resident-data";
import { ResidentProfileWorkspace } from "@/features/resident/resident-profile-workspace";
import { getSimilarResidents } from "@/features/resident/similar-residents";

interface ResidentDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; previous?: string }>;
}

export default async function ResidentDetailPage({
  params,
  searchParams,
}: ResidentDetailPageProps) {
  const { id } = await params;
  const { from, previous } = await searchParams;
  const record = residentDirectoryRecords.find(
    ({ resident }) => resident.id === id,
  );

  if (!record) {
    notFound();
  }

  const matches = await matchPoliciesByResident(id);
  const similarResidents = getSimilarResidents(id);
  const backHref = from?.startsWith("/residents") ? from : "/residents";
  const previousRecord = previous
    ? residentDirectoryRecords.find(({ resident }) => resident.id === previous)
    : undefined;
  const previousHref = previousRecord
    ? `/residents/${previousRecord.resident.id}?from=${encodeURIComponent(backHref)}`
    : undefined;

  return (
    <ResidentProfileWorkspace
      backHref={backHref}
      matches={matches}
      previousHref={previousHref}
      record={record}
      similarResidents={similarResidents}
    />
  );
}

