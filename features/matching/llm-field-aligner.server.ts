import type {
  FieldAligner,
  FieldAlignment,
  PolicyCriterion,
  ResidentFact,
} from "./integration-contracts";
import { alignCriterionToFacts } from "./field-aligner";
import { createOpenAiChatCompletionsJsonClient } from "./llm-openai-chat-client.server";
import type { LlmJsonClient } from "./llm-contracts";
import { validateFieldAlignmentOutputForInputs } from "./llm-output-validator";
import { buildFieldAlignmentRequest } from "./llm-prompts";

const LLM_ALIGNMENT_MIN_DICTIONARY_CONFIDENCE = 0.55;
const LLM_ALIGNMENT_ACCEPT_CONFIDENCE = 0.75;
const LLM_ALIGNMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LLM_ALIGNMENT_CACHE_MAX_ENTRIES = 128;
const LLM_ALIGNMENT_CACHE_SCHEMA_VERSION = "field-alignment-cache-v1";
const LLM_ALIGNMENT_BATCH_SIZE = 40;

interface CachedFieldMapping {
  criterionId: string;
  factKey: string | null;
  confidence: number;
}

interface CachedAlignmentPlan {
  mappings: readonly CachedFieldMapping[];
}

interface SuccessfulCacheEntry {
  expiresAt: number;
  plan: CachedAlignmentPlan;
}

interface AlignmentCacheStore {
  successful: Map<string, SuccessfulCacheEntry>;
  inFlight: Map<string, Promise<CachedAlignmentPlan | null>>;
}

const defaultAlignmentCache = createAlignmentCacheStore();
const customClientAlignmentCaches = new WeakMap<
  LlmJsonClient,
  AlignmentCacheStore
>();

function createAlignmentCacheStore(): AlignmentCacheStore {
  return {
    successful: new Map(),
    inFlight: new Map(),
  };
}

function sortedUniqueStrings(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right),
  );
}

function uniqueFacts(facts: ResidentFact[]) {
  return Array.from(new Map(facts.map((fact) => [fact.key, fact])).values());
}

