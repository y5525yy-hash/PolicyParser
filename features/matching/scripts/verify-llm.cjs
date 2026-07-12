/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const { workspaceRoot } = require("./register-typescript.cjs");

const {
  createOpenAiChatCompletionsJsonClient,
  DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
  DEFAULT_OPENAI_COMPATIBLE_MODEL,
  OPENAI_CHAT_COMPLETIONS_ENDPOINT,
} = require("@/features/matching/llm-openai-chat-client.server");
const {
  FIELD_ALIGNMENT_SCHEMA_VERSION,
} = require("@/features/matching/llm-contracts");
const {
  validateFieldAlignmentOutputForInputs,
} = require("@/features/matching/llm-output-validator");
const {
  buildFieldAlignmentRequest,
} = require("@/features/matching/llm-prompts");
const {
  runLlmPreparationVerification,
} = require("@/features/matching/llm-verification");

const SCHEMA_VERSION = "llm-verification-v1";
const REQUIRED_MODEL = "gpt-5.6-terra";
const DEFAULT_TIMEOUT_MS = 20000;
const envFilePath = path.join(workspaceRoot, ".env.local");

let envFileLoaded = false;
let envFileError = "";
if (fs.existsSync(envFilePath)) {
  try {
    process.loadEnvFile(envFilePath);
    envFileLoaded = true;
  } catch {
    envFileError = "无法读取本机 .env.local，请检查文件格式和读取权限。";
  }
}

const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim() ?? "";
const baseUrl =
  process.env.OPENAI_COMPATIBLE_BASE_URL?.trim() ||
  DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
const model =
  process.env.OPENAI_COMPATIBLE_MODEL?.trim() || DEFAULT_OPENAI_COMPATIBLE_MODEL;
const timeoutText =
  process.env.OPENAI_COMPATIBLE_TIMEOUT_MS?.trim() ||
  String(DEFAULT_TIMEOUT_MS);
const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
const endpoint = `${normalizedBaseUrl}${OPENAI_CHAT_COMPLETIONS_ENDPOINT}`;
let localVerification = null;

function sanitizedMessage(error) {
  const value = error instanceof Error ? error.message : String(error);
  return value
    .replaceAll(apiKey, "[REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]");
}

function classifyFailure(message) {
  if (message.includes("未配置 OPENAI_COMPATIBLE_API_KEY")) {
    return { category: "missing_config", exitCode: 2 };
  }
  if (
    message.includes("OPENAI_COMPATIBLE_BASE_URL") ||
    message.includes("OPENAI_COMPATIBLE_TIMEOUT_MS")
  ) {
    return { category: "configuration_error", exitCode: 2 };
  }
  if (message.includes("LLM 服务返回 HTTP")) {
    return { category: "api_error", exitCode: 4 };
  }
  if (
    message.includes("LLM 响应") ||
    message.includes("严格 JSON") ||
    message.includes("模型输出")
  ) {
    return { category: "response_validation_error", exitCode: 5 };
  }
  return { category: "network_error", exitCode: 3 };
}

function writeResult(result, exitCode = 0) {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        config: {
          apiKeyConfigured: Boolean(apiKey),
          baseUrl: normalizedBaseUrl,
          endpoint,
          model,
          timeoutMs: Number(timeoutText),
          envFileLoaded,
        },
        localVerification,
        ...result,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = exitCode;
}

