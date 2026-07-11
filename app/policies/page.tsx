import Link from "next/link";

import { mockPolicies } from "@/features/policy/mock-policies";
import {
  getPolicyCategoryId,
  isPolicyCategoryId,
  policyCategories,
} from "@/features/policy/policy-categories";

interface PoliciesPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function PoliciesPage({ searchParams }: PoliciesPageProps) {
  const { category } = await searchParams;
  const activeCategory = category && isPolicyCategoryId(category) ? category : null;
  const visiblePolicies = activeCategory
    ? mockPolicies.filter((policy) => getPolicyCategoryId(policy.id) === activeCategory)
    : mockPolicies;
  const activeCategoryDefinition = activeCategory
    ? policyCategories.find((item) => item.id === activeCategory)
    : null;
  const activeCategoryName = activeCategoryDefinition?.name ?? "全部政策";

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">北京市大兴区 · 西红门镇便民服务</p>
        <h1>西红门镇政策知识库</h1>
        <p>按民生领域快速查找政策，用大白话查看适用对象、待遇标准、办理材料和官方出处。</p>
      </div>

      <div className="knowledge-summary" aria-label="政策库收录概况">
        <div className="summary-number">
          <strong>{mockPolicies.length}</strong>
          <span>项已核验政策</span>
        </div>
        <div>
          <strong>{policyCategories.length} 个民生分类</strong>
          <p>覆盖老年福利、养老医保、社会救助和残疾人保障，内容均链接至官方来源。</p>
        </div>
      </div>

      <div className="policy-browser">
        <aside className="category-panel" aria-label="政策分类">
          <div className="category-panel-heading">
            <p className="eyebrow">政策分类</p>
            <h2>按领域查看</h2>
          </div>
          <nav className="category-navigation">
            <Link
              aria-current={!activeCategory ? "page" : undefined}
              className={!activeCategory ? "is-active" : undefined}
              href="/policies"
            >
              <span>全部政策</span>
              <strong>{mockPolicies.length}</strong>
            </Link>
            {policyCategories.map((item) => {
              const count = mockPolicies.filter(
                (policy) => getPolicyCategoryId(policy.id) === item.id,
              ).length;

              return (
                <Link
                  aria-current={activeCategory === item.id ? "page" : undefined}
                  className={activeCategory === item.id ? "is-active" : undefined}
                  href={`/policies?category=${item.id}`}
                  key={item.id}
                >
                  <span>{item.shortName}</span>
                  <strong>{count || "待接入"}</strong>
                </Link>
              );
            })}
          </nav>
          <div className="category-guide">
            {policyCategories.map((item) => (
              <div key={item.id}>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <span>{item.examples.join("、")}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="policy-results">
          <div className="results-heading">
            <div>
              <p className="eyebrow">当前列表</p>
              <h2>{activeCategoryName}</h2>
            </div>
            <span>{visiblePolicies.length} 项政策</span>
          </div>

          {visiblePolicies.length > 0 ? (
            <div className="card-grid">
              {visiblePolicies.map((policy) => (
                <article className="policy-card" key={policy.id}>
                  <div>
                    <div className="policy-card-badges">
                      <span className="category-badge">
                        {policyCategories.find(
                          (item) => item.id === getPolicyCategoryId(policy.id),
                        )?.name}
                      </span>
                      <span className="region-badge">{policy.region}</span>
                    </div>
                    <h2>{policy.name}</h2>
                    <p>{policy.summary}</p>
                  </div>
                  <dl className="card-meta">
                    <div>
                      <dt>待遇/缴费标准</dt>
                      <dd>{policy.benefitText}</dd>
                    </div>
                    <div>
                      <dt>适用/施行时间</dt>
                      <dd>{policy.effectiveDate}</dd>
                    </div>
                  </dl>
                  <Link className="primary-link" href={`/policies/${policy.id}`}>
                    查看详情
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-policy-state">
              <span>政策来源待核验</span>
              <h3>该分类已纳入需求范围</h3>
              <p>正式政策将在核对适用地区、现行状态和官方出处后接入，不使用未经核验的占位内容。</p>
              {activeCategoryDefinition ? (
                <p className="empty-policy-example">
                  需求手册示例：{activeCategoryDefinition.examples.join("、")}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <p className="policy-disclaimer">
        页面用于政策初筛和代办准备，不替代西红门镇受理窗口及相关主管部门的正式审核。
      </p>
    </section>
  );
}
