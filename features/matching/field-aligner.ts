import type {
  FieldAligner,
  FieldAlignment,
  FieldAlignmentMethod,
  PolicyCriterion,
  ResidentFact,
} from "./integration-contracts";

const DEFAULT_MIN_CONFIDENCE = 0.75;

function normalizeTerm(value: string) {
  return value.toLocaleLowerCase().replace(/[\s_\-—–·/]+/g, "");
}

function createBigrams(value: string) {
  const normalized = normalizeTerm(value);
  if (normalized.length < 2) {
    return normalized ? [normalized] : [];
  }

  return Array.from({ length: normalized.length - 1 }, (_, index) =>
    normalized.slice(index, index + 2),
  );
}

function diceSimilarity(left: string, right: string) {
  const leftBigrams = createBigrams(left);
  const rightBigrams = createBigrams(right);
  if (leftBigrams.length === 0 || rightBigrams.length === 0) {
    return 0;
  }

  const remaining = [...rightBigrams];
  let overlap = 0;
  for (const bigram of leftBigrams) {
    const index = remaining.indexOf(bigram);
    if (index >= 0) {
      overlap += 1;
      remaining.splice(index, 1);
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function isDateAliasForAge(criterion: PolicyCriterion, fact: ResidentFact) {
  return criterion.concept === "age" && fact.valueType === "date";
}

function scoreFact(
  criterion: PolicyCriterion,
  fact: ResidentFact,
): { confidence: number; method: FieldAlignmentMethod } {
  const concept = normalizeTerm(criterion.concept);
  const factKey = normalizeTerm(fact.key);
  if (concept === factKey) {
    return { confidence: 1, method: "exact" };
  }

  const criterionAliases = criterion.fieldAliases.map(normalizeTerm);
  const factTerms = [fact.key, fact.label, ...(fact.aliases ?? [])].map(
    normalizeTerm,
  );
  if (criterionAliases.some((alias) => factTerms.includes(alias))) {
    return {
      confidence: isDateAliasForAge(criterion, fact) ? 0.92 : 0.95,
      method: isDateAliasForAge(criterion, fact) ? "derived" : "alias",
    };
  }

  const semanticSimilarity = Math.max(
    ...criterion.fieldAliases.flatMap((alias) =>
      [fact.key, fact.label, ...(fact.aliases ?? [])].map((term) =>
        diceSimilarity(alias, term),
      ),
    ),
    0,
  );

  return {
    confidence: 0.45 + semanticSimilarity * 0.4,
    method: "semantic-fallback",
  };
}

export function alignCriterionToFacts(
  criterion: PolicyCriterion,
  facts: ResidentFact[],
  minConfidence = DEFAULT_MIN_CONFIDENCE,
): FieldAlignment {
  let bestFact: ResidentFact | null = null;
  let bestScore = { confidence: 0, method: "unresolved" as FieldAlignmentMethod };

  for (const fact of facts) {
    const score = scoreFact(criterion, fact);
    if (score.confidence > bestScore.confidence) {
      bestFact = fact;
      bestScore = score;
    }
  }

  if (!bestFact || bestScore.confidence < minConfidence) {
    return {
      criterionId: criterion.id,
      factKey: null,
      confidence: bestScore.confidence,
      method: "unresolved",
    };
  }

  return {
    criterionId: criterion.id,
    factKey: bestFact.key,
    confidence: bestScore.confidence,
    method: bestScore.method,
  };
}

export const dictionaryFieldAligner: FieldAligner = {
  async alignField(criterion, facts) {
    return alignCriterionToFacts(criterion, facts);
  },
};
