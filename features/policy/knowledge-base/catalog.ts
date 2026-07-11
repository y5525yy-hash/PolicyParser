import type {
  PolicyExtraction,
  PolicyItem,
  PolicyManifest,
  SourceDocument,
} from "@/features/policy/knowledge-base/schema";

export interface PolicyCatalogEntry {
  policy: PolicyItem;
  documents: SourceDocument[];
  extraction: PolicyExtraction | null;
}

export function isDefaultSearchable(
  value: Pick<PolicyItem | SourceDocument, "status" | "verificationStatus">,
) {
  return value.status === "active" && value.verificationStatus === "human_verified";
}

export function buildPolicyCatalog(
  manifest: PolicyManifest,
  extractions: PolicyExtraction[],
) {
  const documentsById = new Map(
    manifest.documents.map((document) => [document.documentId, document]),
  );
  const extractionsByPolicyId = new Map(
    extractions.map((extraction) => [extraction.policyId, extraction]),
  );

  return manifest.policies.map<PolicyCatalogEntry>((policy) => ({
    policy,
    documents: policy.documentIds
      .map((documentId) => documentsById.get(documentId))
      .filter((document): document is SourceDocument => Boolean(document)),
    extraction: extractionsByPolicyId.get(policy.policyId) ?? null,
  }));
}

export function getActiveCatalogEntries(entries: PolicyCatalogEntry[]) {
  return entries.filter(
    ({ policy, documents, extraction }) =>
      isDefaultSearchable(policy) &&
      documents.some(isDefaultSearchable) &&
      extraction?.verificationStatus === "human_verified",
  );
}
