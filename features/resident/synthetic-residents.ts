import type { Resident } from "@/shared/types";

/**
 * 人工构造的合成居民。所有值均为虚构测试数据，先于任何模型调用写定，
 * 用于验证字段语义对齐不会改变确定性资格结论。
 */
export const syntheticResidents = [
  {
    id: "resident-009",
    name: "刘奶奶",
    age: 83,
    hukou: "北京市",
    livingStatus: "与女儿同住",
    lowIncomeStatus: "已核实非低保且非低收入",
    disabilityStatus: "能力综合评估为重度失能",
    insuranceStatus: "城乡居民养老保险缴费信息已核实",
    labels: ["高龄", "重度失能", "合成评测"],
  },
  {
    id: "resident-010",
    name: "马阿姨",
    age: 78,
    hukou: "北京市",
    livingStatus: "与配偶同住",
    lowIncomeStatus: "已核实非低保且非低收入",
    disabilityStatus: "能力综合评估未达到重度失能",
    insuranceStatus: "城乡居民养老保险缴费信息已核实",
    labels: ["计划生育特殊家庭", "持有效残疾人证", "合成评测"],
  },
  {
    id: "resident-011",
    name: "高同学",
    age: 19,
    hukou: "北京市",
    livingStatus: "与父母同住",
    lowIncomeStatus: "已核实非低保且非低收入",
    disabilityStatus: "能力综合评估未达到重度失能",
    insuranceStatus: "学生参保信息已核实",
    labels: ["在校学生", "本地户籍", "合成评测"],
  },
  {
    id: "resident-012",
    name: "郭老师",
    age: 62,
    hukou: "北京市",
    livingStatus: "与配偶同住",
    lowIncomeStatus: "已核实非低保且非低收入",
    disabilityStatus: "能力综合评估未达到重度失能",
    insuranceStatus: "职工养老保险待遇已核实",
    labels: ["机关事业单位", "已领取养老待遇", "合成评测"],
  },
  {
    id: "resident-013",
    name: "郑奶奶",
    age: 86,
    hukou: "户籍信息待核实",
    livingStatus: "独居",
    lowIncomeStatus: "收入情况待核实",
    disabilityStatus: "评估结果待核实",
    insuranceStatus: "参保状态待核实",
    labels: ["高龄", "多字段待核实", "合成评测"],
  },
] satisfies Resident[];

export interface SyntheticResidentMetadataSeed {
  residentId: string;
  gender: "女" | "男";
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
  policyFacts: {
    isStudent: boolean | null;
    isGovernmentOrPublicInstitutionStaff: boolean | null;
    coveredByEmployeePensionInsurance: boolean | null;
    contributionYears: number | null;
    receivesOtherBasicPensionBenefit: boolean | null;
    hukouType: string | null;
    householdMonthlyIncomePerCapitaPrevious12Months: number | null;
    householdHasHousingInBeijing: boolean | null;
    householdNetAssets: number | null;
    familyStatus: string | null;
    disabilityCertificate: boolean | null;
  };
}

