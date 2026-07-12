import type {
  PolicyCriterion,
  PolicyCriterionExtractor,
  PolicyEvidenceChunk,
} from "./integration-contracts";

const AGE_PATTERN = /(?:年满|年龄达到|年龄不低于)?\s*(\d{1,3})\s*周岁(?:及以上|以上)/g;
const HUKOU_PATTERN = /具有([^，。；]+?)户籍/g;
const ALLOWANCE_CHECK_PATTERN = /核实是否已经领取([^，。；]+)/g;

function createCriterionId(
  chunk: PolicyEvidenceChunk,
  concept: string,
  index: number,
) {
  return `${chunk.chunkId}:${concept}:${index}`;
}

export function extractCriteriaFromEvidence(
  policyId: string,
  evidence: PolicyEvidenceChunk[],
): PolicyCriterion[] {
  const criteria: PolicyCriterion[] = [];

  for (const chunk of evidence) {
    for (const [index, match] of Array.from(
      chunk.text.matchAll(AGE_PATTERN),
    ).entries()) {
      const age = Number(match[1]);
      criteria.push({
        id: createCriterionId(chunk, "age", index),
        policyId,
        concept: "age",
        label: "年龄",
        operator: "greaterThanOrEqual",
        expectedValue: age,
        valueType: "number",
        required: true,
        fieldAliases: [
          "age",
          "年龄",
          "resident_age",
          "birth_date",
          "birthDate",
          "出生日期",
        ],
        missingFieldLabel: "年龄",
        satisfiedReason: `年龄已满${age}周岁`,
        failedReason: `未达到${age}周岁`,
        evidence: {
          chunkId: chunk.chunkId,
          quote: match[0].trim(),
          sourceUrl: chunk.sourceUrl,
        },
      });
    }

    for (const [index, match] of Array.from(
      chunk.text.matchAll(HUKOU_PATTERN),
    ).entries()) {
      const hukou = match[1].trim();
      criteria.push({
        id: createCriterionId(chunk, "hukou", index),
        policyId,
        concept: "hukou",
        label: "户籍",
        operator: "equals",
        expectedValue: hukou,
        valueType: "string",
        required: true,
        fieldAliases: [
          "hukou",
          "户籍",
          "户籍所在地",
          "户口所在地",
          "register_area",
          "resident_registration",
        ],
        missingFieldLabel: "户籍",
        satisfiedReason: `具有${hukou}户籍`,
        failedReason: "户籍不符合",
        evidence: {
          chunkId: chunk.chunkId,
          quote: match[0].trim(),
          sourceUrl: chunk.sourceUrl,
        },
      });
    }

    for (const [index, match] of Array.from(
      chunk.text.matchAll(ALLOWANCE_CHECK_PATTERN),
    ).entries()) {
      const allowanceName = match[1].trim();
      criteria.push({
        id: createCriterionId(chunk, "received_elderly_allowance", index),
        policyId,
        concept: "received_elderly_allowance",
        label: `是否已经领取${allowanceName}`,
        operator: "equals",
        expectedValue: false,
        valueType: "boolean",
        required: false,
        fieldAliases: [
          "received_elderly_allowance",
          "是否领取高龄津贴",
          "高龄津贴领取状态",
          "allowance_received",
        ],
        missingFieldLabel: `是否已经领取${allowanceName}`,
        evidence: {
          chunkId: chunk.chunkId,
          quote: match[0].trim(),
          sourceUrl: chunk.sourceUrl,
        },
      });
    }
  }

  return criteria;
}

export const patternPolicyCriterionExtractor: PolicyCriterionExtractor = {
  async extractCriteria(policyId, evidence) {
    return extractCriteriaFromEvidence(policyId, evidence);
  },
};