async function run() {
  const localCases = await runLlmPreparationVerification();
  localVerification = {
    total: localCases.length,
    passed: localCases.filter((item) => item.passed).length,
    failed: localCases.filter((item) => !item.passed).map((item) => item.name),
  };
  if (localVerification.failed.length > 0) {
    writeResult(
      {
        ok: false,
        category: "local_verification_error",
        message: "LLM 本地适配器或安全回退验证失败。",
      },
      1,
    );
    return;
  }

  if (envFileError) {
    writeResult(
      {
        ok: false,
        category: "configuration_error",
        message: envFileError,
      },
      2,
    );
    return;
  }

  if (!apiKey) {
    writeResult(
      {
        ok: false,
        category: "missing_config",
        message:
          "未配置 OPENAI_COMPATIBLE_API_KEY；请通过进程环境变量或本机 .env.local 提供。",
      },
      2,
    );
    return;
  }

  if (model !== REQUIRED_MODEL) {
    writeResult(
      {
        ok: false,
        category: "configuration_error",
        message: `本验证脚本只测试 ${REQUIRED_MODEL}，当前配置为 ${model}。`,
      },
      2,
    );
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedBaseUrl);
  } catch {
    writeResult(
      {
        ok: false,
        category: "configuration_error",
        message: "OPENAI_COMPATIBLE_BASE_URL 不是有效 URL。",
      },
      2,
    );
    return;
  }
  if (!new Set(["http:", "https:"]).has(parsedUrl.protocol)) {
    writeResult(
      {
        ok: false,
        category: "configuration_error",
        message: "OPENAI_COMPATIBLE_BASE_URL 只支持 HTTP 或 HTTPS。",
      },
      2,
    );
    return;
  }

  const timeoutMs = Number(timeoutText);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    writeResult(
      {
        ok: false,
        category: "configuration_error",
        message: "OPENAI_COMPATIBLE_TIMEOUT_MS 必须是正整数。",
      },
      2,
    );
    return;
  }

  const criteria = [
    {
      id: "criterion-student-status",
      policyId: "verification-policy",
      concept: "isStudent",
      label: "是否为在校学生",
      operator: "equals",
      expectedValue: false,
      valueType: "boolean",
      required: true,
      fieldAliases: ["是否为在校学生", "在校状态", "学籍状态"],
      missingFieldLabel: "在校学生身份",
      evidence: {
        chunkId: "verification-chunk",
        quote: "不含在校学生",
        sourceUrl: "https://example.invalid/policy",
      },
    },
  ];
  const facts = [
    {
      residentId: "verification-resident",
      key: "学籍在册标志",
      label: "当前是否保留在校学籍",
      value: false,
      valueType: "boolean",
      aliases: ["在读状态标志", "学籍有效状态"],
    },
    {
      residentId: "verification-resident",
      key: "非在校生标志",
      label: "当前是否属于非在校学生",
      value: true,
      valueType: "boolean",
      aliases: ["离校状态标志", "不在校标志"],
    },
    {
      residentId: "verification-resident",
      key: "学生资助对象标志",
      label: "是否属于学生资助范围",
      value: false,
      valueType: "boolean",
      aliases: ["教育资助身份"],
    },
  ];
  const client = createOpenAiChatCompletionsJsonClient({ timeoutMs });

  let response;
  try {
    response = await client.generateJson(
      buildFieldAlignmentRequest(criteria, facts),
    );
  } catch (error) {
    const message = sanitizedMessage(error);
    const failure = classifyFailure(message);
    writeResult(
      {
        ok: false,
        category: failure.category,
        message,
      },
      failure.exitCode,
    );
    return;
  }

  const validation = validateFieldAlignmentOutputForInputs(
    response,
    criteria,
    facts,
  );
  if (!validation.ok) {
    writeResult(
      {
        ok: false,
        category: "schema_validation_error",
        message: "模型已响应，但结构化输出未通过本地安全校验。",
        validationErrors: validation.errors,
      },
      5,
    );
    return;
  }

  const mapping = validation.value.mappings.find(
    (item) => item.criterionId === "criterion-student-status",
  );
  const exactShape =
    validation.value.schemaVersion === FIELD_ALIGNMENT_SCHEMA_VERSION &&
    mapping?.factKey === "学籍在册标志" &&
    mapping.confidence >= 0.75;

  if (!exactShape) {
    writeResult(
      {
        ok: false,
        category: "schema_validation_error",
        message:
          "模型输出通过基础校验，但没有区分在校字段与语义相反的非在校字段。",
        validatedOutput: validation.value,
      },
      5,
    );
    return;
  }

  writeResult({
    ok: true,
    category: "success",
    message:
      "gpt-5.6-terra 已完成中文规范字段的相似语义与否定方向识别，并通过防幻觉输入白名单校验。",
    validation: {
      schemaVersion: validation.value.schemaVersion,
      criterionId: mapping.criterionId,
      factKey: mapping.factKey,
      confidence: mapping.confidence,
    },
  });
}

run().catch((error) => {
  const message = sanitizedMessage(error);
  const failure = classifyFailure(message);
  writeResult(
    {
      ok: false,
      category: failure.category,
      message,
    },
    failure.exitCode,
  );
});
