const LEADING_CLAUSE_MARKER =
  /^\s*(?:(?:第[一二三四五六七八九十百千\d]+条(?:之[一二三四五六七八九十百千\d]+)?)|(?:[（(][一二三四五六七八九十百千\d]+[）)])|(?:[一二三四五六七八九十百千]+[、.．])|(?:\d+(?:\.\d+)*[.．、]))\s*/;

/**
 * 仅统一页面展示的开头条款编号，知识库原始文本保持不变。
 * 原文内部的“前述1.2款”等引用不会被处理。
 */
export function formatPolicyEvidenceText(text: string) {
  return text.replace(LEADING_CLAUSE_MARKER, "").trim();
}
