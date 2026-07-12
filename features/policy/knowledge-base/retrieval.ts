import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  PolicyChunk,
  PolicyExtraction,
  PolicyRetrievalResult,
} from "@/features/policy/knowledge-base/schema";

const dataRoot = path.join(
  process.cwd(),
  "features/policy/knowledge-base/data",
);

let activeChunksPromise: Promise<PolicyChunk[]> | null = null;

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function buildCharacterNgrams(value: string, size = 2) {
  const normalized = normalizeSearchText(value);
  const grams = new Set<string>();

  if (normalized.length <= size) {
    if (normalized) grams.add(normalized);
    return grams;
  }

  for (let index = 0; index <= normalized.length - size; index += 1) {
    grams.add(normalized.slice(index, index + size));
  }

  return grams;
}

function scoreChunk(chunk: PolicyChunk, query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const normalizedText = normalizeSearchText(chunk.text);
  const normalizedTitle = normalizeSearchText(chunk.policyName);
  const normalizedSection = normalizeSearchText(chunk.section);
  const normalizedTags = normalizeSearchText(chunk.tags.join(" "));
  const textGrams = buildCharacterNgrams(normalizedText);
  let score = 0;

  for (const term of terms) {
    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm) continue;

    const hasExactTextMatch = normalizedText.includes(normalizedTerm);
    if (hasExactTextMatch) score += 8;
    if (normalizedTitle.includes(normalizedTerm)) score += 6;
    if (normalizedSection.includes(normalizedTerm)) score += 4;
    if (normalizedTags.includes(normalizedTerm)) score += 2;
    if (/\d/.test(normalizedTerm) && !hasExactTextMatch) continue;

    for (const gram of buildCharacterNgrams(normalizedTerm)) {
      if (textGrams.has(gram)) score += 1;
    }
  }

  return score;
}

async function loadActiveChunks() {
  activeChunksPromise ??= readFile(
    path.join(dataRoot, "generated/active-chunks.jsonl"),
    "utf8",
  ).then((value) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as PolicyChunk),
  );

  return activeChunksPromise;
}

export async function getActivePolicyChunksByIds(chunkIds: string[]) {
  if (chunkIds.length === 0) return [];

  const requestedIds = new Set(chunkIds);
  const chunks = await loadActiveChunks();
  const chunksById = new Map(
    chunks
      .filter(
        (chunk) =>
      requestedIds.has(chunk.chunkId) &&
      chunk.status === "active" &&
      chunk.verificationStatus === "human_verified",
      )
      .map((chunk) => [chunk.chunkId, chunk]),
  );
  return chunkIds.flatMap((chunkId) => {
    const chunk = chunksById.get(chunkId);
    return chunk ? [chunk] : [];
  });
}

export async function searchPolicyClauses(query: string, limit = 6) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const chunks = await loadActiveChunks();
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, trimmedQuery) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.chunk.policyId.localeCompare(right.chunk.policyId, "en") ||
        left.chunk.chunkId.localeCompare(right.chunk.chunkId, "en"),
    )
    .slice(0, Math.max(1, limit))
    .map<PolicyRetrievalResult>(({ chunk, score }) => ({
      policyId: chunk.policyId,
      chunkId: chunk.chunkId,
      policyName: chunk.policyName,
      section: chunk.section,
      clauseNumber: chunk.clauseNumber,
      text: chunk.text,
      officialUrl: chunk.officialUrl,
      region: chunk.region,
      publishedAt: chunk.publishedAt,
      effectiveFrom: chunk.effectiveFrom,
      effectiveTo: chunk.effectiveTo,
      status: "active",
      tags: chunk.tags,
      score,
    }));
}

export async function getPolicyEligibilityClauses(policyId: string) {
  if (!/^policy-\d{3}$/.test(policyId)) return null;

  try {
    const extraction = JSON.parse(
      await readFile(path.join(dataRoot, `extractions/${policyId}.json`), "utf8"),
    ) as PolicyExtraction;

    return extraction.verificationStatus === "human_verified" ? extraction : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
