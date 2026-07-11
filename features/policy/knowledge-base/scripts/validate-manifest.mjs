import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const VALID_DOCUMENT_STATUSES = new Set([
  "active",
  "historical",
  "superseded",
  "invalid",
]);

const VALID_VERIFICATION_STATUSES = new Set([
  "collected",
  "extracted",
  "ai_draft",
  "human_verified",
]);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const OFFICIAL_URL_PATTERN = /^https?:\/\//;

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

function isValidDate(value) {
  return typeof value === "string" && ISO_DATE_PATTERN.test(value);
}

function requireString(errors, value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} must be a non-empty string`);
  }
}

export function validateManifest(manifest, options = {}) {
  const errors = [];
  const allowedPolicyIds = options.allowedPolicyIds;

  if (!manifest || manifest.schemaVersion !== 1) {
    errors.push("schemaVersion must equal 1");
  }

  if (!Array.isArray(manifest?.documents)) {
    errors.push("documents must be an array");
  }

  if (!Array.isArray(manifest?.policies)) {
    errors.push("policies must be an array");
  }

  if (errors.length > 0) {
    return errors;
  }

  const documentIds = manifest.documents.map((document) => document.documentId);
  const policyIds = manifest.policies.map((policy) => policy.policyId);

  for (const duplicate of findDuplicates(documentIds)) {
    errors.push(`duplicate documentId: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(policyIds)) {
    errors.push(`duplicate policyId: ${duplicate}`);
  }

  const documentIdSet = new Set(documentIds);
  const policyIdSet = new Set(policyIds);

  for (const [index, document] of manifest.documents.entries()) {
    const label = `documents[${index}]`;
    requireString(errors, document.documentId, `${label}.documentId`);
    requireString(errors, document.officialName, `${label}.officialName`);
    requireString(errors, document.officialCategory, `${label}.officialCategory`);
    requireString(errors, document.region, `${label}.region`);
    requireString(errors, document.officialUrl, `${label}.officialUrl`);

    if (!Array.isArray(document.policyIds) || document.policyIds.length === 0) {
      errors.push(`${label}.policyIds must contain at least one policyId`);
    }

    for (const policyId of document.policyIds ?? []) {
      if (!policyIdSet.has(policyId)) {
        errors.push(`${label} references unknown policyId: ${policyId}`);
      }
    }

    if (!VALID_DOCUMENT_STATUSES.has(document.status)) {
      errors.push(`${label}.status is invalid`);
    }

    if (!VALID_VERIFICATION_STATUSES.has(document.verificationStatus)) {
      errors.push(`${label}.verificationStatus is invalid`);
    }

    if (!OFFICIAL_URL_PATTERN.test(document.officialUrl ?? "")) {
      errors.push(`${label}.officialUrl must be an http or https URL`);
    }

    if (!SHA256_PATTERN.test(document.contentSha256 ?? "")) {
      errors.push(`${label}.contentSha256 must be a lowercase SHA-256 value`);
    }

    if (!isValidDate(document.collectedAt)) {
      errors.push(`${label}.collectedAt must use YYYY-MM-DD`);
    }

    for (const dateField of ["publishedAt", "effectiveFrom", "effectiveTo", "verifiedAt"]) {
      if (document[dateField] !== undefined && !isValidDate(document[dateField])) {
        errors.push(`${label}.${dateField} must use YYYY-MM-DD`);
      }
    }

    if (
      document.effectiveFrom &&
      document.effectiveTo &&
      document.effectiveTo < document.effectiveFrom
    ) {
      errors.push(`${label}.effectiveTo cannot be before effectiveFrom`);
    }

    if (
      document.status === "active" &&
      document.verificationStatus === "human_verified" &&
      (typeof document.sourceTextPath !== "string" || document.sourceTextPath.trim() === "")
    ) {
      errors.push(`${label}.sourceTextPath is required for active human-verified documents`);
    }

    if (document.status === "invalid" && document.searchable === true) {
      errors.push(`${label} invalid document cannot be searchable`);
    }

    for (const replacedId of document.replacesDocumentIds ?? []) {
      if (!documentIdSet.has(replacedId)) {
        errors.push(`${label} replaces unknown documentId: ${replacedId}`);
      }
    }

    if (document.replacedByDocumentId && !documentIdSet.has(document.replacedByDocumentId)) {
      errors.push(`${label} replacedByDocumentId is unknown: ${document.replacedByDocumentId}`);
    }
  }

  for (const [index, policy] of manifest.policies.entries()) {
    const label = `policies[${index}]`;
    requireString(errors, policy.policyId, `${label}.policyId`);
    requireString(errors, policy.name, `${label}.name`);
    requireString(errors, policy.region, `${label}.region`);

    if (allowedPolicyIds && !allowedPolicyIds.has(policy.policyId)) {
      errors.push(`${label}.policyId is not registered in shared/demo-constants.ts: ${policy.policyId}`);
    }

    if (!Array.isArray(policy.documentIds) || policy.documentIds.length === 0) {
      errors.push(`${label}.documentIds must contain at least one documentId`);
    }

    for (const documentId of policy.documentIds ?? []) {
      if (!documentIdSet.has(documentId)) {
        errors.push(`${label} references unknown documentId: ${documentId}`);
      }
    }

    if (!VALID_DOCUMENT_STATUSES.has(policy.status)) {
      errors.push(`${label}.status is invalid`);
    }

    if (!VALID_VERIFICATION_STATUSES.has(policy.verificationStatus)) {
      errors.push(`${label}.verificationStatus is invalid`);
    }
  }

  return errors;
}

async function loadAllowedPolicyIds(projectRoot) {
  const constantsPath = path.join(projectRoot, "shared", "demo-constants.ts");
  const source = await readFile(constantsPath, "utf8");
  return new Set(source.match(/"policy-\d+"/g)?.map((value) => value.slice(1, -1)) ?? []);
}

async function validateSourceFiles(manifest, dataRoot) {
  const errors = [];

  for (const document of manifest.documents) {
    if (!document.sourceTextPath) {
      continue;
    }

    try {
      await access(path.join(dataRoot, document.sourceTextPath));
    } catch {
      errors.push(`source text file is missing for ${document.documentId}: ${document.sourceTextPath}`);
    }
  }

  return errors;
}

async function runCli() {
  const scriptPath = fileURLToPath(import.meta.url);
  const knowledgeBaseRoot = path.resolve(path.dirname(scriptPath), "..");
  const projectRoot = path.resolve(knowledgeBaseRoot, "../../..");
  const dataRoot = path.join(knowledgeBaseRoot, "data");
  const manifestPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(dataRoot, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const allowedPolicyIds = await loadAllowedPolicyIds(projectRoot);
  const errors = [
    ...validateManifest(manifest, { allowedPolicyIds }),
    ...(await validateSourceFiles(manifest, dataRoot)),
  ];

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Validated ${manifest.documents.length} documents and ${manifest.policies.length} policies.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runCli();
}
