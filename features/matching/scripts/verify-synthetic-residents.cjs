/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const { workspaceRoot } = require("./register-typescript.cjs");

const {
  createOpenAiChatCompletionsJsonClient,
  DEFAULT_OPENAI_COMPATIBLE_MODEL,
} = require("@/features/matching/llm-openai-chat-client.server");
const {
  createSyntheticTrackingClient,
  runSyntheticResidentEvaluation,
} = require("@/features/matching/llm-resident-evaluation.server");

const SCHEMA_VERSION = "synthetic-resident-llm-verification-v1";
const REQUIRED_MODEL = "gpt-5.6-terra";
const SYNTHETIC_TIMEOUT_MS = 60000;
const envFilePath = path.join(workspaceRoot, ".env.local");

if (fs.existsSync(envFilePath)) process.loadEnvFile(envFilePath);

const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim() ?? "";
const model =
  process.env.OPENAI_COMPATIBLE_MODEL?.trim() || DEFAULT_OPENAI_COMPATIBLE_MODEL;

function sanitizedMessage(error) {
  const value = error instanceof Error ? error.message : String(error);
  return value
    .replaceAll(apiKey, "[REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]");
}

function writeResult(result, exitCode = 0) {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        config: {
          apiKeyConfigured: Boolean(apiKey),
          model,
          maximumModelRequests: 30,
          timeoutMs: SYNTHETIC_TIMEOUT_MS,
        },
        ...result,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = exitCode;
}

async function run() {
  if (!apiKey) {
    writeResult(
      {
        ok: false,
        category: "missing_config",
        message: "未配置服务端模型 Key，不能执行真实合成居民评测。",
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
        message: `本脚本要求 ${REQUIRED_MODEL}，当前配置为 ${model}。`,
      },
      2,
    );
    return;
  }

  const delegate = createOpenAiChatCompletionsJsonClient({
    timeoutMs: SYNTHETIC_TIMEOUT_MS,
  });
  const trackingClient = createSyntheticTrackingClient(delegate);
  const report = await runSyntheticResidentEvaluation(trackingClient);
  writeResult(report, report.ok ? 0 : 1);
}

run().catch((error) => {
  writeResult(
    {
      ok: false,
      category: "evaluation_error",
      message: sanitizedMessage(error),
    },
    1,
  );
});
