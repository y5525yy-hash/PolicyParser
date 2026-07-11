import manifestJson from "@/features/policy/knowledge-base/data/manifest.json";
import type { PolicyManifest } from "@/features/policy/knowledge-base/schema";

const manifest = manifestJson as unknown as PolicyManifest;

export type PolicyCategoryId =
  | "civil-affairs"
  | "labor-security"
  | "health-sports"
  | "housing-environment"
  | "education"
  | "finance-audit"
  | "justice-security"
  | "government-services";

export interface PolicyCategory {
  id: PolicyCategoryId;
  name: string;
  shortName: string;
  description: string;
  examples: string[];
}

export const policyCategories: PolicyCategory[] = [
  { id: "civil-affairs", name: "民政、扶贫、救灾", shortName: "民政救助", description: "政府网站民政、社会福利、扶贫救助类政策。", examples: ["养老补贴", "社会救助", "儿童福利"] },
  { id: "labor-security", name: "劳动、人事、监察", shortName: "就业社保", description: "政府网站劳动就业和社会保障类政策。", examples: ["养老保险", "失业保险", "就业补贴"] },
  { id: "health-sports", name: "卫生、体育", shortName: "医疗健康", description: "政府网站医疗保障、医疗救助和健康服务类政策。", examples: ["大病保险", "医疗救助"] },
  { id: "housing-environment", name: "城乡建设、环境保护", shortName: "住房保障", description: "政府网站住房建设和住房保障类政策。", examples: ["公租房", "租房补贴"] },
  { id: "education", name: "科技教育", shortName: "教育资助", description: "政府网站教育和学生资助类政策。", examples: ["学生资助", "教育保障"] },
  { id: "finance-audit", name: "财政、金融、审计", shortName: "财政资助", description: "政府网站财政资金和补助管理类政策。", examples: ["学前资助", "义务教育补助"] },
  { id: "justice-security", name: "公安、安全、司法", shortName: "司法援助", description: "政府网站司法和法律援助类政策。", examples: ["法律援助"] },
  { id: "government-services", name: "政务服务", shortName: "政务服务", description: "政府部门公开的办事说明和年度服务政策。", examples: ["医保参保说明"] },
];

const categoryByOfficialPrefix: Record<string, PolicyCategoryId> = {
  "民政、扶贫、救灾": "civil-affairs",
  北京市民政局: "civil-affairs",
  "劳动、人事、监察": "labor-security",
  "卫生、体育": "health-sports",
  "城乡建设、环境保护": "housing-environment",
  科技教育: "education",
  "财政、金融、审计": "finance-audit",
  "公安、安全、司法": "justice-security",
  政务服务: "government-services",
};

const activeDocumentById = new Map(
  manifest.documents
    .filter((document) => document.status === "active")
    .map((document) => [document.documentId, document]),
);

const policyCategoryMap = new Map(
  manifest.policies.map((policy) => {
    const document = policy.documentIds
      .map((documentId) => activeDocumentById.get(documentId))
      .find(Boolean);
    const officialPrefix = document?.officialCategory.split("/")[0] ?? "";
    return [policy.policyId, categoryByOfficialPrefix[officialPrefix] ?? "government-services"];
  }),
);

export function getPolicyCategoryId(policyId: string) {
  return policyCategoryMap.get(policyId) ?? null;
}

export function isPolicyCategoryId(value: string): value is PolicyCategoryId {
  return policyCategories.some((category) => category.id === value);
}
