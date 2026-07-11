import type { MatchResult, Policy, Resident } from "@/shared/types";
import { DEMO_IDS } from "@/shared/demo-constants";

/**
 * C 模块唯一模拟数据源（P0 范围：高龄老年人津贴）。
 * 页面和规则/服务都从这里导入，不要另建 mock-policies.ts / mock-residents.ts。
 */

const elderlyAllowance: Policy = {
  id: DEMO_IDS.policies.elderlyAllowance,
  name: "高龄老年人津贴",
  originalName: "北京市高龄老年人津贴",
  region: "北京市大兴区西红门镇",
  summary: "80周岁及以上、具有北京市户籍的老年人可申领高龄津贴，用于补贴基本生活。",
  applicableTo: ["80周岁及以上", "北京市户籍"],
  benefitText: "每月发放高龄津贴，具体标准以西红门镇经办部门核定为准。",
  materials: ["身份证", "户口簿", "本人银行卡"],
  officialUrl: "https://www.beijing.gov.cn/",
  effectiveDate: "2024-01-01",
  updatedAt: "2026-07-11",
};

export const demoPolicies: Policy[] = [elderlyAllowance];

const zhangNainai: Resident = {
  id: DEMO_IDS.residents.zhangNainai,
  name: "张奶奶",
  age: 82,
  hukou: "北京市",
  livingStatus: "独居",
  lowIncomeStatus: "低保",
  disabilityStatus: "是否完成失能评估未知",
  insuranceStatus: "参保状态待核实",
  labels: ["高龄", "独居", "低保", "失能待核实"],
};

const liShu: Resident = {
  id: DEMO_IDS.residents.liShu,
  name: "李叔",
  age: 66,
  hukou: "北京市",
  livingStatus: "与子女同住",
  labels: ["未达高龄"],
};

const wangNainai: Resident = {
  id: DEMO_IDS.residents.wangNainai,
  name: "王奶奶",
  age: 85,
  // hukou 缺失 → 触发 pending，用于验证"未知信息不得误判为 matched"
  livingStatus: "独居",
  labels: ["高龄", "户籍待核实"],
};

export const demoResidents: Resident[] = [zhangNainai, liShu, wangNainai];

export const expectedMatchResults: MatchResult[] = [
  {
    policyId: elderlyAllowance.id,
    residentId: zhangNainai.id,
    status: "matched",
    reasons: ["年龄已满80周岁", "具有北京市户籍"],
    missingFields: ["是否已经领取高龄津贴"],
  },
  {
    policyId: elderlyAllowance.id,
    residentId: liShu.id,
    status: "unmatched",
    reasons: ["未达到80周岁"],
    missingFields: [],
  },
  {
    policyId: elderlyAllowance.id,
    residentId: wangNainai.id,
    status: "pending",
    reasons: ["户籍信息缺失"],
    missingFields: ["户籍"],
  },
];
