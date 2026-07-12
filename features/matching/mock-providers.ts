import type { Resident } from "@/shared/types";
import { DEMO_IDS } from "@/shared/demo-constants";
import { demoResidents } from "./match-fixtures";
import type {
  PolicyEvidenceChunk,
  PolicyEvidenceProvider,
  ResidentFact,
  ResidentFactProvider,
} from "./integration-contracts";

const POLICY_EVIDENCE: Record<string, PolicyEvidenceChunk[]> = {
  [DEMO_IDS.policies.elderlyAllowance]: [
    {
      policyId: DEMO_IDS.policies.elderlyAllowance,
      chunkId: "policy-001-eligibility-001",
      sectionTitle: "适用条件",
      text: "申请人应为80周岁及以上、具有北京市户籍。办理前需核实是否已经领取高龄津贴。",
      sourceUrl: "https://www.beijing.gov.cn/",
    },
  ],
};

function pushFact(
  facts: ResidentFact[],
  fact: ResidentFact | null,
) {
  if (fact) {
    facts.push(fact);
  }
}

export function residentToFacts(resident: Resident): ResidentFact[] {
  const facts: ResidentFact[] = [];
  pushFact(
    facts,
    resident.age === undefined
      ? null
      : {
          residentId: resident.id,
          key: "resident_age",
          label: "居民年龄",
          value: resident.age,
          valueType: "number",
          aliases: ["age", "年龄"],
        },
  );
  pushFact(
    facts,
    resident.hukou === undefined
      ? null
      : {
          residentId: resident.id,
          key: "register_area",
          label: "户籍登记地区",
          value: resident.hukou,
          valueType: "string",
          aliases: ["hukou", "户籍", "户籍所在地"],
        },
  );
  pushFact(
    facts,
    resident.livingStatus === undefined
      ? null
      : {
          residentId: resident.id,
          key: "living_status",
          label: "居住状态",
          value: resident.livingStatus,
          valueType: "string",
        },
  );
  pushFact(
    facts,
    resident.lowIncomeStatus === undefined
      ? null
      : {
          residentId: resident.id,
          key: "low_income_status",
          label: "低收入状态",
          value: resident.lowIncomeStatus,
          valueType: "string",
        },
  );
  pushFact(
    facts,
    resident.disabilityStatus === undefined
      ? null
      : {
          residentId: resident.id,
          key: "disability_status",
          label: "失能评估状态",
          value: resident.disabilityStatus,
          valueType: "string",
        },
  );
  pushFact(
    facts,
    resident.insuranceStatus === undefined
      ? null
      : {
          residentId: resident.id,
          key: "insurance_status",
          label: "参保状态",
          value: resident.insuranceStatus,
          valueType: "string",
        },
  );
  return facts;
}

export const mockPolicyEvidenceProvider: PolicyEvidenceProvider = {
  async retrievePolicyEvidence({ policyId, queryText, limit }) {
    if (policyId) {
      const evidence = POLICY_EVIDENCE[policyId];
      if (!evidence) {
        throw new Error(`未找到政策证据：${policyId}`);
      }
      return evidence.slice(0, limit);
    }

    const normalizedTerms = (queryText ?? "")
      .split(/[\s，。；、]+/)
      .map((term) => term.trim())
      .filter(Boolean);
    const candidates = Object.values(POLICY_EVIDENCE)
      .flat()
      .filter(
        (chunk) =>
          normalizedTerms.length === 0 ||
          normalizedTerms.some((term) => chunk.text.includes(term)),
      );
    return candidates.slice(0, limit);
  },
};

export const mockResidentFactProvider: ResidentFactProvider = {
  async getResidentFacts(residentId) {
    const resident = demoResidents.find((item) => item.id === residentId);
    if (!resident) {
      throw new Error(`未找到居民事实：${residentId}`);
    }
    return residentToFacts(resident);
  },
};
