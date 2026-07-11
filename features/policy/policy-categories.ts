import { DEMO_IDS } from "@/shared/demo-constants";

export type PolicyCategoryId =
  | "elderly-support"
  | "pension-security"
  | "medical-security"
  | "social-assistance"
  | "disability-support";

export interface PolicyCategory {
  id: PolicyCategoryId;
  name: string;
  shortName: string;
  description: string;
  examples: string[];
}

export const policyCategories: PolicyCategory[] = [
  {
    id: "elderly-support",
    name: "老年福利补贴",
    shortName: "老年福利",
    description: "覆盖高龄、困难和失能老年人的补贴与照护支持。",
    examples: ["高龄津贴", "困难老人补贴", "失能护理补贴"],
  },
  {
    id: "pension-security",
    name: "养老保障",
    shortName: "养老保障",
    description: "归集城乡居民基本养老保险等长期保障政策。",
    examples: ["城乡居民养老保险"],
  },
  {
    id: "medical-security",
    name: "医疗保障",
    shortName: "医疗保障",
    description: "归集城乡居民医疗保险、医疗救助等政策。",
    examples: ["城乡居民医疗保险"],
  },
  {
    id: "social-assistance",
    name: "社会救助",
    shortName: "社会救助",
    description: "归集最低生活保障、临时救助等困难群众兜底政策。",
    examples: ["最低生活保障", "临时救助"],
  },
  {
    id: "disability-support",
    name: "残疾人保障",
    shortName: "残疾保障",
    description: "归集困难残疾人生活补贴和重度残疾人护理支持。",
    examples: ["困难残疾人生活补贴", "重度残疾人护理补贴"],
  },
];

const policyCategoryMap: Record<string, PolicyCategoryId> = {
  [DEMO_IDS.policies.elderlyAllowance]: "elderly-support",
  [DEMO_IDS.policies.elderlyCareSupport]: "elderly-support",
  [DEMO_IDS.policies.disabilityCareSupport]: "elderly-support",
  [DEMO_IDS.policies.residentPension]: "pension-security",
  [DEMO_IDS.policies.residentMedicalInsurance]: "medical-security",
  [DEMO_IDS.policies.minimumLivingAllowance]: "social-assistance",
  [DEMO_IDS.policies.disabilityTwoSubsidies]: "disability-support",
  [DEMO_IDS.policies.temporaryAssistance]: "social-assistance",
};

export function getPolicyCategoryId(policyId: string) {
  return policyCategoryMap[policyId] ?? null;
}

export function isPolicyCategoryId(value: string): value is PolicyCategoryId {
  return policyCategories.some((category) => category.id === value);
}
