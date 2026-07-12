import assert from "node:assert/strict";
import test from "node:test";

import { searchChunks } from "../scripts/search-policies.mjs";

const chunks = [
  {
    policyId: "policy-001",
    documentId: "bj-2019-elderly-subsidy",
    chunkId: "chunk-active-eligibility",
    policyName: "高龄老年人津贴",
    section: "补贴对象",
    clauseNumber: "第一条",
    text: "具有北京市户籍且年满80周岁的老年人，可以按照规定申请高龄老年人津贴。",
    officialUrl: "https://www.beijing.gov.cn/active.html",
    region: "北京市",
    publishedAt: "2019-10-25",
    effectiveFrom: "2019-10-01",
    status: "active",
    verificationStatus: "human_verified",
    officialCategory: "民政、扶贫、救灾/社会福利",
    tags: ["scope:beijing", "audience:elderly"],
  },
  {
    policyId: "policy-001",
    documentId: "bj-2010-elderly-subsidy",
    chunkId: "chunk-historical-eligibility",
    policyName: "历史高龄津贴办法",
    section: "申请条件",
    text: "历史版本规定年满90周岁方可申请。",
    officialUrl: "https://www.beijing.gov.cn/history.html",
    region: "北京市",
    status: "superseded",
    verificationStatus: "human_verified",
    officialCategory: "民政、扶贫、救灾/社会福利",
    tags: ["scope:beijing", "version:historical"],
  },
  {
    policyId: "policy-008",
    documentId: "bj-2020-temporary-assistance",
    chunkId: "chunk-active-assistance",
    policyName: "北京市临时救助",
    section: "救助对象和条件",
    text: "因火灾、交通事故或者突发重大疾病导致基本生活严重困难的，可以申请临时救助。",
    officialUrl: "https://www.beijing.gov.cn/assistance.html",
    region: "北京市",
    status: "active",
    verificationStatus: "human_verified",
    officialCategory: "民政、扶贫、救灾/社会福利",
    tags: ["scope:beijing", "topic:social-assistance"],
  },
];

test("returns original eligibility clauses and provenance", () => {
  const results = searchChunks(chunks, "年满80周岁 北京户籍", { limit: 5 });

  assert.equal(results[0].policyId, "policy-001");
  assert.equal(results[0].chunkId, "chunk-active-eligibility");
  assert.match(results[0].text, /具有北京市户籍且年满80周岁/);
  assert.equal(results[0].officialUrl, "https://www.beijing.gov.cn/active.html");
  assert.equal(results[0].section, "补贴对象");
});

test("excludes historical, superseded and invalid chunks by default", () => {
  const results = searchChunks(chunks, "90周岁", { limit: 5 });

  assert.deepEqual(results, []);
});

test("can include history explicitly", () => {
  const results = searchChunks(chunks, "90周岁", {
    includeHistory: true,
    limit: 5,
  });

  assert.equal(results[0].chunkId, "chunk-historical-eligibility");
});

test("ranks exact policy and section matches deterministically", () => {
  const first = searchChunks(chunks, "临时救助 重大疾病", { limit: 5 });
  const second = searchChunks(chunks, "临时救助 重大疾病", { limit: 5 });

  assert.equal(first[0].policyId, "policy-008");
  assert.deepEqual(first, second);
});

test("returns no result for an empty query", () => {
  assert.deepEqual(searchChunks(chunks, "   "), []);
});
