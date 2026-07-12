import type { Resident } from "@/shared/types";

import { mockResidents } from "@/features/resident/mock-residents";
import { syntheticResidentMetadataSeeds } from "@/features/resident/synthetic-residents";

export type ResidentGender = "女" | "男";

export interface ResidentPolicyFacts {
  isStudent: boolean | null;
  isGovernmentOrPublicInstitutionStaff: boolean | null;
  coveredByEmployeePensionInsurance: boolean | null;
  contributionYears: number | null;
  receivesOtherBasicPensionBenefit: boolean | null;
  hukouType: string | null;
  householdMonthlyIncomePerCapitaPrevious12Months: number | null;
  householdHasHousingInBeijing: boolean | null;
  householdNetAssets: number | null;
  familyStatus?: string | null;
  disabilityCertificate?: boolean | null;
}

export interface ResidentDirectoryMetadata {
  residentId: string;
  gender: ResidentGender;
  politicalStatus: string;
  workUnit: string;
  workUnitCategory: string;
  administrativeVillage: string;
  gridName: string;
  villageGroup: string;
  householdCode: string;
  familyPopulation: number;
  householdTags: string[];
  familySummary: string;
  enjoyedPolicies: string[];
  profileSummary: string;
  maskedPhone: string;
  recordSource: string;
  verificationStatus: "已核实" | "部分核实" | "待核实";
  updatedAt: string;
  policyFacts: ResidentPolicyFacts;
}

export interface ResidentDirectoryRecord {
  resident: Resident;
  metadata: ResidentDirectoryMetadata;
}

