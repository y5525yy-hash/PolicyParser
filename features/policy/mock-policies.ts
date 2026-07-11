import { DEMO_IDS } from "@/shared/demo-constants";
import type { Policy } from "@/shared/types";

export const mockPolicies: Policy[] = [
  {
    id: DEMO_IDS.policies.elderlyAllowance,
    name: "高龄老年人津贴",
    originalName: "北京市老年人养老服务补贴津贴管理实施办法（演示摘录）",
    region: "北京市大兴区西红门镇",
    summary:
      "为符合年龄和户籍条件的高龄老年人提供养老服务补贴津贴。演示版资格以年龄、户籍及领取状态为主要核实项。",
    applicableTo: ["具有北京市户籍", "年满 80 周岁", "领取状态需核实"],
    benefitText: "具体补贴标准以北京市及大兴区最新官方政策为准。",
    materials: ["居民身份证", "居民户口簿", "本人银行卡"],
    officialUrl: "https://www.beijing.gov.cn/zhengce/",
    effectiveDate: "2019-10-01",
    updatedAt: "2026-07-11",
  },
  {
    id: DEMO_IDS.policies.elderlyCareSupport,
    name: "困难老年人养老服务补贴",
    originalName: "北京市困难老年人养老服务补贴政策（演示数据）",
    region: "北京市大兴区西红门镇",
    summary: "面向符合困难条件的老年人，辅助核查低保、年龄和居住情况。",
    applicableTo: ["困难老年人", "低保或相关困难身份需核实"],
    benefitText: "具体补贴标准以最新官方文件和经办审核结果为准。",
    materials: ["居民身份证", "居民户口簿", "困难身份相关证明"],
    officialUrl: "https://www.beijing.gov.cn/zhengce/",
    effectiveDate: "2019-10-01",
    updatedAt: "2026-07-11",
  },
  {
    id: DEMO_IDS.policies.disabilityCareSupport,
    name: "失能老年人护理补贴",
    originalName: "北京市失能老年人护理补贴政策（演示数据）",
    region: "北京市大兴区西红门镇",
    summary: "面向经评估符合失能条件的老年人，重点核实失能评估结果。",
    applicableTo: ["老年人", "失能评估结果需核实"],
    benefitText: "补贴档位和发放方式以正式评估及官方政策为准。",
    materials: ["居民身份证", "居民户口簿", "失能评估相关材料"],
    officialUrl: "https://www.beijing.gov.cn/zhengce/",
    effectiveDate: "2019-10-01",
    updatedAt: "2026-07-11",
  },
];

export function getMockPolicy(policyId: string) {
  return mockPolicies.find((policy) => policy.id === policyId) ?? null;
}
