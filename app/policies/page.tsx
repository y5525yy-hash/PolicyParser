import Link from "next/link";

import { mockPolicies } from "@/features/policy/mock-policies";

export default function PoliciesPage() {
  return (
    <section>
      <div className="card-grid">
        {mockPolicies.map((policy) => (
          <article className="policy-card" key={policy.id}>
            <div>
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
