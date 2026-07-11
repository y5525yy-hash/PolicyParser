import { DEMO_IDS } from "@/shared/demo-constants";
import type { Policy } from "@/shared/types";

import manifestJson from "@/features/policy/knowledge-base/data/manifest.json";
import type { PolicyManifest } from "@/features/policy/knowledge-base/schema";
import { getPolicySource } from "@/features/policy/policy-source";

const manifest = manifestJson as unknown as PolicyManifest;

const elderlySubsidySource = getPolicySource(DEMO_IDS.policies.elderlyAllowance);

if (!elderlySubsidySource) {
  throw new Error("Missing elderly subsidy source metadata");
}

const curatedPolicies: Policy[] = [
  {
    id: DEMO_IDS.policies.elderlyAllowance,
    name: "高龄老年人津贴",
    originalName: elderlySubsidySource.documentName,
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
    officialUrl: elderlySubsidySource.officialUrl,
    effectiveDate: elderlySubsidySource.effectiveDate,
    updatedAt: elderlySubsidySource.publishedAt,
  },
  {
    id: DEMO_IDS.policies.elderlyCareSupport,
    name: "困难老年人养老服务补贴",
    originalName: elderlySubsidySource.documentName,
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
    officialUrl: elderlySubsidySource.officialUrl,
    effectiveDate: elderlySubsidySource.effectiveDate,
    updatedAt: elderlySubsidySource.publishedAt,
  },
  {
    id: DEMO_IDS.policies.disabilityCareSupport,
    name: "失能老年人护理补贴",
    originalName: elderlySubsidySource.documentName,
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
    officialUrl: elderlySubsidySource.officialUrl,
    effectiveDate: elderlySubsidySource.effectiveDate,
    updatedAt: elderlySubsidySource.publishedAt,
  },
  {
    id: DEMO_IDS.policies.residentPension,
    name: "2026年城乡居民基本养老保险",
    originalName:
      "北京市人力资源和社会保障局关于发布2026年北京市城乡居民基本养老保险缴费标准的通告",
    region: "北京市（西红门镇居民按参保渠道办理）",
    summary:
      "面向参加北京市城乡居民基本养老保险的居民，2026年度可在规定范围内选择缴费档次，符合条件的困难人员还可核实政府代缴政策。",
    applicableTo: [
      "已参加或计划参加北京市城乡居民基本养老保险的居民",
      "具体参保资格由社会保险经办机构核验",
      "低保、特困或持残疾人证人员可进一步核实政府代缴条件",
    ],
    benefitText:
      "2026年最低年缴费标准为1000元，最高年缴费标准为9000元；参保人可按规定选择缴费档次，缴费补贴及代缴资格以经办机构核定为准。",
    materials: [
      "参保人有效身份证件",
      "户口簿或参保资格相关信息",
      "缴费档次及扣款账户信息",
      "申请政府代缴时所需的低保、特困或残疾身份信息",
    ],
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/202603/t20260330_4569970.html",
    effectiveDate: "2026年度",
    updatedAt: "2026-03-27",
  },
  {
    id: DEMO_IDS.policies.residentMedicalInsurance,
    name: "2026年度城乡居民基本医疗保险",
    originalName: "2026年度北京市城乡居民基本医疗保险参保时间及缴费标准",
    region: "北京市（西红门镇居民按医保参保渠道办理）",
    summary:
      "面向符合北京市城乡居民医保参保条件的老年人、学生儿童和劳动年龄内居民，提供年度基本医疗保障。",
    applicableTo: [
      "符合北京市城乡居民基本医疗保险参保条件的城乡老年人",
      "符合条件的学生儿童",
      "未参加城镇职工基本医疗保险且符合条件的劳动年龄内居民",
    ],
    benefitText:
      "2026年度个人缴费标准：城乡老年人每人每年460元，学生儿童每人每年435元，劳动年龄内居民每人每年795元。具体待遇和等待期以医保部门审核为准。",
    materials: [
      "参保人有效身份证件",
      "户籍或符合参保身份的相关材料",
      "社会保障卡及缴费账户信息（按办理渠道要求）",
    ],
    officialUrl:
      "https://ybj.beijing.gov.cn/2020_zwfw/2020_cjwt/202512/t20251208_4327187.html",
    effectiveDate: "2026年度",
    updatedAt: "2025-12-08",
  },
  {
    id: DEMO_IDS.policies.minimumLivingAllowance,
    name: "北京市城乡最低生活保障",
    originalName: "北京市民政局 北京市财政局关于调整本市最低生活保障标准的通知",
    region: "北京市（西红门镇按户籍和家庭情况受理）",
    summary:
      "面向共同生活家庭成员人均收入和家庭财产状况符合规定的困难家庭，提供基本生活兜底保障。",
    applicableTo: [
      "本市户籍困难家庭",
      "共同生活家庭成员人均收入低于本市低保标准",
      "家庭财产状况符合低保认定要求",
    ],
    benefitText:
      "北京市低保标准自2024年7月起为每人每月1450元。实际保障金额根据家庭收入、成员情况和审核结果确定。",
    materials: [
      "申请人及共同生活家庭成员身份证、户口簿",
      "家庭经济状况核对授权材料",
      "收入、财产及家庭困难情况材料（按受理窗口要求）",
    ],
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/202412/t20241231_3977722.html",
    effectiveDate: "2024-07-01",
    updatedAt: "2024-08-21",
  },
  {
    id: DEMO_IDS.policies.disabilityTwoSubsidies,
    name: "困难残疾人生活补贴和重度残疾人护理补贴",
    originalName: "北京市困难残疾人生活补贴和重度残疾人护理补贴制度实施办法",
    region: "北京市（向户籍所在地街道或乡镇申请）",
    summary:
      "为符合条件的困难残疾人补助额外生活支出，并为需要长期照护的重度残疾人提供护理补贴。",
    applicableTo: [
      "具有北京市户籍并持有效残疾人证或残疾人服务一卡通",
      "困难残疾人生活补贴需符合低保、低收入、年龄、就业或收入等相应条件",
      "护理补贴面向一级、二级残疾人及三级智力、精神残疾人等规定对象",
    ],
    benefitText:
      "生活补贴按困难类型和残疾类别分档，常见标准为每人每月200元至400元或参照低保标准补差；护理补贴常见标准为每人每月100元或300元。最终档位以残疾类别、等级及待遇衔接审核为准。",
    materials: [
      "生活补贴或护理补贴申请审批表",
      "个人经济状况登记表及授权委托书",
      "残疾人证或残疾人服务一卡通",
      "身份证或户口簿",
      "生活补贴申请人对应的低保、低收入、社保权益或在校证明",
    ],
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/201905/t20190522_59619.html",
    effectiveDate: "2016-01-01",
    updatedAt: "2016-11-16",
  },
  {
    id: DEMO_IDS.policies.temporaryAssistance,
    name: "北京市临时救助",
    originalName: "北京市民政局 北京市财政局关于进一步做好临时救助工作的通知",
    region: "北京市（可通过村居向乡镇或街道提出申请）",
    summary:
      "帮助因突发事故、重大疾病或必要支出导致基本生活暂时陷入严重困难的家庭和个人渡过急难。",
    applicableTo: [
      "因火灾、交通事故等意外导致基本生活出现严重困难的家庭或个人",
      "因突发重大疾病且无法获得其他支持，需要紧急救助的人员",
      "扣除必要医疗、教育等支出后，家庭收入和财产符合条件的本市户籍家庭",
    ],
    benefitText:
      "急难型救助一般按每人不超过3个月当年低保标准确定；支出型救助按必要支出金额、家庭类别和困难程度分档计算，特殊个案可按规定一事一议。",
    materials: [
      "申请人身份证明；委托申请时还需授权委托书和代理人身份证",
      "火灾、交通事故、重大疾病等急难事件相关材料",
      "支出型救助需提供户口簿及医疗、教育等必要支出材料",
      "责任认定、赔偿认定等补充材料（如适用）",
    ],
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/202009/t20200909_2042924.html",
    effectiveDate: "现行有效",
    updatedAt: "2020-07-27",
  },
];

