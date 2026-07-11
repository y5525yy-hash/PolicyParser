import Link from "next/link";

import { mockPolicies } from "@/features/policy/mock-policies";

export default function PoliciesPage() {
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">北京市大兴区西红门镇</p>
        <h1>政策知识库</h1>
        <p>用大白话查看政策要点、办理材料和官方出处。</p>
      </div>

      <div className="card-grid">
        {mockPolicies.map((policy) => (
          <article className="policy-card" key={policy.id}>
            <div>
              <span className="region-badge">{policy.region}</span>
              <h2>{policy.name}</h2>
              <p>{policy.summary}</p>
            </div>
            <dl className="card-meta">
              <div>
                <dt>待遇简述</dt>
                <dd>{policy.benefitText}</dd>
              </div>
              <div>
                <dt>生效日期</dt>
                <dd>{policy.effectiveDate}</dd>
              </div>
            </dl>
            <Link className="primary-link" href={`/policies/${policy.id}`}>
              查看详情
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

