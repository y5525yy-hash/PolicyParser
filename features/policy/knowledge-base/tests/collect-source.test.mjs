import assert from "node:assert/strict";
import test from "node:test";

import {
  extractOfficialText,
  htmlToText,
} from "../scripts/collect-official-source.mjs";

test("converts policy html to readable text", () => {
  const html = `
    <html><head><style>.hidden{display:none}</style></head>
    <body><script>ignored()</script><h1>政策名称</h1><p>第一条&nbsp;申请条件。</p></body></html>
  `;

  assert.equal(htmlToText(html), "政策名称\n第一条 申请条件。");
});

test("extracts the audited policy range", () => {
  const text = "网页导航\n[主题分类] 社会保障\n政策正文\n第一条 条件\n分享：\n页脚";

  assert.equal(
    extractOfficialText(text, {
      startMarker: "[主题分类]",
      endMarker: "分享：",
    }),
    "[主题分类] 社会保障\n政策正文\n第一条 条件",
  );
});

test("can select the last repeated title marker", () => {
  const text = "政策名称\n导航\n政策名称\n正文\n打印本页";

  assert.equal(
    extractOfficialText(text, {
      startMarker: "政策名称",
      startOccurrence: "last",
      endMarker: "打印本页",
    }),
    "政策名称\n正文",
  );
});

test("fails when an audit marker is missing", () => {
  assert.throws(
    () => extractOfficialText("正文", { startMarker: "不存在" }),
    /start marker not found/,
  );
});