const curatedPolicyIds = new Set(curatedPolicies.map((policy) => policy.id));
const activeDocumentsById = new Map(
  manifest.documents
    .filter((document) => document.status === "active")
    .map((document) => [document.documentId, document]),
);

const catalogPolicies: Policy[] = manifest.policies
  .filter(
    (policy) => policy.status === "active" && !curatedPolicyIds.has(policy.policyId),
  )
  .map((policy) => {
    const document = policy.documentIds
      .map((documentId) => activeDocumentsById.get(documentId))
      .find(Boolean);

    if (!document) {
      throw new Error(`Missing active source document for ${policy.policyId}`);
    }

    return {
      id: policy.policyId,
      name: policy.name,
      originalName: document.officialName,
      region: `${policy.region}（西红门镇按属地和主管部门口径办理）`,
      summary: `该政策归入政府网站“${document.officialCategory}”分类。知识库已保存完整官方原文，页面仅辅助查找政策和核对条件，不自动认定申请资格。`,
      applicableTo: [
        "适用对象、年龄、户籍、收入或身份条件以官方原文为准",
        "涉及多项条件时需完整核对“同时符合”“任一情形”和例外条款",
        "最终资格由对应主管部门或受理窗口审核",
      ],
      benefitText: "待遇、补贴或缴费标准以官方原文及主管部门当前执行口径为准。",
      materials: [
        "身份证明和户籍信息（如政策要求）",
        "与申请条件对应的收入、财产、参保、残疾或家庭情况材料",
        "受理窗口根据具体政策要求补充的材料",
      ],
      officialUrl: document.officialUrl,
      effectiveDate: document.effectiveFrom ?? "现行有效",
      updatedAt: document.publishedAt ?? "待核对",
    };
  });

export const mockPolicies: Policy[] = [...curatedPolicies, ...catalogPolicies].sort(
  (left, right) => left.id.localeCompare(right.id, "en"),
);

export function getMockPolicy(policyId: string) {
  return mockPolicies.find((policy) => policy.id === policyId) ?? null;
}
