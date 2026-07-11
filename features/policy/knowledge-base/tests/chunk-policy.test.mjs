import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildPolicyChunks,
  normalizePolicyText,
  splitPolicySections,
} from "../scripts/build-knowledge-base.mjs";

const sourceUrl = new URL("./fixtures/conditional-policy.txt", import.meta.url);

const document = {
  documentId: "test-conditional-policy",
  policyIds: ["policy-001"],
  officialName: "条件测试政策",
  officialCategory: "民政、扶贫、救灾/社会福利",
  region: "北京市",
  publishedAt: "2026-01-01",
  effectiveFrom: "2026-02-01",
  status: "active",
  verificationStatus: "human_verified",
  officialUrl: "https://www.beijing.gov.cn/example.html",
  tags: ["scope:beijing", "locality:general"],
};

test("normalizes whitespace without rewriting policy wording", () => {
  const normalized = normalizePolicyText("第一条  条件一。\r\n\r\n条件二。  ");

  assert.equal(normalized, "第一条 条件一。\n\n条件二。");
});

test("recognizes chapters and numbered clauses", async () => {
  const text = await readFile(sourceUrl, "utf8");
  const sections = splitPolicySections(text);

  assert.equal(sections[0].section, "第一章 总则");
  assert.equal(sections[1].clauseNumber, "第一条");
  assert.equal(sections[3].clauseNumber, "第二条");
  assert.equal(sections[3].section, "第二章 申请条件");
});

test("does not split a clause containing eligibility logic", async () => {
  const text = await readFile(sourceUrl, "utf8");
  const chunks = buildPolicyChunks(document, text, { targetChars: 40 });
  const eligibilityChunk = chunks.find((chunk) => chunk.clauseNumber === "第二条");

  assert.ok(eligibilityChunk);
  assert.match(eligibilityChunk.text, /且年满八十周岁，或者/);
  assert.ok(eligibilityChunk.text.length > 40);
});

test("keeps a simultaneous-condition lead-in with all nested items", () => {
  const chunks = buildPolicyChunks(
    document,
    [
      "第一条 申请人需同时符合下列条件：",
      "（一）具有北京市户籍；",
      "（二）年满四十周岁；",
      "（三）未享受基本养老保险待遇。",
      "第二条 有下列情形之一的，停止享受补贴。",
    ].join("\n"),
  );
  const eligibilityChunk = chunks.find((chunk) => chunk.clauseNumber === "第一条");

  assert.ok(eligibilityChunk);
  assert.match(eligibilityChunk.text, /需同时符合下列条件/);
  assert.match(eligibilityChunk.text, /（一）具有北京市户籍/);
  assert.match(eligibilityChunk.text, /（二）年满四十周岁/);
  assert.match(eligibilityChunk.text, /（三）未享受基本养老保险待遇/);
});

test("preserves restrictions and exceptions in one chunk", async () => {
  const text = await readFile(sourceUrl, "utf8");
  const chunks = buildPolicyChunks(document, text, { targetChars: 40 });
  const restrictionChunk = chunks.find((chunk) => chunk.clauseNumber === "第三条");

  assert.ok(restrictionChunk);
  assert.match(restrictionChunk.text, /不得重复申请；但/);
  assert.match(restrictionChunk.text, /另有规定的除外/);
});

test("keeps Chinese-numbered provisions even when they resemble headings", () => {
  const chunks = buildPolicyChunks(
    document,
    "一、本市低保标准调整为每人每月1450元。\n\n二、本通知自2024年7月起施行。",
  );

  assert.ok(chunks.some((chunk) => chunk.text.includes("每人每月1450元")));
  assert.ok(chunks.some((chunk) => chunk.text.includes("2024年7月起施行")));
});

test("retains complete source lineage", async () => {
  const text = await readFile(sourceUrl, "utf8");
  const chunks = buildPolicyChunks(document, text);
  const chunk = chunks.find((item) => item.clauseNumber === "第二条");

  assert.deepEqual(
    {
      policyId: chunk?.policyId,
      documentId: chunk?.documentId,
      policyName: chunk?.policyName,
      section: chunk?.section,
      region: chunk?.region,
      officialCategory: chunk?.officialCategory,
      officialUrl: chunk?.officialUrl,
      status: chunk?.status,
    },
    {
      policyId: "policy-001",
      documentId: "test-conditional-policy",
      policyName: "条件测试政策",
      section: "第二章 申请条件",
      region: "北京市",
      officialCategory: "民政、扶贫、救灾/社会福利",
      officialUrl: "https://www.beijing.gov.cn/example.html",
      status: "active",
    },
  );
});

test("produces stable chunk ids and byte-equivalent rows", async () => {
  const text = await readFile(sourceUrl, "utf8");
  const first = buildPolicyChunks(document, text);
  const second = buildPolicyChunks(document, text);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.ok(first.every((chunk) => /^chunk-[a-f0-9]{16}$/.test(chunk.chunkId)));
});
