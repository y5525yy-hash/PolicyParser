import Link from "next/link";
import { notFound } from "next/navigation";

import { getMockPolicy, mockPolicies } from "@/features/policy/mock-policies";

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
      <p className="eyebrow">{policy.region}</p>
      <h1>{policy.name}</h1>
      <p className="official-name">政策原文名称：{policy.originalName}</p>

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
          <p>生效日期：{policy.effectiveDate}</p>
          <p>政策更新时间：{policy.updatedAt}</p>
          <a href={policy.officialUrl} rel="noreferrer" target="_blank">查看北京市官方政策入口</a>
        </section>
      </div>

      <Link className="primary-button" href={`/matching?policyId=${policy.id}`}>
        匹配本村居民
      </Link>
    </article>
  );
}