export const syntheticResidentMetadataSeeds = [
  {
    residentId: "resident-009",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "退休，无固定单位",
    workUnitCategory: "退休及无固定单位",
    administrativeVillage: "合成测试社区",
    gridName: "评测第一网格",
    villageGroup: "测试一组",
    householdCode: "测试1组-009户",
    familyPopulation: 3,
    householdTags: ["本市户籍", "合成评测"],
    familySummary: "与女儿同住，评估为重度失能，其他信息完整。",
    enjoyedPolicies: [],
    profileSummary: "用于验证高龄、护理补贴、居民养老保险和租房补贴边界条件。",
    maskedPhone: "139****0009",
    recordSource: "合成验证夹具",
    verificationStatus: "已核实",
    updatedAt: "2026-07-12 09:30",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 18,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 4200,
      householdHasHousingInBeijing: false,
      householdNetAssets: 570000,
      familyStatus: "无特殊家庭身份",
      disabilityCertificate: false,
    },
  },
  {
    residentId: "resident-010",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "社区便民服务站",
    workUnitCategory: "社区及村务岗位",
    administrativeVillage: "合成测试社区",
    gridName: "评测第一网格",
    villageGroup: "测试二组",
    householdCode: "测试2组-010户",
    familyPopulation: 3,
    householdTags: ["本市户籍", "合成评测"],
    familySummary: "计划生育特殊家庭，养老缴费信息完整。",
    enjoyedPolicies: [],
    profileSummary: "用于验证特殊家庭分支、年龄排除及家庭资产超出一元的边界。",
    maskedPhone: "139****0010",
    recordSource: "合成验证夹具",
    verificationStatus: "已核实",
    updatedAt: "2026-07-12 09:31",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 16,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 4200,
      householdHasHousingInBeijing: false,
      householdNetAssets: 570001,
      familyStatus: "计划生育特殊家庭",
      disabilityCertificate: true,
    },
  },
  {
    residentId: "resident-011",
    gender: "男",
    politicalStatus: "群众",
    workUnit: "在校学生",
    workUnitCategory: "在校学生",
    administrativeVillage: "合成测试社区",
    gridName: "评测第二网格",
    villageGroup: "测试三组",
    householdCode: "测试3组-011户",
    familyPopulation: 4,
    householdTags: ["本市户籍", "合成评测"],
    familySummary: "与父母同住，当前为全日制在校学生。",
    enjoyedPolicies: [],
    profileSummary: "用于验证在校学生不进入城乡居民养老保险参保候选。",
    maskedPhone: "139****0011",
    recordSource: "合成验证夹具",
    verificationStatus: "已核实",
    updatedAt: "2026-07-12 09:32",
    policyFacts: {
      isStudent: true,
      isGovernmentOrPublicInstitutionStaff: false,
      coveredByEmployeePensionInsurance: false,
      contributionYears: 0,
      receivesOtherBasicPensionBenefit: false,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 5000,
      householdHasHousingInBeijing: true,
      householdNetAssets: 200000,
      familyStatus: "无特殊家庭身份",
      disabilityCertificate: false,
    },
  },
  {
    residentId: "resident-012",
    gender: "男",
    politicalStatus: "中共党员",
    workUnit: "区属事业单位退休",
    workUnitCategory: "机关事业单位",
    administrativeVillage: "合成测试社区",
    gridName: "评测第二网格",
    villageGroup: "测试四组",
    householdCode: "测试4组-012户",
    familyPopulation: 4,
    householdTags: ["本市户籍", "合成评测"],
    familySummary: "机关事业单位退休，已领取基本养老保障待遇。",
    enjoyedPolicies: ["职工基本养老保险待遇"],
    profileSummary: "用于验证机关事业身份、职工养老覆盖和重复待遇排除条件。",
    maskedPhone: "139****0012",
    recordSource: "合成验证夹具",
    verificationStatus: "已核实",
    updatedAt: "2026-07-12 09:33",
    policyFacts: {
      isStudent: false,
      isGovernmentOrPublicInstitutionStaff: true,
      coveredByEmployeePensionInsurance: true,
      contributionYears: 20,
      receivesOtherBasicPensionBenefit: true,
      hukouType: "北京市城镇户籍家庭",
      householdMonthlyIncomePerCapitaPrevious12Months: 4200,
      householdHasHousingInBeijing: false,
      householdNetAssets: 760000,
      familyStatus: "无特殊家庭身份",
      disabilityCertificate: false,
    },
  },
  {
    residentId: "resident-013",
    gender: "女",
    politicalStatus: "群众",
    workUnit: "无固定单位",
    workUnitCategory: "退休及无固定单位",
    administrativeVillage: "合成测试社区",
    gridName: "评测第三网格",
    villageGroup: "测试五组",
    householdCode: "测试5组-013户",
    familyPopulation: 1,
    householdTags: ["多字段待核实", "合成评测"],
    familySummary: "年龄已知，其余政策资格字段均等待补录。",
    enjoyedPolicies: [],
    profileSummary: "用于验证未知字段必须返回待核实，不能由模型猜测。",
    maskedPhone: "139****0013",
    recordSource: "合成验证夹具",
    verificationStatus: "待核实",
    updatedAt: "2026-07-12 09:34",
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
      familyStatus: null,
      disabilityCertificate: null,
    },
  },
] satisfies SyntheticResidentMetadataSeed[];
