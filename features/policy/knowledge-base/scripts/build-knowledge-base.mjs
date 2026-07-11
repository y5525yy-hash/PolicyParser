import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const CHAPTER_PATTERN = /^第[一二三四五六七八九十百千0-9]+章(?:\s|　|$)/;
const SECTION_PATTERN = /^[一二三四五六七八九十百千]+、/;
const CLAUSE_PATTERN = /^(第[一二三四五六七八九十百千0-9]+条)(?:\s|　|$)/;
const ITEM_PATTERN = /^(（[一二三四五六七八九十百千0-9]+）|\([一二三四五六七八九十百千0-9]+\)|[0-9]+[.．、])/;

export function normalizePolicyText(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t　 ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSectionHeading(block) {
  return CHAPTER_PATTERN.test(block) || SECTION_PATTERN.test(block);
}

export function splitPolicySections(text) {
  const normalized = normalizePolicyText(text);
  const lines = normalized.split("\n").filter(Boolean);
  const sections = [];
  let currentSection = "正文";
  let currentBlock = null;

  const flushCurrentBlock = () => {
    if (currentBlock) {
      sections.push(currentBlock);
      currentBlock = null;
    }
  };

  for (const line of lines) {
    if (isSectionHeading(line)) {
      flushCurrentBlock();
      currentSection = line;
      sections.push({
        section: currentSection,
        text: line,
        isHeading: true,
      });
      continue;
    }

    const clauseMatch = line.match(CLAUSE_PATTERN);
    const itemMatch = line.match(ITEM_PATTERN);

    if (clauseMatch) {
      flushCurrentBlock();
      currentBlock = {
        section: currentSection,
        clauseNumber: clauseMatch[1],
        text: line,
        isHeading: false,
      };
      continue;
    }

    if (itemMatch) {
      if (currentBlock?.clauseNumber?.startsWith("第")) {
        currentBlock.text = `${currentBlock.text}\n${line}`;
        continue;
      }

      flushCurrentBlock();
      currentBlock = {
        section: currentSection,
        clauseNumber: itemMatch[1],
        text: line,
        isHeading: false,
      };
      continue;
    }

    if (!currentBlock) {
      currentBlock = {
        section: currentSection,
        text: line,
        isHeading: false,
      };
    } else {
      currentBlock.text = `${currentBlock.text}\n${line}`;
    }
  }

  flushCurrentBlock();

  return sections;
}

function createChunkId(documentId, policyId, section, clauseNumber, text) {
  const digest = createHash("sha256")
    .update([documentId, policyId, section, clauseNumber ?? "", text].join("\n"))
    .digest("hex")
    .slice(0, 16);

  return `chunk-${digest}`;
}

function createDuplicateChunkId(baseChunkId, occurrence) {
  const digest = createHash("sha256")
    .update(`${baseChunkId}\n${occurrence}`)
    .digest("hex")
    .slice(0, 16);

  return `chunk-${digest}`;
}

export function buildPolicyChunks(document, text, options = {}) {
  const targetChars = options.targetChars ?? 900;
  const sourceSections = splitPolicySections(text);
  const chunks = [];
  const chunkIdOccurrences = new Map();

  for (const policyId of [...document.policyIds].sort()) {
    for (const sourceSection of sourceSections) {
      const chunkText = sourceSection.text;
      const oversizedCompleteClause = chunkText.length > targetChars;

      const baseChunkId = createChunkId(
        document.documentId,
        policyId,
        sourceSection.section,
        sourceSection.clauseNumber,
        chunkText,
      );
      const occurrence = (chunkIdOccurrences.get(baseChunkId) ?? 0) + 1;
      chunkIdOccurrences.set(baseChunkId, occurrence);
      const chunkId =
        occurrence === 1
          ? baseChunkId
          : createDuplicateChunkId(baseChunkId, occurrence);

      chunks.push({
        policyId,
        documentId: document.documentId,
        chunkId,
        policyName: document.officialName,
        section: sourceSection.section,
        clauseNumber: sourceSection.clauseNumber,
        region: document.region,
        officialCategory: document.officialCategory,
        publishedAt: document.publishedAt,
        effectiveFrom: document.effectiveFrom,
        effectiveTo: document.effectiveTo,
        status: document.status,
        verificationStatus: document.verificationStatus,
        officialUrl: document.officialUrl,
        text: chunkText,
        tags: [...document.tags].sort(),
        oversizedCompleteClause,
      });
    }
  }

  return chunks;
}

export async function writeJsonLines(filePath, rows) {
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(filePath, body ? `${body}\n` : "", "utf8");
}

function sortDocuments(documents) {
  return [...documents].sort((left, right) =>
    left.documentId.localeCompare(right.documentId, "en"),
  );
}

async function runCli() {
  const scriptPath = fileURLToPath(import.meta.url);
  const knowledgeBaseRoot = path.resolve(path.dirname(scriptPath), "..");
  const dataRoot = path.join(knowledgeBaseRoot, "data");
  const generatedRoot = path.join(dataRoot, "generated");
  const manifest = JSON.parse(
    await readFile(path.join(dataRoot, "manifest.json"), "utf8"),
  );
  const documents = sortDocuments(manifest.documents);
  const chunks = [];

  for (const document of documents) {
    const sourceText = await readFile(path.join(dataRoot, document.sourceTextPath), "utf8");
    chunks.push(...buildPolicyChunks(document, sourceText));
  }

  chunks.sort((left, right) =>
    [left.policyId, left.documentId, left.chunkId]
      .join(":")
      .localeCompare([right.policyId, right.documentId, right.chunkId].join(":"), "en"),
  );

  const activeChunks = chunks.filter(
    (chunk) =>
      chunk.status === "active" && chunk.verificationStatus === "human_verified",
  );

  await mkdir(generatedRoot, { recursive: true });
  await writeJsonLines(path.join(generatedRoot, "documents.jsonl"), documents);
  await writeJsonLines(path.join(generatedRoot, "chunks.jsonl"), chunks);
  await writeJsonLines(path.join(generatedRoot, "active-chunks.jsonl"), activeChunks);

  console.log(
    `Built ${documents.length} documents, ${chunks.length} chunks, and ${activeChunks.length} active chunks.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runCli();
}