const baseDirectoryMetadata: ResidentDirectoryMetadata[] = [
  {
    residentId: "resident-001",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "退休，无固定单位",
    workUnitCategory: "退休及无固定单位",
    administrativeVillage: "西红门一村",
    gridName: "第一网格",
    villageGroup: "一村三组",
    householdCode: "一村3组-018户",
    familyPopulation: 1,
    householdTags: ["本市户籍", "人户一致"],
    familySummary: "独居，低保户，子女居住在外区",
    enjoyedPolicies: ["城乡居民基本医疗保险"],
    profileSummary: "高龄独居老人，日常生活基本自理，需重点核实津贴领取和失能评估情况。",
    maskedPhone: "138****2106",
    recordSource: "村级走访台账",
    verificationStatus: "部分核实",
    updatedAt: "2026-07-11 18:20",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 18,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 2800,
      householdHasHousingInBeijing: false,
      householdNetAssets: 120000,
    },
  },
  {
    residentId: "resident-002",
    gender: "男",
    politicalStatus: "中共党员",
    workUnit: "西红门镇属事业单位退休",
    workUnitCategory: "机关事业单位",
    administrativeVillage: "西红门二村",
    gridName: "第二网格",
    villageGroup: "二村一组",
    householdCode: "二村1组-026户",
    familyPopulation: 4,
    householdTags: ["本市户籍", "人户一致"],
    familySummary: "与配偶和子女同住，家庭照护稳定",
    enjoyedPolicies: ["城乡居民基本医疗保险", "城乡居民养老保险"],
    profileSummary: "家庭支持较稳定，当前年龄未达到高龄津贴条件，保持常规信息更新。",
    maskedPhone: "136****7042",
    recordSource: "人口基础台账",
    verificationStatus: "已核实",
    updatedAt: "2026-07-11 17:45",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: true,
      contributionYears: null,
      receivesOtherBasicPensionBenefit: true,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 6500,
      householdHasHousingInBeijing: true,
      householdNetAssets: 800000,
    },
  },
  {
    residentId: "resident-003",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "无固定单位",
    workUnitCategory: "退休及无固定单位",
    administrativeVillage: "西红门一村",
    gridName: "第二网格",
    villageGroup: "一村五组",
    householdCode: "一村5组-009户",
    familyPopulation: 1,
    householdTags: ["户籍待核实", "疑似人户分离"],
    familySummary: "独居，侄女偶尔探访，收入情况不完整",
    enjoyedPolicies: [],
    profileSummary: "高龄独居，户籍、收入和参保信息均需补录，建议优先安排入户核实。",
    maskedPhone: "139****1824",
    recordSource: "网格员入户摸排",
    verificationStatus: "待核实",
    updatedAt: "2026-07-11 16:32",
    policyFacts: {
      isStudent: null,
      isGovernmentOrPublicInstitutionStaff: null,
      coveredByEmployeePensionInsurance: null,
      contributionYears: null,
      receivesOtherBasicPensionBenefit: null,
      hukouType: null,
      householdMonthlyIncomePerCapitaPrevious12Months: null,
      householdHasHousingInBeijing: null,
      householdNetAssets: null,
    },
  },
  {
    residentId: "resident-004",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "社区便民服务站",
    workUnitCategory: "社区及村务岗位",
    administrativeVillage: "西红门三村",
    gridName: "第一网格",
    villageGroup: "三村二组",
    householdCode: "三村2组-031户",
    familyPopulation: 2,
    householdTags: ["本市户籍", "人户一致"],
    familySummary: "与配偶同住，低收入家庭，子女定期探访",
    enjoyedPolicies: ["城乡居民养老保险"],
    profileSummary: "低收入老年家庭，具备困难老年人补贴的初步匹配基础。",
    maskedPhone: "135****6298",
    recordSource: "困难家庭摸排台账",
    verificationStatus: "部分核实",
    updatedAt: "2026-07-10 15:10",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 12,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 3600,
      householdHasHousingInBeijing: false,
      householdNetAssets: 260000,
    },
  },
  {
    residentId: "resident-005",
    gender: "男",
    politicalStatus: "中共党员",
    workUnit: "企业退休职工",
    workUnitCategory: "企业",
    administrativeVillage: "西红门二村",
    gridName: "第三网格",
    villageGroup: "二村四组",
    householdCode: "二村4组-015户",
    familyPopulation: 3,
    householdTags: ["本市户籍", "人户一致"],
    familySummary: "与儿子同住，家庭可提供基础照护",
    enjoyedPolicies: ["城乡居民基本医疗保险"],
    profileSummary: "高龄且持残疾证，需核实残疾等级、评估结果及护理待遇衔接情况。",
    maskedPhone: "137****4431",
    recordSource: "残疾人服务台账",
    verificationStatus: "部分核实",
    updatedAt: "2026-07-10 11:36",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: true,
      contributionYears: null,
      receivesOtherBasicPensionBenefit: true,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 4800,
      householdHasHousingInBeijing: true,
      householdNetAssets: 600000,
    },
  },
  {
    residentId: "resident-006",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "灵活就业",
    workUnitCategory: "灵活就业",
    administrativeVillage: "西红门一村",
    gridName: "第一网格",
    villageGroup: "一村二组",
    householdCode: "一村2组-044户",
    familyPopulation: 1,
    householdTags: ["本市户籍", "人户一致"],
    familySummary: "独居，妹妹住在同镇，收入证明缺失",
    enjoyedPolicies: ["城乡居民基本医疗保险"],
    profileSummary: "独居且收入信息不完整，需要核实是否属于困难家庭及可享受的养老服务支持。",
    maskedPhone: "150****3075",
    recordSource: "独居人员走访记录",
    verificationStatus: "待核实",
    updatedAt: "2026-07-09 14:08",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 8,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: null,
      householdHasHousingInBeijing: false,
      householdNetAssets: 180000,
    },
  },
  {
    residentId: "resident-007",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "退休，无固定单位",
    workUnitCategory: "退休及无固定单位",
    administrativeVillage: "西红门三村",
    gridName: "第二网格",
    villageGroup: "三村一组",
    householdCode: "三村1组-012户",
    familyPopulation: 3,
    householdTags: ["本市户籍", "人户一致"],
    familySummary: "与女儿同住，近期行动能力下降",
    enjoyedPolicies: ["城乡居民养老保险", "家庭医生签约服务"],
    profileSummary: "高龄且有轻度失能记录，高龄津贴初步匹配，护理补贴需等待最新评估。",
    maskedPhone: "158****9150",
    recordSource: "高龄老人关爱台账",
    verificationStatus: "部分核实",
    updatedAt: "2026-07-09 10:21",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 20,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 5200,
      householdHasHousingInBeijing: true,
      householdNetAssets: 700000,
    },
  },
  {
    residentId: "resident-008",
    gender: "男",
    politicalStatus: "群众",
    workUnit: "物流企业临时岗位",
    workUnitCategory: "企业",
    administrativeVillage: "新建社区",
    gridName: "流动人口网格",
    villageGroup: "新建社区",
    householdCode: "新建社区-临018户",
    familyPopulation: 2,
    householdTags: ["外省户籍", "人户分离"],
    familySummary: "与妻子租住，子女在外地工作",
    enjoyedPolicies: [],
    profileSummary: "外省户籍且异地参保信息不完整，当前未发现本地政策的潜在匹配。",
    maskedPhone: "186****5726",
    recordSource: "流动人口登记",
    verificationStatus: "待核实",
    updatedAt: "2026-07-08 09:50",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: true,
      contributionYears: null,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "外省户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 5000,
      householdHasHousingInBeijing: false,
      householdNetAssets: 150000,
    },
  },
];

const directoryMetadata: ResidentDirectoryMetadata[] = [
  ...baseDirectoryMetadata,
  ...syntheticResidentMetadataSeeds,
];

export const residentDirectoryRecords = mockResidents.flatMap<ResidentDirectoryRecord>(
  (resident) => {
    const metadata = directoryMetadata.find(
      (item) => item.residentId === resident.id,
    );

    return metadata ? [{ resident, metadata }] : [];
  },
);

export const villageGroupOptions = Array.from(
  new Set(directoryMetadata.map((item) => item.villageGroup)),
);

export const politicalStatusOptions = Array.from(
  new Set(directoryMetadata.map((item) => item.politicalStatus)),
);

export const workUnitCategoryOptions = Array.from(
  new Set(directoryMetadata.map((item) => item.workUnitCategory)),
);

export const ruralGridOptions = Array.from(
  new Set(
    directoryMetadata.map(
      (item) => `${item.administrativeVillage} / ${item.gridName}`,
    ),
  ),
);

export const priorityTagOptions = Array.from(
  new Set(mockResidents.flatMap((resident) => resident.labels)),
).sort((left, right) => left.localeCompare(right, "zh-CN"));
