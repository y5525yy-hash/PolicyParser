import { DEMO_IDS } from "@/shared/demo-constants";
import type { Policy } from "@/shared/types";

import { policySource } from "@/features/policy/policy-source";

export const mockPolicies: Policy[] = [
  {
    id: DEMO_IDS.policies.elderlyAllowance,
    name: "高龄老年人津贴",
    originalName: policySource.documentName,
    region: "北京市（西红门镇按户籍地受理）",
    summary:
      "面向具有北京市户籍且年满 80 周岁的老年人，用于养老服务消费，特别是生活照料护理服务。",
    applicableTo: [
      "具有北京市户籍",
      "年满 80 周岁",
      "需要核实是否已享受相关待遇及发放账户",
    ],
    benefitText:
      "80–89 周岁每人每月 100 元；90–99 周岁每人每月 500 元；100 周岁及以上每人每月 800 元。",
    materials: [
      "居民身份证或户口簿原件",
      "北京市老年人养老服务补贴津贴申请表（线下申请时）",
      "本人确认的补贴津贴发放账户信息",
    ],
    officialUrl: policySource.officialUrl,
    effectiveDate: policySource.effectiveDate,
    updatedAt: policySource.publishedAt,
  },
  {
    id: DEMO_IDS.policies.elderlyCareSupport,
    name: "困难老年人养老服务补贴",
    originalName: policySource.documentName,
    region: "北京市（西红门镇按户籍地受理）",
    summary:
      "面向低保、低收入和计划生育特殊家庭等困难老年人，用于日常照料等生活性服务。",
    applicableTo: [
      "具有北京市户籍",
      "享受低保待遇的老年人",
      "低收入家庭中未享受低保待遇的老年人",
      "符合条件的计划生育特殊家庭老年人",
    ],
    benefitText:
      "低保老年人每人每月 300 元；低收入家庭中未享受低保的老年人每人每月 200 元；其他符合条件的计划生育特殊家庭老年人每人每月 100 元。",
    materials: [
      "居民身份证或户口簿原件",
      "北京市老年人养老服务补贴津贴申请表（线下申请时）",
      "低保、低收入或计划生育特殊家庭身份信息（原则上由政府系统共享核验）",
    ],
    officialUrl: policySource.officialUrl,
    effectiveDate: policySource.effectiveDate,
    updatedAt: policySource.publishedAt,
  },
  {
    id: DEMO_IDS.policies.disabilityCareSupport,
    name: "失能老年人护理补贴",
    originalName: policySource.documentName,
    region: "北京市（西红门镇按户籍地受理）",
    summary:
      "面向重度失能或持有相应残疾证的北京市户籍老年人，用于长期照护和护理服务消费。",
    applicableTo: [
      "具有北京市户籍",
      "经能力综合评估为重度失能的老年人",
      "持有政策规定类别及等级残疾证的老年人",
      "需要核实是否与其他同类型护理待遇重复",
    ],
    benefitText:
      "符合第一档条件每人每月 600 元；符合第二档条件每人每月 400 元；符合听力、言语残疾相关条件每人每月 200 元，具体档位以评估和残疾等级审核为准。",
    materials: [
      "居民身份证或户口簿原件",
      "北京市老年人养老服务补贴津贴申请表（线下申请时）",
      "老年人能力综合评估结果或残疾证信息",
    ],
    officialUrl: policySource.officialUrl,
    effectiveDate: policySource.effectiveDate,
    updatedAt: policySource.publishedAt,
  },
];

export function getMockPolicy(policyId: string) {
  return mockPolicies.find((policy) => policy.id === policyId) ?? null;
}
