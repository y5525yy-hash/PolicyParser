import type { LlmJsonClient, LlmPolicyExtraction } from "./llm-contracts";
import { POLICY_EXTRACTION_SCHEMA_VERSION } from "./llm-contracts";
import {
  validateFieldAlignmentOutput,
  validatePolicyExtraction,
} from "./llm-output-validator";
import { createLlmPolicyCriterionExtractor } from "./llm-policy-extractor";
import { extractCriteriaFromEvidence } from "./policy-criterion-extractor";

interface VerificationCase {
  name: string;
  passed: boolean;
}

const evidence = [
  {
    policyId: "policy-verification",
    chunkId: "chunk-age",
    text: "申请人应年满80周岁。",
    sourceUrl: "https://example.invalid/policy",
  },
];

function validSimpleExtraction(): LlmPolicyExtraction {
  return {
    schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
    policyId: "policy-verification",
    rule: {
      type: "allOf",
      items: [
        {
          type: "condition",
          field: "age",
          label: "年龄",
          operator: "greaterThanOrEqual",
          expected: { kind: "literal", value: 80 },
          valueType: "number",
          required: true,
          sourceText: "年满80周岁",
          sourceChunkIds: ["chunk-age"],
        },
      ],
    },
    unresolved: [],
  };
}

export async function runLlmPreparationVerification(): Promise<
  VerificationCase[]
> {
  const validExtraction = validatePolicyExtraction(validSimpleExtraction());
  const complexExtraction = validatePolicyExtraction({
    schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
    policyId: "policy-complex",
    rule: {
      type: "allOf",
      items: [
        {
          type: "anyOf",
          items: [
            {
              type: "condition",
              field: "income",
              label: "家庭收入",
              operator: "lessThanOrEqual",
              expected: {
                kind: "reference",
                reference: "本市同年职工最低工资标准",
              },
              valueType: "number",
              required: true,
              sourceText: "不超过本市同年职工最低工资标准",
              sourceChunkIds: ["chunk-income"],
            },
          ],
        },
        {
          type: "not",
          item: {
            type: "condition",
            field: "hasMultipleHomes",
            label: "多套住房",
            operator: "equals",
            expected: { kind: "literal", value: true },
            valueType: "boolean",
            required: true,
            sourceText: "拥有多套住房的不符合条件",
            sourceChunkIds: ["chunk-property"],
          },
          unless: {
            type: "condition",
            field: "hasApprovedException",
            label: "住房例外",
            operator: "equals",
            expected: { kind: "literal", value: true },
            valueType: "boolean",
            required: true,
            sourceText: "经认定的特殊情形除外",
            sourceChunkIds: ["chunk-property"],
          },
        },
      ],
    },
    unresolved: [],
  });
  const forbiddenDecision = validatePolicyExtraction({
    ...validSimpleExtraction(),
    status: "matched",
  });
  const missingEvidence = validatePolicyExtraction({
    schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
    policyId: "policy-verification",
    rule: {
      type: "allOf",
      items: [
        {
          type: "condition",
          field: "age",
          label: "年龄",
          operator: "greaterThanOrEqual",
          expected: { kind: "literal", value: 80 },
          valueType: "number",
          required: true,
          sourceText: "年满80周岁",
          sourceChunkIds: [],
        },
      ],
    },
    unresolved: [],
  });
  const unknownOperator = validatePolicyExtraction({
    ...validSimpleExtraction(),
    rule: {
      type: "condition",
      field: "age",
      label: "年龄",
      operator: "approximately",
      expected: { kind: "literal", value: 80 },
      valueType: "number",
      required: true,
      sourceText: "年满80周岁",
      sourceChunkIds: ["chunk-age"],
    },
  });
  const validAlignment = validateFieldAlignmentOutput({
    schemaVersion: "field-alignment-v1",
    mappings: [
      {
        criterionId: "criterion-age",
        factKey: "resident_age",
        confidence: 0.98,
        rationale: "年龄字段和别名一致",
      },
    ],
    unresolved: [],
  });

  let fallbackReason = "";
  const invalidClient: LlmJsonClient = {
    async generateJson() {
      return { schemaVersion: "wrong" };
    },
  };
  const fallbackExtractor = createLlmPolicyCriterionExtractor({
    client: invalidClient,
    onFallback(reason) {
      fallbackReason = reason;
    },
  });
  const fallbackCriteria = await fallbackExtractor.extractCriteria(
    "policy-verification",
    evidence,
  );
  const expectedFallback = extractCriteriaFromEvidence(
    "policy-verification",
    evidence,
  );

  const validClient: LlmJsonClient = {
    async generateJson() {
      return validSimpleExtraction();
    },
  };
  const llmCriteria = await createLlmPolicyCriterionExtractor({
    client: validClient,
  }).extractCriteria("policy-verification", evidence);

  return [
    { name: "简单政策条件输出通过严格校验", passed: validExtraction.ok },
    { name: "复合、否定、例外和动态标准可以表达", passed: complexExtraction.ok },
    { name: "模型资格结论字段会被拒绝", passed: !forbiddenDecision.ok },
    { name: "缺少政策证据引用会被拒绝", passed: !missingEvidence.ok },
    { name: "未知操作符会被拒绝", passed: !unknownOperator.ok },
    { name: "字段语义对齐输出通过严格校验", passed: validAlignment.ok },
    {
      name: "无效模型输出明确回退到本地提取器",
      passed:
        fallbackReason.includes("校验失败") &&
        fallbackCriteria.length === expectedFallback.length,
    },
    {
      name: "可安全执行的 LLM 条件可以转换为确定性条件",
      passed:
        llmCriteria.length === 1 &&
        llmCriteria[0]?.concept === "age" &&
        llmCriteria[0]?.expectedValue === 80,
    },
  ];
}
