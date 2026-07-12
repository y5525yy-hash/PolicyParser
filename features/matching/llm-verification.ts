import type {
  LlmJsonClient,
  LlmPolicyExtraction,
} from "./llm-contracts";
import type {
  PolicyCriterion,
  ResidentFact,
} from "./integration-contracts";
import { POLICY_EXTRACTION_SCHEMA_VERSION } from "./llm-contracts";
import {
  validateFieldAlignmentOutput,
  validateFieldAlignmentOutputForInputs,
  validatePolicyExtraction,
  validatePolicyExtractionForEvidence,
} from "./llm-output-validator";
import { createLlmPolicyCriterionExtractor } from "./llm-policy-extractor";
import {
  createLlmAssistedFieldAligner,
  createPreparedLlmAssistedFieldAligner,
} from "./llm-field-aligner.server";
import {
  createOpenAiChatCompletionsJsonClient,
  createOpenAiChatPolicyCriterionExtractor,
} from "./llm-openai-chat-client.server";
import {
  buildFieldAlignmentRequest,
  buildPolicyExtractionRequest,
} from "./llm-prompts";
import { alignCriterionToFacts } from "./field-aligner";
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
  const alignmentCriterion = {
    id: "criterion-age",
    policyId: "policy-verification",
    concept: "age",
    label: "年龄",
    operator: "greaterThanOrEqual",
    expectedValue: 80,
    valueType: "number",
    required: true,
    fieldAliases: ["age", "年龄"],
    missingFieldLabel: "年龄",
    evidence: {
      chunkId: "chunk-age",
      quote: "年满80周岁",
      sourceUrl: "https://example.invalid/policy",
    },
  } satisfies PolicyCriterion;
  const alignmentFact = {
    residentId: "resident-verification",
    key: "resident_age",
    label: "居民年龄",
    value: 82,
    valueType: "number",
    aliases: ["年龄"],
  } satisfies ResidentFact;
  const validScopedAlignment = validateFieldAlignmentOutputForInputs(
    {
      schemaVersion: "field-alignment-v1",
      mappings: [
        {
          criterionId: "criterion-age",
          factKey: "resident_age",
          confidence: 0.98,
          rationale: "年龄概念与居民年龄字段及别名一致",
        },
      ],
      unresolved: [],
    },
    [alignmentCriterion],
    [alignmentFact],
  );
  const inventedFactKey = validateFieldAlignmentOutputForInputs(
    {
      schemaVersion: "field-alignment-v1",
      mappings: [
        {
          criterionId: "criterion-age",
          factKey: "invented_age_field",
          confidence: 0.99,
          rationale: "模型自行创造的字段",
        },
      ],
      unresolved: [],
    },
    [alignmentCriterion],
    [alignmentFact],
  );
  const missingCriterionMapping = validateFieldAlignmentOutputForInputs(
    {
      schemaVersion: "field-alignment-v1",
      mappings: [],
      unresolved: [],
    },
    [alignmentCriterion],
    [alignmentFact],
  );
  const alignmentDecision = validateFieldAlignmentOutput({
    schemaVersion: "field-alignment-v1",
    mappings: [
      {
        criterionId: "criterion-age",
        factKey: "resident_age",
        confidence: 0.98,
        rationale: "该居民符合政策，可以领取待遇",
      },
    ],
    unresolved: [],
  });

  const validEvidenceClosure = validatePolicyExtractionForEvidence(
    validSimpleExtraction(),
    "policy-verification",
    evidence,
  );
  const inventedChunkId = validatePolicyExtractionForEvidence(
    {
      ...validSimpleExtraction(),
      rule: {
        type: "condition",
        field: "age",
        label: "年龄",
        operator: "greaterThanOrEqual",
        expected: { kind: "literal", value: 80 },
        valueType: "number",
        required: true,
        sourceText: "年满80周岁",
        sourceChunkIds: ["chunk-invented"],
      },
    },
    "policy-verification",
    evidence,
  );
  const paraphrasedQuote = validatePolicyExtractionForEvidence(
    {
      ...validSimpleExtraction(),
      rule: {
        type: "condition",
        field: "age",
        label: "年龄",
        operator: "greaterThanOrEqual",
        expected: { kind: "literal", value: 80 },
        valueType: "number",
        required: true,
        sourceText: "申请人年龄必须达到八十岁",
        sourceChunkIds: ["chunk-age"],
      },
    },
    "policy-verification",
    evidence,
  );
  const inferredThreshold = validatePolicyExtractionForEvidence(
    {
      ...validSimpleExtraction(),
      rule: {
        type: "condition",
        field: "age",
        label: "年龄",
        operator: "greaterThanOrEqual",
        expected: { kind: "literal", value: 90 },
        valueType: "number",
        required: true,
        sourceText: "年满80周岁",
        sourceChunkIds: ["chunk-age"],
      },
    },
    "policy-verification",
    evidence,
  );

  const extractionPrompt = buildPolicyExtractionRequest(
    "policy-verification",
    evidence,
  );
  const extractionPromptInput = JSON.parse(extractionPrompt.userPrompt) as {
    allowedChunkIds?: unknown;
  };
  const alignmentPrompt = buildFieldAlignmentRequest(
    [alignmentCriterion],
    [alignmentFact],
  );
  const alignmentPromptInput = JSON.parse(alignmentPrompt.userPrompt) as {
    allowedCriterionIds?: unknown;
    allowedFactKeys?: unknown;
  };
  let mixedPolicyEvidenceRejected = false;
  try {
    buildPolicyExtractionRequest("policy-verification", [
      { ...evidence[0], policyId: "policy-other" },
    ]);
  } catch {
    mixedPolicyEvidenceRejected = true;
  }

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

  const previousApiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  const previousBaseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const previousModel = process.env.OPENAI_COMPATIBLE_MODEL;
  const previousTimeoutMs = process.env.OPENAI_COMPATIBLE_TIMEOUT_MS;
  let requestedUrl = "";
  let requestedModel = "";
  let requestedAuthorization = "";
  let chatClientOutput: unknown;
  let invalidJsonRejected = false;
  let nonSuccessRejected = false;
  let requestTimeoutRejected = false;
  let providerFailureFallback = false;
  let semanticAlignmentPassed = false;
  let crossRequestAlignmentCachePassed = false;
  let concurrentAlignmentDeduplicationPassed = false;
  let failedAlignmentRetryPassed = false;
  let batchedAlignmentRequestsPassed = false;

  try {
    process.env.OPENAI_COMPATIBLE_API_KEY = "verification-key";
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    delete process.env.OPENAI_COMPATIBLE_MODEL;
    delete process.env.OPENAI_COMPATIBLE_TIMEOUT_MS;

    const chatClient = createOpenAiChatCompletionsJsonClient({
      fetchFn: async (input, init) => {
        requestedUrl = String(input);
        requestedAuthorization = new Headers(init?.headers).get("Authorization") ?? "";
        const body = JSON.parse(String(init?.body)) as { model?: unknown };
        requestedModel = typeof body.model === "string" ? body.model : "";
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(validSimpleExtraction()),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });
    chatClientOutput = await chatClient.generateJson({
      task: "policy-criteria-extraction",
      schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
      systemPrompt: "只输出 JSON",
      userPrompt: "验证",
    });

    const semanticCriterion: PolicyCriterion = {
      id: "semantic-hukou-type",
      policyId: "policy-verification",
      concept: "currentHukouType",
      label: "户籍登记类型",
      operator: "equals",
      expectedValue: "北京市城镇户籍家庭",
      valueType: "string",
      required: true,
      fieldAliases: ["户籍登记类型"],
      missingFieldLabel: "户籍登记类型",
      evidence: {
        chunkId: "chunk-age",
        quote: "本市城镇户籍家庭",
        sourceUrl: "https://example.invalid/policy",
      },
    };
    const semanticFacts: ResidentFact[] = [
      {
        residentId: "resident-verification",
        key: "register_area",
        label: "户籍登记地区",
        value: "北京市城镇户籍家庭",
        valueType: "string",
        aliases: ["户籍"],
      },
    ];
    const semanticAligner = createLlmAssistedFieldAligner({
      client: {
        async generateJson() {
          return {
            schemaVersion: "field-alignment-v1",
            mappings: [
              {
                criterionId: semanticCriterion.id,
                factKey: "register_area",
                confidence: 0.9,
                rationale: "户籍登记类型与户籍登记地区属于同一业务字段",
              },
            ],
            unresolved: [],
          };
        },
      },
    });
    const semanticAlignment = await semanticAligner.alignField(
      semanticCriterion,
      semanticFacts,
    );
    semanticAlignmentPassed =
      semanticAlignment.factKey === "register_area" &&
      semanticAlignment.method === "semantic-fallback" &&
      semanticAlignment.confidence === 0.9;

    const firstCacheFacts: ResidentFact[] = [
      {
        ...semanticFacts[0],
        residentId: "cache-resident-first",
        value: "缓存值甲",
      },
    ];
    const secondCacheFacts: ResidentFact[] = [
      {
        ...semanticFacts[0],
        residentId: "cache-resident-second",
        value: "缓存值乙",
      },
    ];
    let cacheClientCalls = 0;
    let cacheRequestPrompt = "";
    const cacheClient: LlmJsonClient = {
      async generateJson(request) {
        cacheClientCalls += 1;
        cacheRequestPrompt = request.userPrompt;
        return {
          schemaVersion: "field-alignment-v1",
          mappings: [
            {
              criterionId: semanticCriterion.id,
              factKey: "register_area",
              confidence: 0.91,
              rationale: "户籍登记类型与户籍登记地区属于同一业务字段",
            },
          ],
          unresolved: [],
        };
      },
    };
    const firstCachedAligner =
      await createPreparedLlmAssistedFieldAligner(
        [semanticCriterion],
        firstCacheFacts,
        { client: cacheClient },
      );
    const firstCachedAlignment = await firstCachedAligner.alignField(
      semanticCriterion,
      firstCacheFacts,
    );
    const secondCachedAligner =
      await createPreparedLlmAssistedFieldAligner(
        [semanticCriterion],
        secondCacheFacts,
        { client: cacheClient },
      );
    const secondCachedAlignment = await secondCachedAligner.alignField(
      semanticCriterion,
      secondCacheFacts,
    );
    crossRequestAlignmentCachePassed =
      cacheClientCalls === 1 &&
      firstCachedAlignment.factKey === "register_area" &&
      secondCachedAlignment.factKey === "register_area" &&
      !cacheRequestPrompt.includes("cache-resident-first") &&
      !cacheRequestPrompt.includes("cache-resident-second") &&
      !cacheRequestPrompt.includes("缓存值甲") &&
      !cacheRequestPrompt.includes("缓存值乙") &&
      !cacheRequestPrompt.includes("verification-key");

    const batchCriteria = Array.from({ length: 41 }, (_, index) => ({
      ...semanticCriterion,
      id: `semantic-hukou-type-batch-${index}`,
      label: `户籍登记类型${index}`,
    }));
    let batchClientCalls = 0;
    let largestBatchSize = 0;
    const batchClient: LlmJsonClient = {
      async generateJson(request) {
        batchClientCalls += 1;
        const input = JSON.parse(request.userPrompt) as {
          criteria: Array<{ criterionId: string }>;
        };
        largestBatchSize = Math.max(
          largestBatchSize,
          input.criteria.length,
        );
        return {
          schemaVersion: "field-alignment-v1",
          mappings: input.criteria.map((criterion) => ({
            criterionId: criterion.criterionId,
            factKey: "register_area",
            confidence: 0.94,
            rationale: "户籍登记类型与户籍登记地区属于同一业务字段",
          })),
          unresolved: [],
        };
      },
    };
    const batchedAligner = await createPreparedLlmAssistedFieldAligner(
      batchCriteria,
      semanticFacts,
      { client: batchClient },
    );
    const batchedAlignment = await batchedAligner.alignField(
      batchCriteria[40],
      semanticFacts,
    );
    batchedAlignmentRequestsPassed =
      batchClientCalls === 2 &&
      largestBatchSize === 40 &&
      batchedAlignment.factKey === "register_area";

    const concurrentCriterion: PolicyCriterion = {
      ...semanticCriterion,
      id: "semantic-hukou-type-concurrent",
    };
    const concurrentFacts: ResidentFact[] = [
      {
        ...semanticFacts[0],
        residentId: "concurrent-resident",
        value: "并发缓存值",
      },
    ];
    let concurrentClientCalls = 0;
    let releaseConcurrentResponse: (value: unknown) => void = () => undefined;
    const concurrentResponse = new Promise<unknown>((resolve) => {
      releaseConcurrentResponse = resolve;
    });
    const concurrentClient: LlmJsonClient = {
      async generateJson() {
        concurrentClientCalls += 1;
        return await concurrentResponse;
      },
    };
    const firstConcurrentAlignerPromise =
      createPreparedLlmAssistedFieldAligner(
        [concurrentCriterion],
        concurrentFacts,
        { client: concurrentClient },
      );
    const secondConcurrentAlignerPromise =
      createPreparedLlmAssistedFieldAligner(
        [concurrentCriterion],
        concurrentFacts,
        { client: concurrentClient },
      );
    await Promise.resolve();
    const oneCallBeforeRelease = concurrentClientCalls === 1;
    releaseConcurrentResponse({
      schemaVersion: "field-alignment-v1",
      mappings: [
        {
          criterionId: concurrentCriterion.id,
          factKey: "register_area",
          confidence: 0.92,
          rationale: "户籍登记类型与户籍登记地区属于同一业务字段",
        },
      ],
      unresolved: [],
    });
    const [firstConcurrentAligner, secondConcurrentAligner] =
      await Promise.all([
        firstConcurrentAlignerPromise,
        secondConcurrentAlignerPromise,
      ]);
    const [firstConcurrentAlignment, secondConcurrentAlignment] =
      await Promise.all([
        firstConcurrentAligner.alignField(
          concurrentCriterion,
          concurrentFacts,
        ),
        secondConcurrentAligner.alignField(
          concurrentCriterion,
          concurrentFacts,
        ),
      ]);
    concurrentAlignmentDeduplicationPassed =
      oneCallBeforeRelease &&
      concurrentClientCalls === 1 &&
      firstConcurrentAlignment.factKey === "register_area" &&
      secondConcurrentAlignment.factKey === "register_area";

    const retryCriterion: PolicyCriterion = {
      ...semanticCriterion,
      id: "semantic-hukou-type-retry",
    };
    const retryFacts: ResidentFact[] = [
      {
        ...semanticFacts[0],
        residentId: "retry-resident",
        value: "失败重试值",
      },
    ];
    let retryClientCalls = 0;
    const retryClient: LlmJsonClient = {
      async generateJson() {
        retryClientCalls += 1;
        if (retryClientCalls === 1) {
          throw new Error("模拟字段对齐服务失败");
        }
        return {
          schemaVersion: "field-alignment-v1",
          mappings: [
            {
              criterionId: retryCriterion.id,
              factKey: "register_area",
              confidence: 0.93,
              rationale: "户籍登记类型与户籍登记地区属于同一业务字段",
            },
          ],
          unresolved: [],
        };
      },
    };
    const expectedDictionaryFallback = alignCriterionToFacts(
      retryCriterion,
      retryFacts,
    );
    const failedPreparedAligner =
      await createPreparedLlmAssistedFieldAligner(
        [retryCriterion],
        retryFacts,
        { client: retryClient },
      );
    const failedAlignment = await failedPreparedAligner.alignField(
      retryCriterion,
      retryFacts,
    );
    const retriedPreparedAligner =
      await createPreparedLlmAssistedFieldAligner(
        [retryCriterion],
        retryFacts,
        { client: retryClient },
      );
    const retriedAlignment = await retriedPreparedAligner.alignField(
      retryCriterion,
      retryFacts,
    );
    failedAlignmentRetryPassed =
      retryClientCalls === 2 &&
      failedAlignment.factKey === expectedDictionaryFallback.factKey &&
      failedAlignment.confidence === expectedDictionaryFallback.confidence &&
      failedAlignment.method === expectedDictionaryFallback.method &&
      retriedAlignment.factKey === "register_area" &&
      retriedAlignment.method === "semantic-fallback";

    const invalidJsonClient = createOpenAiChatCompletionsJsonClient({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "```json\n{}\n```" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });
    try {
      await invalidJsonClient.generateJson({
        task: "policy-criteria-extraction",
        schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
        systemPrompt: "只输出 JSON",
        userPrompt: "验证",
      });
    } catch {
      invalidJsonRejected = true;
    }

    const nonSuccessClient = createOpenAiChatCompletionsJsonClient({
      fetchFn: async () =>
        new Response(
          JSON.stringify({ error: { message: "verification failure" } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
    });
    try {
      await nonSuccessClient.generateJson({
        task: "policy-criteria-extraction",
        schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
        systemPrompt: "只输出 JSON",
        userPrompt: "验证",
      });
    } catch {
      nonSuccessRejected = true;
    }

    let providerFailureFallbackReason = "";
    const providerFailureCriteria =
      await createOpenAiChatPolicyCriterionExtractor({
        fetchFn: async () =>
          new Response(
            JSON.stringify({ error: { message: "verification failure" } }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
        onFallback(reason) {
          providerFailureFallbackReason = reason;
        },
      }).extractCriteria("policy-verification", evidence);
    providerFailureFallback =
      providerFailureFallbackReason.includes("HTTP 503") &&
      providerFailureCriteria.length === expectedFallback.length;

    const timeoutClient = createOpenAiChatCompletionsJsonClient({
      timeoutMs: 1,
      fetchFn: async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    });
    try {
      await timeoutClient.generateJson({
        task: "policy-criteria-extraction",
        schemaVersion: POLICY_EXTRACTION_SCHEMA_VERSION,
        systemPrompt: "只输出 JSON",
        userPrompt: "验证",
      });
    } catch {
      requestTimeoutRejected = true;
    }
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_COMPATIBLE_API_KEY;
    } else {
      process.env.OPENAI_COMPATIBLE_API_KEY = previousApiKey;
    }
    if (previousBaseUrl === undefined) {
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    } else {
      process.env.OPENAI_COMPATIBLE_BASE_URL = previousBaseUrl;
    }
    if (previousModel === undefined) {
      delete process.env.OPENAI_COMPATIBLE_MODEL;
    } else {
      process.env.OPENAI_COMPATIBLE_MODEL = previousModel;
    }
    if (previousTimeoutMs === undefined) {
      delete process.env.OPENAI_COMPATIBLE_TIMEOUT_MS;
    } else {
      process.env.OPENAI_COMPATIBLE_TIMEOUT_MS = previousTimeoutMs;
    }
  }

  return [
    { name: "简单政策条件输出通过严格校验", passed: validExtraction.ok },
    { name: "复合、否定、例外和动态标准可以表达", passed: complexExtraction.ok },
    { name: "模型资格结论字段会被拒绝", passed: !forbiddenDecision.ok },
    { name: "缺少政策证据引用会被拒绝", passed: !missingEvidence.ok },
    { name: "未知操作符会被拒绝", passed: !unknownOperator.ok },
    { name: "字段语义对齐输出通过严格校验", passed: validAlignment.ok },
    {
      name: "政策条件必须闭包于本次政策证据",
      passed: validEvidenceClosure.ok,
    },
    {
      name: "模型伪造的政策 chunkId 会被拒绝",
      passed: !inventedChunkId.ok,
    },
    {
      name: "改写或概括后的政策引文会被拒绝",
      passed: !paraphrasedQuote.ok,
    },
    {
      name: "原文没有明示的数值门槛会被拒绝",
      passed: !inferredThreshold.ok,
    },
    {
      name: "不同政策的证据不能混入同一次提取",
      passed: mixedPolicyEvidenceRejected,
    },
    {
      name: "政策提取 Prompt 声明证据闭包和提示注入边界",
      passed:
        extractionPrompt.systemPrompt.includes("证据闭包") &&
        extractionPrompt.systemPrompt.includes("提示注入") &&
        extractionPrompt.systemPrompt.includes("证据互相冲突") &&
        extractionPrompt.systemPrompt.includes("unresolved") &&
        Array.isArray(extractionPromptInput.allowedChunkIds) &&
        extractionPromptInput.allowedChunkIds.includes("chunk-age"),
    },
    {
      name: "字段对齐只允许输入中的 criterionId 和 factKey",
      passed:
        alignmentPrompt.systemPrompt.includes("提示注入") &&
        alignmentPrompt.systemPrompt.includes("存在多个同等合理候选") &&
        Array.isArray(alignmentPromptInput.allowedCriterionIds) &&
        alignmentPromptInput.allowedCriterionIds.includes("criterion-age") &&
        Array.isArray(alignmentPromptInput.allowedFactKeys) &&
        alignmentPromptInput.allowedFactKeys.includes("resident_age") &&
        validScopedAlignment.ok,
    },
    {
      name: "模型伪造的居民 factKey 会被拒绝",
      passed: !inventedFactKey.ok,
    },
    {
      name: "字段对齐不得遗漏输入 criterionId",
      passed: !missingCriterionMapping.ok,
    },
    {
      name: "字段对齐理由中的居民资格结论会被拒绝",
      passed: !alignmentDecision.ok,
    },
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
    {
      name: "Chat Completions 客户端使用冻结的默认地址和模型",
      passed:
        requestedUrl ===
          "https://api.openai-next.com/v1/chat/completions" &&
        requestedModel === "gpt-5.6-terra" &&
        requestedAuthorization === "Bearer verification-key" &&
        validatePolicyExtraction(chatClientOutput).ok,
    },
    {
      name: "Chat Completions 客户端拒绝 Markdown 包裹的伪 JSON",
      passed: invalidJsonRejected,
    },
    {
      name: "Chat Completions 客户端拒绝非 2xx 响应",
      passed: nonSuccessRejected,
    },
    {
      name: "Chat Completions 服务异常会回退本地条件提取器",
      passed: providerFailureFallback,
    },
    {
      name: "Chat Completions 请求超时会被中止",
      passed: requestTimeoutRejected,
    },
    {
      name: "词典不能确定时可由 LLM 安全补充字段语义对齐",
      passed: semanticAlignmentPassed,
    },
    {
      name: "相同字段元数据跨请求复用成功缓存且不发送居民值",
      passed: crossRequestAlignmentCachePassed,
    },
    {
      name: "并发相同字段对齐请求共享一次模型调用",
      passed: concurrentAlignmentDeduplicationPassed,
    },
    {
      name: "字段对齐失败回退本地词典且下次请求会重试",
      passed: failedAlignmentRetryPassed,
    },
    {
      name: "大批量字段对齐会拆分为有界模型请求",
      passed: batchedAlignmentRequestsPassed,
    },
  ];
}
