import assert from "node:assert/strict";
import test from "node:test";

import {
  validateExtraction,
  validateExtractionReferences,
} from "../scripts/validate-manifest.mjs";

function createValidExtraction() {
  return {
    policyId: "policy-001",
    documentIds: ["bj-2019-elderly-subsidy"],
    sourceChunkIds: ["chunk-1234567890abcdef"],
    extractionMethod: "manual",
    verificationStatus: "human_verified",
    eligibility: [
      {
        type: "allOf",
        sourceText: "具有北京市户籍且年满80周岁",
        sourceChunkIds: ["chunk-1234567890abcdef"],
        conditions: [
          {
            type: "condition",
            field: "hukou",
            operator: "equals",
            value: "北京市",
            sourceText: "具有北京市户籍",
            sourceChunkIds: ["chunk-1234567890abcdef"],
          },
          {
            type: "condition",
            field: "age",
            operator: "greater_than_or_equal",
            value: 80,
            unit: "周岁",
            sourceText: "年满80周岁",
            sourceChunkIds: ["chunk-1234567890abcdef"],
          },
        ],
      },
    ],
    applicablePopulation: [],
    benefits: [],
    materials: [],
    procedures: [],
    restrictions: [],
    unresolvedQuestions: [],
    plainLanguage: {
      officialInterpretationSourceIds: ["bj-2019-elderly-subsidy-interpretation"],
      aiDraft: "AI 草稿",
      humanVerified: "经人工确认的大白话解释",
    },
    extractedAt: "2026-07-11",
    verifiedAt: "2026-07-11",
  };
}

test("accepts human-verified extraction with source lineage", () => {
  assert.deepEqual(validateExtraction(createValidExtraction()), []);
});

test("rejects eligibility conditions without source chunks", () => {
  const extraction = createValidExtraction();
  extraction.eligibility[0].conditions[0].sourceChunkIds = [];

  const errors = validateExtraction(extraction);

  assert.ok(errors.some((error) => error.includes("sourceChunkIds")));
});

test("preserves allOf, anyOf and not as explicit operators", () => {
  const extraction = createValidExtraction();
  extraction.eligibility[0].type = "unknown";

  const errors = validateExtraction(extraction);

  assert.ok(errors.some((error) => error.includes("condition group type")));
});

test("requires a human-confirmed plain-language explanation", () => {
  const extraction = createValidExtraction();
  extraction.plainLanguage.humanVerified = "";

  const errors = validateExtraction(extraction);

  assert.ok(errors.some((error) => error.includes("humanVerified")));
});

test("does not treat an AI draft as human verification", () => {
  const extraction = createValidExtraction();
  extraction.verificationStatus = "ai_draft";
  extraction.plainLanguage.humanVerified = undefined;

  assert.deepEqual(validateExtraction(extraction), []);
});

test("rejects references to missing documents and chunks", () => {
  const extraction = createValidExtraction();
  const errors = validateExtractionReferences(extraction, {
    policyIds: new Set(["policy-002"]),
    documentIds: new Set(["another-document"]),
    chunkIds: new Set(["chunk-another"]),
  });

  assert.ok(errors.some((error) => error.includes("unknown policyId")));
  assert.ok(errors.some((error) => error.includes("unknown documentId")));
  assert.ok(errors.some((error) => error.includes("unknown sourceChunkId")));
});
