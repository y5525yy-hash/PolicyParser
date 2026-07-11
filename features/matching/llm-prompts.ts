import type {
  PolicyCriterion,
  PolicyEvidenceChunk,
  ResidentFact,
} from "./integration-contracts";
import {
  FIELD_ALIGNMENT_SCHEMA_VERSION,
  POLICY_EXTRACTION_SCHEMA_VERSION,
  type LlmJsonRequest,
} from "./llm-contracts";

const POLICY_EXTRACTION_SYSTEM_PROMPT = `你是政策条件结构化助手，不是资格审批人员。

任务：只根据提供的政策原文证据，把资格条件、组合逻辑、排除条件、例外和待核实问题转换为 JSON。

硬性规则：
1. 只能使用输入证据中明确出现的信息，不得使用常识补充政策条件。
2. 不得输出居民是否符合、matched、eligible、status、decision 等资格结论。
3. 每个 condition 必须原样引用 sourceText，并列出对应 sourceChunkIds。
4. “同时满足”使用 allOf，“任一条件”使用 anyOf，“不得/不属于”使用 not；例外放在 not.unless。
5. 数值、字符串、布尔和日期常量使用 expected.kind=literal。
6. “当年最低工资标准”等随时间或地区变化的标准使用 expected.kind=reference，不得自行填写数值。
7. 无法从证据确定的字段或逻辑写入 unresolved，不得猜测。
8. 只输出一个 JSON 对象，不要 Markdown，不要解释文字。

输出 schemaVersion 必须是 ${POLICY_EXTRACTION_SCHEMA_VERSION}。`;

const FIELD_ALIGNMENT_SYSTEM_PROMPT = `你是居民字段语义对齐助手，不是资格审批人员。

任务：根据政策条件的概念、别名和居民字段元数据，判断最可能对应的字段 key。

硬性规则：
1. 只能比较字段名称、标签、类型和别名，不得改变居民字段值。
2. 不得输出居民是否符合政策，也不得执行条件比较。
3. 无可靠对应时 factKey 必须为 null，并写入 unresolved。
4. confidence 必须是 0 到 1 之间的数字；不要为了完整率强行映射。
5. 只输出一个 JSON 对象，不要 Markdown，不要解释文字。

输出 schemaVersion 必须是 ${FIELD_ALIGNMENT_SCHEMA_VERSION}。`;

export function buildPolicyExtractionRequest(
  policyId: string,
  evidence: PolicyEvidenceChunk[],
): LlmJsonRequest {
  return {
    task: "policy-criteria-extraction",
    schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
    systemPrompt: POLICY_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        policyId,
        evidence: evidence.map((chunk) => ({
          chunkId: chunk.chunkId,
          sectionTitle: chunk.sectionTitle ?? null,
          text: chunk.text,
          sourceUrl: chunk.sourceUrl,
        })),
        outputExample: {
          schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
          policyId,
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
                sourceText: "80周岁及以上",
                sourceChunkIds: ["chunk-example"],
              },
            ],
          },
          unresolved: [],
        },
      },
      null,
      2,
    ),
  };
}

export function buildFieldAlignmentRequest(
  criteria: PolicyCriterion[],
  facts: ResidentFact[],
): LlmJsonRequest {
  return {
    task: "resident-field-alignment",
    schemaVersion: FIELD_ALIGNMENT_SCHEMA_VERSION,
    systemPrompt: FIELD_ALIGNMENT_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        criteria: criteria.map((criterion) => ({
          criterionId: criterion.id,
          concept: criterion.concept,
          label: criterion.label,
          valueType: criterion.valueType,
          fieldAliases: criterion.fieldAliases,
        })),
        residentFieldMetadata: facts.map((fact) => ({
          key: fact.key,
          label: fact.label,
          valueType: fact.valueType,
          aliases: fact.aliases ?? [],
        })),
        outputExample: {
          schemaVersion: FIELD_ALIGNMENT_SCHEMA_VERSION,
          mappings: [
            {
              criterionId: "criterion-example",
              factKey: "resident_age",
              confidence: 0.98,
              rationale: "年龄概念与居民年龄字段及别名一致",
            },
          ],
          unresolved: [],
        },
      },
      null,
      2,
    ),
  };
}
