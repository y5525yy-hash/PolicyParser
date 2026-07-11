import Link from "next/link";

import { mockPolicies } from "@/features/policy/mock-policies";
import { policySource } from "@/features/policy/policy-source";

export default function PoliciesPage() {
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">北京市大兴区西红门镇</p>
        <h1>政策知识库</h1>
        <p>用大白话查看政策对象、待遇标准、办理材料和官方出处。</p>
      </div>

      <div className="source-summary" aria-label="政策来源说明">
        <div>
          <span className="source-label">统一政策依据</span>
          <strong>{policySource.documentNumber}</strong>
          <p>{policySource.documentName}</p>
        </div>
        <div className="source-summary-meta">
          <span>现行有效</span>
          <span>{policySource.effectiveDate} 起施行</span>
          <span>{policySource.verifiedAt} 已核验</span>
        </div>
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
                <dt>补贴标准</dt>
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

      <p className="policy-disclaimer">
        页面用于政策初筛和代办准备，不替代西红门镇受理窗口及大兴区民政部门的正式审核。
      </p>
    </section>
  );
}
