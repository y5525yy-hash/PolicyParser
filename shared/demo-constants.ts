import type { CaseStatus, MatchStatus } from "@/shared/types";

export const DEMO_IDS = {
  policies: {
    elderlyAllowance: "policy-001",
    elderlyCareSupport: "policy-002",
    disabilityCareSupport: "policy-003",
    residentPension: "policy-004",
    residentMedicalInsurance: "policy-005",
    minimumLivingAllowance: "policy-006",
    disabilityTwoSubsidies: "policy-007",
    temporaryAssistance: "policy-008",
    specialHardshipSupport: "policy-009",
    orphanBasicLivingSupport: "policy-010",
    deFactoUnsupportedChildren: "policy-011",
    disabledChildrenRehabilitation: "policy-012",
    elderlyHomeAdaptation: "policy-013",
    marketRentalSubsidy: "policy-014",
    orphanAndUnsupportedChildMedical: "policy-015",
    distressedChildLivingAllowance: "policy-016",
    publicRentalHousingSubsidy: "policy-017",
    flexibleEmploymentSocialInsuranceSubsidy: "policy-018",
    unemploymentBenefit: "policy-019",
    preschoolEducationAid: "policy-020",
    compulsoryEducationAid: "policy-021",
    residentMajorIllnessInsurance: "policy-022",
  },
  residents: {
    zhangNainai: "resident-001",
    liShu: "resident-002",
    wangNainai: "resident-003",
  },
} as const;

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  matched: "高度匹配",
  pending: "待核实",
  unmatched: "暂不匹配",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  todo: "待处理",
  collecting: "收集材料中",
  submitted: "已提交",
  processing: "审核中",
  completed: "已办结",
};

export const CASE_STORAGE_KEY = "shenicest.caseTasks.v1";
