import { env } from "node:process";

import type { PolicyCriterionExtractor } from "./integration-contracts";
import type { LlmJsonClient, LlmJsonRequest } from "./llm-contracts";
import { createLlmPolicyCriterionExtractor } from "./llm-policy-extractor";

export const DEFAULT_OPENAI_COMPATIBLE_BASE_URL =
  "https://api.openai-next.com/v1";
export const DEFAULT_OPENAI_COMPATIBLE_MODEL = "gpt-5.6-terra";
export const OPENAI_CHAT_COMPLETIONS_ENDPOINT = "/chat/completions";

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const MAX_ERROR_DETAIL_LENGTH = 300;

export interface OpenAiChatCompletionsClientOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export interface OpenAiChatPolicyExtractorOptions
  extends OpenAiChatCompletionsClientOptions {
  fallback?: PolicyCriterionExtractor;
  onFallback?: (reason: string) => void;
}

interface OpenAiChatCompletionsConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("LLM 客户端只能在服务端运行");
  }
}

function readRequiredApiKey() {
  const apiKey = env.OPENAI_COMPATIBLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("未配置 OPENAI_COMPATIBLE_API_KEY");
  }
  return apiKey;
}

function readTimeoutMs(override?: number) {
  const rawValue = override ?? env.OPENAI_COMPATIBLE_TIMEOUT_MS;
  if (rawValue === undefined) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  const timeoutMs =
    typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("OPENAI_COMPATIBLE_TIMEOUT_MS 必须是正整数");
  }
  return timeoutMs;
}

function normalizeBaseUrl(value: string) {
  const baseUrl = value.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("OPENAI_COMPATIBLE_BASE_URL 不是有效 URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("OPENAI_COMPATIBLE_BASE_URL 只支持 HTTP 或 HTTPS");
  }
  return baseUrl;
}

function readConfig(
  options: OpenAiChatCompletionsClientOptions,
): OpenAiChatCompletionsConfig {
  assertServerRuntime();
  const model =
    env.OPENAI_COMPATIBLE_MODEL?.trim() || DEFAULT_OPENAI_COMPATIBLE_MODEL;
  return {
    apiKey: readRequiredApiKey(),
    baseUrl: normalizeBaseUrl(
      env.OPENAI_COMPATIBLE_BASE_URL ?? DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
    ),
    model,
    timeoutMs: readTimeoutMs(options.timeoutMs),
  };
}

function buildEndpoint(baseUrl: string) {
  return `${baseUrl}${OPENAI_CHAT_COMPLETIONS_ENDPOINT}`;
}

function readCompletionContent(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new Error("LLM 响应缺少 choices 数组");
  }
  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("LLM 响应缺少 choices[0].message");
  }
  const content = firstChoice.message.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("LLM 响应缺少可解析的文本内容");
  }
  return content.trim();
}

function parseStrictJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("LLM 未返回严格 JSON，已拒绝该输出");
  }
}

function compactErrorDetail(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_DETAIL_LENGTH);
}

async function readProviderError(response: Response) {
  const text = await response.text();
  if (!text) {
    return "";
  }
  try {
    const payload = JSON.parse(text) as unknown;
    if (
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.message === "string"
    ) {
      return compactErrorDetail(payload.error.message);
    }
  } catch {
    // 非 JSON 错误页只返回经过压缩和截断的安全摘要。
  }
  return compactErrorDetail(text);
}

function requestBody(request: LlmJsonRequest, model: string) {
  return {
    model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
  };
}

export function createOpenAiChatCompletionsJsonClient(
  options: OpenAiChatCompletionsClientOptions = {},
): LlmJsonClient {
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async generateJson(request) {
      const config = readConfig(options);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetchFn(buildEndpoint(config.baseUrl), {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody(request, config.model)),
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await readProviderError(response);
          throw new Error(
            `LLM 服务返回 HTTP ${response.status}${detail ? `：${detail}` : ""}`,
          );
        }

        let payload: unknown;
        try {
          payload = (await response.json()) as unknown;
        } catch {
          throw new Error("LLM 服务返回的响应不是有效 JSON");
        }

        return parseStrictJson(readCompletionContent(payload));
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error(`LLM 请求超过 ${config.timeoutMs}ms，已自动回退`);
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function createOpenAiChatPolicyCriterionExtractor(
  options: OpenAiChatPolicyExtractorOptions = {},
): PolicyCriterionExtractor {
  return createLlmPolicyCriterionExtractor({
    client: createOpenAiChatCompletionsJsonClient({
      fetchFn: options.fetchFn,
      timeoutMs: options.timeoutMs,
    }),
    fallback: options.fallback,
    onFallback: options.onFallback,
  });
}
