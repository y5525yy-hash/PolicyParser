interface PolicyFieldMetadata {
  label: string;
  aliases: string[];
  missingFieldLabel: string;
}

const FIELD_LABELS: Record<string, string> = {
  age: "年龄",
  hukou: "户籍",
  familyStatus: "家庭特殊身份",
  lowIncomeStatus: "困难身份",
  disabilityCertificate: "残疾人证情况",
  disabilityStatus: "失能或残疾状态",
  isStudent: "是否为在校学生",
  isGovernmentOrPublicInstitutionStaff:
    "是否为国家机关或事业单位工作人员",
  coveredByEmployeePensionInsurance: "是否属于职工基本养老保险覆盖范围",
  contributionYears: "城乡居民养老保险累计缴费年限",
  receivesOtherBasicPensionBenefit: "是否领取其他基本养老保障待遇",
  residentMedicalPopulationBranch: "城乡居民基本医疗保险参保人群类别",
  familyMonthlyIncomePerCapita: "家庭月人均收入",
  familyPropertyStatus: "家庭财产状况",
  disabilityCareSubsidyQualification: "重度残疾人护理补贴资格",
  disabilityLivingSubsidyQualification: "困难残疾人生活补贴资格",
  emergencyHardship: "是否存在急难情形",
  incomeAfterNecessaryExpenses: "扣除必要支出后的家庭月人均收入",
  hasCapableLegalSupportObligor: "是否有具备履行能力的法定赡养扶养义务人",
  hasLaborCapacity: "是否具有劳动能力",
  hasLivingSource: "是否有生活来源",
  populationIdentity: "人员身份类别",
  orphanIdentity: "孤儿或视同孤儿身份",
  parentStatusBranch: "父母状况类别",
  hasDesignatedMedicalAssessment: "是否有指定医疗机构诊断评估报告",
  hasDisabilityCertificate: "是否持有有效残疾人证",
  districtQualificationApproved: "区级申请资格审核结果",
  hasHomeAdaptationNeed: "是否有居家适老化改造需求",
  isElderlyApplicant: "是否属于老年申请人",
  householdHasHousingInBeijing: "家庭成员在北京市是否有住房",
  householdMonthlyIncomePerCapitaPrevious12Months: "前12个月家庭月人均收入",
  householdNetAssets: "家庭净资产",
  hukouType: "户籍类型",
  childWelfareIdentity: "儿童福利保障身份",
  distressedChildIdentity: "困境儿童身份",
  hasOtherHousingBeyondRentedPublicHousing: "除承租公租房外是否有其他住房",
  publicHousingAllocationMethod: "公租房配租方式",
  employmentSupportIdentity: "就业帮扶对象身份",
  hasLaborOrBusinessIncome: "是否取得劳动或经营收入",
  paysSocialInsuranceAsFlexibleWorker: "是否以灵活就业人员身份缴纳社会保险",
  personalEmploymentRegistrationDays: "个人就业登记连续天数",
  hasJobSeekingRequirement: "是否有求职要求",
  involuntaryUnemployment: "是否非因本人意愿中断就业",
  unemploymentInsuranceContributionMonths: "失业保险累计缴费月数",
  unemploymentRegistered: "是否已办理失业登记",
  aidIdentity: "教育资助身份",
  kindergartenType: "就读幼儿园类型",
  educationAidBranch: "义务教育资助项目类别",
  expenseWithinBasicInsuranceScope: "医疗费用是否属于基本医保支付范围",
  medicalInstitutionIsDesignated: "就医机构是否为定点医疗机构",
  personalPaymentExceedsAnnualThreshold: "个人自付费用是否超过年度起付标准",
  residentBasicMedicalInsuranceEnrolled: "是否参加城乡居民基本医疗保险",
  highMedicalExpenseCausesBasicLivingDifficulty:
    "高额医疗费用是否造成基本生活严重困难",
  illnessPovertyRecognitionSatisfied: "因病致贫认定条件是否满足",
  recognizedSocialAssistanceObject: "是否已认定为社会救助对象",
  socialAssistanceIdentity: "社会救助身份",
  disqualifyingPropertySituation: "是否存在不符合认定条件的财产情形",
  emergencyMonetaryPropertyPerCapita: "家庭人均货币财产",
  householdMemberDefinitionSatisfied: "共同生活家庭成员认定是否符合规定",
  incomeAfterMedicalExpense: "扣除医疗支出后的家庭收入",
  receivesMinimumLivingOrLowIncomeAssistance: "是否享受低保或低收入救助",
  distressedChildCategory: "困境儿童类别",
  birthDate: "出生日期",
  femaleAge: "女方年龄",
  femaleBirthDate: "女方出生日期",
  hasLivingChild: "是否有存活子女",
  hasOnlyChildParentsCertificate: "是否持有独生子女父母光荣证",
  livingOnlyChildDisabilityLevel: "现存活独生子女残疾等级",
  onlyChildFamilyStatus: "独生子女家庭生育或收养情况",
  disqualifyingSocialAssistanceProperty: "是否存在不符合社会救助的财产情形",
  householdIncomePerCapita: "家庭人均收入",
  legalAidApplicationReason: "法律援助申请事由",
  monetaryPropertyPerCapita: "家庭人均货币财产",
  truthfullyCommitsEconomicDifficulty: "是否如实承诺经济困难情况",
  unrepairedCreditDisciplinaryStatus: "是否存在尚未修复的信用惩戒状态",
  familyHasHousingInBeijing: "本人及家庭成员在北京市是否有住房",
  fullCivilCapacity: "是否具有完全民事行为能力",
  householdAnnualIncome: "家庭年收入",
  housingQueueIdentity: "保障性住房轮候身份",
  housingUseAreaPerCapita: "家庭人均住房使用面积",
  stableWorkInBeijing: "是否在北京市连续稳定工作",
  temporaryResidenceAndContributionProof: "暂住及公积金或社保缴纳证明",
  employmentForm: "就业形式",
  withinStatutoryWorkingAge: "是否处于法定劳动年龄",
  highSchoolAidProgramEligibility: "普通高中资助项目资格",
  higherEducationAidProgramEligibility: "高等教育资助项目资格",
  secondaryVocationalAidProgramEligibility: "中等职业教育资助项目资格",
  isHomeBasedBasicElderlyServiceRecipient: "是否属于居家基本养老服务对象",
  mealPaymentExceedsSubsidy: "助餐消费金额是否超过补贴标准",
  mealType: "助餐餐次类型",
};

