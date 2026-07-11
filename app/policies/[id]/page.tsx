import Link from "next/link";
import { notFound } from "next/navigation";

import { getMockPolicy, mockPolicies } from "@/features/policy/mock-policies";
import {
  commonApplicationSteps,
  policyNotice,
  policySource,
} from "@/features/policy/policy-source";

interface PolicyDetailPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return mockPolicies.map((policy) => ({ id: policy.id }));
}

export default async function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const { id } = await params;
  const policy = getMockPolicy(id);

  if (!policy) {
    notFound();
  }

  return (
    <article className="detail-card">
      <Link className="back-link" href="/policies">
        ← 返回政策知识库
      </Link>
      <h1>{policy.name}</h1>

      <div className="verification-banner">
        <span>可能符合</span>
        <p>{policyNotice}</p>
      </div>

      <section className="detail-section">
        <h2>大白话解释</h2>
        <p>{policy.summary}</p>
      </section>

      <div className="detail-grid">
        <section className="detail-section">
          <h2>适用对象</h2>
          <ul>{policy.applicableTo.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="detail-section">
          <h2>补贴标准</h2>
          <p>{policy.benefitText}</p>
        </section>
        <section className="detail-section">
          <h2>所需材料</h2>
          <ul>{policy.materials.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="detail-section">
          <h2>政策信息</h2>
          <p>文号：{policySource.documentNumber}</p>
          <p>发布机构：{policySource.issuingAuthorities}</p>
          <p>生效日期：{policy.effectiveDate}</p>
          <p>发布日期：{policy.updatedAt}</p>
          <div className="official-links">
            <a href={policy.officialUrl} rel="noreferrer" target="_blank">
              查看官方政策原文 ↗
            </a>
            <a href={policySource.interpretationUrl} rel="noreferrer" target="_blank">
              查看官方政策解读 ↗
            </a>
          </div>
        </section>
      </div>

      <section className="application-section">
        <div>
          <h2>申请与审核怎么走</h2>
        </div>
        <ol>
          {commonApplicationSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="detail-actions">
        <Link className="primary-button" href={`/matching?policyId=${policy.id}`}>
          匹配本村居民
        </Link>
        <span>先查看可能匹配，再由代办员补充待核实信息</span>
      </div>
    </article>
  );
}