function canonicalCriteria(criteria: PolicyCriterion[]) {
  return uniqueCriteria(criteria)
    .map((criterion) => ({
      ...criterion,
      fieldAliases: sortedUniqueStrings(criterion.fieldAliases),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function canonicalFacts(facts: ResidentFact[]) {
  return uniqueFacts(facts)
    .map((fact) => ({
      ...fact,
      aliases: sortedUniqueStrings(fact.aliases ?? []),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function cacheKey(criteria: PolicyCriterion[], facts: ResidentFact[]) {
  return JSON.stringify({
    schemaVersion: LLM_ALIGNMENT_CACHE_SCHEMA_VERSION,
    criteria: criteria.map((criterion) => ({
      criterionId: criterion.id,
      policyId: criterion.policyId,
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
  });
}

function cacheStoreFor(client: LlmJsonClient | undefined) {
  if (!client) return defaultAlignmentCache;
  const existing = customClientAlignmentCaches.get(client);
  if (existing) return existing;
  const created = createAlignmentCacheStore();
  customClientAlignmentCaches.set(client, created);
  return created;
}

function readSuccessfulPlan(store: AlignmentCacheStore, key: string) {
  const entry = store.successful.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.successful.delete(key);
    return null;
  }
  store.successful.delete(key);
  store.successful.set(key, entry);
  return entry.plan;
}

function writeSuccessfulPlan(
  store: AlignmentCacheStore,
  key: string,
  plan: CachedAlignmentPlan,
) {
  store.successful.delete(key);
  store.successful.set(key, {
    expiresAt: Date.now() + LLM_ALIGNMENT_CACHE_TTL_MS,
    plan,
  });
  while (store.successful.size > LLM_ALIGNMENT_CACHE_MAX_ENTRIES) {
    const oldestKey = store.successful.keys().next().value;
    if (typeof oldestKey !== "string") break;
    store.successful.delete(oldestKey);
  }
}

function toCachedAlignmentPlan(
  mappings: Array<{
    criterionId: string;
    factKey: string | null;
    confidence: number;
  }>,
): CachedAlignmentPlan {
  // 只保留字段映射元数据；居民字段值、residentId、API Key 和资格结果均不入缓存。
  return {
    mappings: mappings.map(({ criterionId, factKey, confidence }) => ({
      criterionId,
      factKey,
      confidence,
    })),
  };
}

function criterionBatches(criteria: PolicyCriterion[]) {
  return Array.from(
    { length: Math.ceil(criteria.length / LLM_ALIGNMENT_BATCH_SIZE) },
    (_, index) =>
      criteria.slice(
        index * LLM_ALIGNMENT_BATCH_SIZE,
        (index + 1) * LLM_ALIGNMENT_BATCH_SIZE,
      ),
  );
}

function loadAlignmentPlan(
  criteria: PolicyCriterion[],
  facts: ResidentFact[],
  client: LlmJsonClient,
  store: AlignmentCacheStore,
) {
  const key = cacheKey(criteria, facts);
  const cached = readSuccessfulPlan(store, key);
  if (cached) return Promise.resolve(cached);

  const inFlight = store.inFlight.get(key);
  if (inFlight) return inFlight;

  const requestPromise = Promise.resolve().then(async () => {
    const validatedBatches = await Promise.all(
      criterionBatches(criteria).map(async (batch) => {
        const output = await client.generateJson(
          buildFieldAlignmentRequest(batch, facts),
        );
        const validation = validateFieldAlignmentOutputForInputs(
          output,
          batch,
          facts,
        );
        return validation.ok ? validation.value.mappings : null;
      }),
    );
    if (validatedBatches.some((batch) => batch === null)) return null;

    const mappings = validatedBatches.flatMap((batch) => batch ?? []);
    const plan = toCachedAlignmentPlan(mappings);
    writeSuccessfulPlan(store, key, plan);
    return plan;
  });
  const trackedPromise = requestPromise.finally(() => {
    if (store.inFlight.get(key) === trackedPromise) {
      store.inFlight.delete(key);
    }
  });
  store.inFlight.set(key, trackedPromise);
  return trackedPromise;
}

function unresolvedAlignment(
  criterion: PolicyCriterion,
  confidence: number,
): FieldAlignment {
  return {
    criterionId: criterion.id,
    factKey: null,
    confidence,
    method: "unresolved",
  };
}

function hasCompatibleValueType(
  criterion: PolicyCriterion,
  fact: ResidentFact,
) {
  return (
    criterion.valueType === fact.valueType ||
    (criterion.concept === "age" && fact.valueType === "date")
  );
}

export interface LlmAssistedFieldAlignerOptions {
  client?: LlmJsonClient;
}

function canCallLlm(options: LlmAssistedFieldAlignerOptions) {
  return Boolean(
    options.client || process.env.OPENAI_COMPATIBLE_API_KEY?.trim(),
  );
}

function fallbackAligner(): FieldAligner {
  return {
    async alignField(criterion, facts) {
      return alignCriterionToFacts(criterion, facts);
    },
  };
}

function uniqueCriteria(criteria: PolicyCriterion[]) {
  return Array.from(
    new Map(criteria.map((criterion) => [criterion.id, criterion])).values(),
  );
}

/**
 * 在业务请求开始时批量准备或复用字段语义映射，后续资格计算只读取已校验
 * 映射并执行确定性规则。模型看不到居民字段值，也不能输出资格结论。
 */
export async function createPreparedLlmAssistedFieldAligner(
  criteria: PolicyCriterion[],
  facts: ResidentFact[],
  options: LlmAssistedFieldAlignerOptions = {},
): Promise<FieldAligner> {
  const scopedCriteria = canonicalCriteria(criteria);
  const scopedFacts = canonicalFacts(facts);
  const dictionaryFallback = fallbackAligner();
  if (scopedCriteria.length === 0 || !canCallLlm(options)) {
    return dictionaryFallback;
  }

  const client = options.client ?? createOpenAiChatCompletionsJsonClient();
  try {
    const plan = await loadAlignmentPlan(
      scopedCriteria,
      scopedFacts,
      client,
      cacheStoreFor(options.client),
    );
    if (!plan) return dictionaryFallback;

    const mappings = new Map(
      plan.mappings.map((mapping) => [mapping.criterionId, mapping]),
    );
    const prepared = new Map<string, FieldAlignment>();

    for (const criterion of scopedCriteria) {
      const dictionaryAlignment = alignCriterionToFacts(
        criterion,
        scopedFacts,
      );
      const mapping = mappings.get(criterion.id);
      const mappedFact = mapping?.factKey
        ? scopedFacts.find((fact) => fact.key === mapping.factKey)
        : null;

      if (
        !mapping ||
        !mappedFact ||
        mapping.confidence < LLM_ALIGNMENT_ACCEPT_CONFIDENCE ||
        !hasCompatibleValueType(criterion, mappedFact) ||
        (dictionaryAlignment.factKey !== null &&
          dictionaryAlignment.factKey !== mappedFact.key)
      ) {
        prepared.set(criterion.id, dictionaryAlignment);
        continue;
      }

      prepared.set(criterion.id, {
        criterionId: criterion.id,
        factKey: mappedFact.key,
        confidence: mapping.confidence,
        method: "semantic-fallback",
      });
    }

    return {
      async alignField(criterion, currentFacts) {
        const alignment = prepared.get(criterion.id);
        if (!alignment?.factKey) {
          return alignCriterionToFacts(criterion, currentFacts);
        }
        const currentFact = currentFacts.find(
          (fact) => fact.key === alignment.factKey,
        );
        if (!currentFact || !hasCompatibleValueType(criterion, currentFact)) {
          return alignCriterionToFacts(criterion, currentFacts);
        }
        return alignment;
      },
    };
  } catch {
    return dictionaryFallback;
  }
}

export function createLlmAssistedFieldAligner(
  options: LlmAssistedFieldAlignerOptions = {},
): FieldAligner {
  const client = options.client ?? createOpenAiChatCompletionsJsonClient();
  const cacheStore = cacheStoreFor(options.client);

  return {
    async alignField(criterion, facts) {
      const dictionaryAlignment = alignCriterionToFacts(criterion, facts);
      if (dictionaryAlignment.factKey) return dictionaryAlignment;
      if (
        dictionaryAlignment.confidence <
          LLM_ALIGNMENT_MIN_DICTIONARY_CONFIDENCE ||
        !canCallLlm(options)
      ) {
        return dictionaryAlignment;
      }

      try {
        const scopedCriteria = canonicalCriteria([criterion]);
        const scopedFacts = canonicalFacts(facts);
        const plan = await loadAlignmentPlan(
          scopedCriteria,
          scopedFacts,
          client,
          cacheStore,
        );
        if (!plan) return dictionaryAlignment;
        const mapping = plan.mappings.find(
          (item) => item.criterionId === criterion.id,
        );
        const mappedFact = mapping?.factKey
          ? facts.find((fact) => fact.key === mapping.factKey)
          : null;
        if (
          !mapping ||
          !mappedFact ||
          !hasCompatibleValueType(criterion, mappedFact) ||
          mapping.confidence < LLM_ALIGNMENT_ACCEPT_CONFIDENCE
        ) {
          const unresolved = unresolvedAlignment(
            criterion,
            mapping?.confidence ?? dictionaryAlignment.confidence,
          );
          return unresolved;
        }
        return {
          criterionId: criterion.id,
          factKey: mappedFact.key,
          confidence: mapping.confidence,
          method: "semantic-fallback",
        };
      } catch {
        return dictionaryAlignment;
      }
    },
  };
}