const FIELD_ALIASES: Record<string, string[]> = {
  age: ["resident_age", "birthDate", "出生日期"],
  hukou: ["register_area", "户籍所在地", "户口所在地"],
  lowIncomeStatus: ["low_income_status", "低收入状态", "低保状态"],
  disabilityStatus: ["disability_status", "失能评估状态", "残疾状态"],
  isGovernmentOrPublicInstitutionStaff: ["机关事业单位工作人员"],
  coveredByEmployeePensionInsurance: ["职工基本养老保险覆盖情况"],
  contributionYears: ["养老保险缴费年限"],
  receivesOtherBasicPensionBenefit: ["其他基本养老保障待遇领取情况"],
};

function fallbackLabel(sourceText: string) {
  const normalized = sourceText.replace(/\s+/g, "").replace(/[；。]+$/g, "");
  if (normalized.length > 0 && normalized.length <= 28) {
    return normalized;
  }
  return "政策要求的补充核验信息";
}

export function getPolicyFieldMetadata(
  field: string,
  sourceText: string,
): PolicyFieldMetadata {
  const label = FIELD_LABELS[field] ?? fallbackLabel(sourceText);
  return {
    label,
    aliases: [field, label, ...(FIELD_ALIASES[field] ?? [])],
    missingFieldLabel: label,
  };
}
