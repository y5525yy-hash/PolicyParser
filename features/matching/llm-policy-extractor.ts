import type {
  CriterionOperator,
  PolicyCriterion,
  PolicyCriterionExtractor,
  PolicyEvidenceChunk,
} from "./integration-contracts";
import type {
  LlmConditionNode,
  LlmJsonClient,
  LlmPolicyExtraction,
  LlmRuleNode,
} from "./llm-contracts";
import { validatePolicyExtraction } from "./llm-output-validator";
import { buildPolicyExtractionRequest } from "./llm-prompts";
import { patternPolicyCriterionExtractor } from "./policy-criterion-extractor";

export interface LlmPolicyExtractorOptions {
  client?: LlmJsonClient;
  fallback?: PolicyCriterionExtractor;
  onFallback?: (reason: string) => void;
}

function collectExecutableConditions(
  node: LlmRuleNode,
  conditions: LlmConditionNode[],
): boolean {
  if (node.type === "condition") {
    if (node.expected.kind !== "literal") {
      return false;
    }
    conditions.push(node);
    return true;
  }
  if (node.type === "allOf") {
    return node.items.every((item) =>
      collectExecutableConditions(item, conditions),
    );
  }
  if (node.type === "not" && node.unless === undefined) {
    if (node.item.type !== "condition" || node.item.expected.kind !== "literal") {
      return false;
    }
    conditions.push({
      ...node.item,
      operator:
        node.item.operator === "equals" ? "notEquals" : node.item.operator,
    });
    return node.item.operator === "equals";
  }
  return false;
}

function criterionReason(label: string, satisfied: boolean) {
  return satisfied ? `${label}符合条件` : `${label}不符合条件`;
}

function toPolicyCriteria(
  extraction: LlmPolicyExtraction,
  evidence: PolicyEvidenceChunk[],
): PolicyCriterion[] | null {
  if (extraction.unresolved.length > 0) {
    return null;
  }
  const conditions: LlmConditionNode[] = [];
  if (!collectExecutableConditions(extraction.rule, conditions)) {
    return null;
  }
  const evidenceById = new Map(evidence.map((chunk) => [chunk.chunkId, chunk]));
  return conditions.map((condition, index) => {
    if (condition.expected.kind !== "literal") {
      throw new Error("动态参考标准不能直接编译为确定性条件");
    }
    const chunkId = condition.sourceChunkIds[0] ?? "";
    const chunk = evidenceById.get(chunkId);
    if (!chunk) {
      throw new Error(`模型引用了不存在的政策片段：${chunkId}`);
    }
    return {
      id: `${chunkId}:${condition.field}:${index}`,
      policyId: extraction.policyId,
      concept: condition.field,
      label: condition.label,
      operator: condition.operator as CriterionOperator,
      expectedValue: condition.expected.value,
      valueType: condition.valueType,
      required: condition.required,
      fieldAliases: [condition.field, condition.label],
      missingFieldLabel: condition.label,
      satisfiedReason: criterionReason(condition.label, true),
      failedReason: criterionReason(condition.label, false),
      evidence: {
        chunkId,
        quote: condition.sourceText,
        sourceUrl: chunk.sourceUrl,
      },
    };
  });
}

export function createLlmPolicyCriterionExtractor(
  options: LlmPolicyExtractorOptions = {},
): PolicyCriterionExtractor {
  const fallback = options.fallback ?? patternPolicyCriterionExtractor;

  async function runFallback(
    reason: string,
    policyId: string,
    evidence: PolicyEvidenceChunk[],
  ) {
    options.onFallback?.(reason);
    return await fallback.extractCriteria(policyId, evidence);
  }

  return {
    async extractCriteria(policyId, evidence) {
      if (!options.client) {
        return await runFallback("未配置 LLM 客户端", policyId, evidence);
      }
      try {
        const rawOutput = await options.client.generateJson(
          buildPolicyExtractionRequest(policyId, evidence),
        );
        const validation = validatePolicyExtraction(rawOutput);
        if (validation.ok === false) {
          return await runFallback(
            `LLM 输出校验失败：${validation.errors.join("；")}`,
            policyId,
            evidence,
          );
        }
        if (validation.value.policyId !== policyId) {
          return await runFallback("LLM 返回了错误的 policyId", policyId, evidence);
        }
        const criteria = toPolicyCriteria(validation.value, evidence);
        if (!criteria || criteria.length === 0) {
          return await runFallback(
            "LLM 输出包含尚不能安全执行的复杂逻辑或待核实项",
            policyId,
            evidence,
          );
        }
        return criteria;
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        return await runFallback(`LLM 调用失败：${message}`, policyId, evidence);
      }
    },
  };
}
