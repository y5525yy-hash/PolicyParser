import { DEMO_IDS } from "@/shared/demo-constants";

import manifestJson from "@/features/policy/knowledge-base/data/manifest.json";
import type { PolicyManifest } from "@/features/policy/knowledge-base/schema";

const manifest = manifestJson as unknown as PolicyManifest;

export interface PolicySourceDetail {
  documentName: string;
  documentNumber?: string;
  issuingAuthorities: string;
  publishedAt: string;
  effectiveDate: string;
  officialUrl: string;
  interpretationUrl?: string;
  verifiedAt: string;
}

const elderlySubsidySource: PolicySourceDetail = {
  documentName: "北京市老年人养老服务补贴津贴管理实施办法",
  documentNumber: "京民养老发〔2019〕160号",
  issuingAuthorities: "北京市民政局等七部门",
  publishedAt: "2019-10-25",
  effectiveDate: "2019-10-01",
  officialUrl:
    "https://www.beijing.gov.cn/zhengce/zhengcefagui/201910/t20191028_454233.html",
  interpretationUrl:
    "https://www.beijing.gov.cn/zhengce/zcjd/201910/t20191028_454234.html",
  verifiedAt: "2026-07-11",
};

const policySourceMap: Record<string, PolicySourceDetail> = {
  [DEMO_IDS.policies.elderlyAllowance]: elderlySubsidySource,
  [DEMO_IDS.policies.elderlyCareSupport]: elderlySubsidySource,
  [DEMO_IDS.policies.disabilityCareSupport]: elderlySubsidySource,
  [DEMO_IDS.policies.residentPension]: {
    documentName: "北京市人力资源和社会保障局关于发布2026年北京市城乡居民基本养老保险缴费标准的通告",
    documentNumber: "京人社发〔2026〕1号",
    issuingAuthorities: "北京市人力资源和社会保障局",
    publishedAt: "2026-03-27",
    effectiveDate: "2026年度",
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/202603/t20260330_4569970.html",
    interpretationUrl:
      "https://www.beijing.gov.cn/zhengce/zcjd/202603/t20260330_4570014.html",
    verifiedAt: "2026-07-11",
  },
  [DEMO_IDS.policies.residentMedicalInsurance]: {
    documentName: "2026年度北京市城乡居民基本医疗保险参保时间及缴费标准",
    issuingAuthorities: "北京市医疗保障局",
    publishedAt: "2025-12-08",
    effectiveDate: "2026年度",
    officialUrl:
      "https://ybj.beijing.gov.cn/2020_zwfw/2020_cjwt/202512/t20251208_4327187.html",
    verifiedAt: "2026-07-11",
  },
  [DEMO_IDS.policies.minimumLivingAllowance]: {
    documentName: "北京市民政局 北京市财政局关于调整本市最低生活保障标准的通知",
    documentNumber: "京民社救发〔2024〕80号",
    issuingAuthorities: "北京市民政局、北京市财政局",
    publishedAt: "2024-08-21",
    effectiveDate: "2024-07-01",
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/202412/t20241231_3977722.html",
    verifiedAt: "2026-07-11",
  },
  [DEMO_IDS.policies.disabilityTwoSubsidies]: {
    documentName: "北京市困难残疾人生活补贴和重度残疾人护理补贴制度实施办法",
    documentNumber: "京民福发〔2016〕434号",
    issuingAuthorities: "北京市民政局等五部门",
    publishedAt: "2016-11-16",
    effectiveDate: "2016-01-01",
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/201905/t20190522_59619.html",
    interpretationUrl:
      "https://www.beijing.gov.cn/zhengce/zcjd/201905/t20190523_77844.html",
    verifiedAt: "2026-07-11",
  },
  [DEMO_IDS.policies.temporaryAssistance]: {
    documentName: "北京市民政局 北京市财政局关于进一步做好临时救助工作的通知",
    documentNumber: "京民社救发〔2020〕86号",
    issuingAuthorities: "北京市民政局、北京市财政局",
    publishedAt: "2020-07-27",
    effectiveDate: "现行有效",
    officialUrl:
      "https://www.beijing.gov.cn/zhengce/zhengcefagui/202009/t20200909_2042924.html",
    verifiedAt: "2026-07-11",
  },
};

export function getPolicySource(policyId: string) {
  const curatedSource = policySourceMap[policyId];
  if (curatedSource) {
    return curatedSource;
  }

  const policy = manifest.policies.find((item) => item.policyId === policyId);
  const document = policy?.documentIds
    .map((documentId) => manifest.documents.find((item) => item.documentId === documentId))
    .find((item) => item?.status === "active");

  if (!document) {
    return null;
  }

  return {
    documentName: document.officialName,
    documentNumber: document.documentNumber,
    issuingAuthorities: document.issuingAuthorities.join("、"),
    publishedAt: document.publishedAt ?? "待核对",
    effectiveDate: document.effectiveFrom ?? "现行有效",
    officialUrl: document.officialUrl,
    interpretationUrl: document.interpretationUrls[0],
    verifiedAt: document.verifiedAt ?? document.collectedAt,
  };
}

export const commonApplicationSteps = [
  "先核对政策适用对象、待遇衔接和当前办理口径",
  "按政策详情准备身份证明、户籍及对应资格材料",
  "通过线上渠道或西红门镇、社区相关便民窗口提出申请",
  "由对应主管部门审核，最终结果以正式受理和审批意见为准",
] as const;

export const policyNotice =
  "本页面用于辅助发现可能符合的政策，不构成正式资格认定。西红门镇便民窗口及相关主管部门将根据户籍、年龄、收入、参保、残疾等级和待遇衔接等情况进行审核。";
