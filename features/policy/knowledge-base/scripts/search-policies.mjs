import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function buildCharacterNgrams(value, size = 2) {
  const normalized = normalizeSearchText(value);
  const grams = new Set();

  if (normalized.length <= size) {
    if (normalized) {
      grams.add(normalized);
    }
    return grams;
  }

  for (let index = 0; index <= normalized.length - size; index += 1) {
    grams.add(normalized.slice(index, index + size));
  }

  return grams;
}

function scoreChunk(chunk, query) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const normalizedText = normalizeSearchText(chunk.text);
  const normalizedTitle = normalizeSearchText(chunk.policyName);
  const normalizedSection = normalizeSearchText(chunk.section);
  const normalizedTags = normalizeSearchText(chunk.tags?.join(" "));
  let score = 0;

  for (const term of terms) {
    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm) {
      continue;
    }

    const hasExactTextMatch = normalizedText.includes(normalizedTerm);

    if (hasExactTextMatch) {
      score += 8;
    }
    if (normalizedTitle.includes(normalizedTerm)) {
      score += 6;
    }
    if (normalizedSection.includes(normalizedTerm)) {
      score += 4;
    }
    if (normalizedTags.includes(normalizedTerm)) {
      score += 2;
    }

    if (/\d/.test(normalizedTerm) && !hasExactTextMatch) {
      continue;
    }

    const termGrams = buildCharacterNgrams(normalizedTerm);
    const textGrams = buildCharacterNgrams(normalizedText);
    for (const gram of termGrams) {
      if (textGrams.has(gram)) {
        score += 1;
      }
    }
  }

  return score;
}

export function searchChunks(chunks, query, options = {}) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const limit = Math.max(1, Number(options.limit ?? 10));
  const includeHistory = options.includeHistory === true;

  return chunks
    .filter(
      (chunk) =>
        includeHistory ||
        (chunk.status === "active" && chunk.verificationStatus === "human_verified"),
    )
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, trimmedQuery) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.chunk.policyId.localeCompare(right.chunk.policyId, "en") ||
        left.chunk.chunkId.localeCompare(right.chunk.chunkId, "en"),
    )
    .slice(0, limit)
    .map(({ chunk, score }) => ({
      policyId: chunk.policyId,
      chunkId: chunk.chunkId,
      policyName: chunk.policyName,
      section: chunk.section,
      clauseNumber: chunk.clauseNumber,
      text: chunk.text,
      officialUrl: chunk.officialUrl,
      region: chunk.region,
      officialCategory: chunk.officialCategory,
      publishedAt: chunk.publishedAt,
      effectiveFrom: chunk.effectiveFrom,
      effectiveTo: chunk.effectiveTo,
      status: chunk.status,
      verificationStatus: chunk.verificationStatus,
      tags: chunk.tags,
      score,
    }));
}

export function parseJsonLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseCliArgs(argv) {
  const options = {
    query: "",
    limit: 10,
    includeHistory: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--query") {
      options.query = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--limit") {
      options.limit = Number(argv[index + 1] ?? 10);
      index += 1;
    } else if (value === "--include-history") {
      options.includeHistory = true;
    }
  }

  return options;
}

async function runCli() {
  const options = parseCliArgs(process.argv.slice(2));
  if (!options.query) {
    console.error("Missing required --query value.");
    process.exitCode = 1;
    return;
  }

  const scriptPath = fileURLToPath(import.meta.url);
  const generatedRoot = path.resolve(path.dirname(scriptPath), "../data/generated");
  const filename = options.includeHistory ? "chunks.jsonl" : "active-chunks.jsonl";
  const chunks = parseJsonLines(await readFile(path.join(generatedRoot, filename), "utf8"));
  const results = searchChunks(chunks, options.query, options);
  console.log(JSON.stringify({ query: options.query, results }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runCli();
}
