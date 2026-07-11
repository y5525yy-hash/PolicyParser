import Link from "next/link";

import { mockPolicies } from "@/features/policy/mock-policies";
import { searchPolicyClauses } from "@/features/policy/knowledge-base/retrieval";
import {
  getPolicyCategoryId,
  isPolicyCategoryId,
  policyCategories,
} from "@/features/policy/policy-categories";

interface PoliciesPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function PoliciesPage({ searchParams }: PoliciesPageProps) {
  const { category, q } = await searchParams;
  const query = q?.trim() ?? "";
  const retrievalResults = await searchPolicyClauses(query, 6);
  const activeCategory = category && isPolicyCategoryId(category) ? category : null;
  const visibleRetrievalResults = activeCategory
    ? retrievalResults.filter(
        (result) => getPolicyCategoryId(result.policyId) === activeCategory,
      )
    : retrievalResults;
  const retrievedPolicyIds = new Set(
    visibleRetrievalResults.map((result) => result.policyId),
  );
  const visiblePolicies = mockPolicies.filter(
    (policy) =>
      (!activeCategory || getPolicyCategoryId(policy.id) === activeCategory) &&
      (!query || retrievedPolicyIds.has(policy.id)),
  );
  const activeCategoryDefinition = activeCategory
    ? policyCategories.find((item) => item.id === activeCategory)
    : null;
  const activeCategoryName = activeCategoryDefinition?.name ?? "全部政策";

  return (
    <section>
      <form className="policy-search" method="get">
        {activeCategory ? <input name="category" type="hidden" value={activeCategory} /> : null}
        <label htmlFor="policy-query">搜索政策名称、对象或资格条件原文</label>
        <div>
          <input
            defaultValue={query}
            id="policy-query"
            name="q"
            placeholder="例如：本市户籍 家庭财产 医疗救助"
            type="search"
          />
          <button type="submit">本地检索</button>
          {query ? <Link href={activeCategory ? `/policies?category=${activeCategory}` : "/policies"}>清除</Link> : null}
        </div>
      </form>

      {query && visibleRetrievalResults.length > 0 ? (
        <section className="retrieval-results" aria-label="政策原文检索结果">
          <div className="results-heading">
            <div>
              <p className="eyebrow">原文依据</p>
              <h2>“{query}”的相关政策片段</h2>
            </div>
            <span>{visibleRetrievalResults.length} 条依据</span>
          </div>
          <div className="retrieval-list">
            {visibleRetrievalResults.map((result) => (
              <article key={result.chunkId}>
                <div>
                  <span>{result.policyId}</span>
                  <span>{result.section}</span>
                </div>
                <h3>{result.policyName}</h3>
                <blockquote>{result.text}</blockquote>
                <p>片段 ID：{result.chunkId}</p>
                <div className="retrieval-actions">
                  <Link href={`/policies/${result.policyId}`}>查看政策详情</Link>
                  <a href={result.officialUrl} rel="noreferrer" target="_blank">官方原文 ↗</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="policy-browser">
        <aside className="category-panel" aria-label="政策分类">
          <div className="category-panel-heading">
            <p className="eyebrow">官方主题分类</p>
            <h2>按政府分类查看</h2>
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
                  href={`/policies?category=${item.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
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
                      <span className="region-badge">北京市通用</span>
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
              <span>{query ? "未找到原文片段" : "政策来源待核验"}</span>
              <h3>{query ? "换一组政策关键词试试" : "该分类已纳入需求范围"}</h3>
              <p>
                {query
                  ? "当前本地有效政策原文中没有找到足够相关的内容。可以减少关键词，或改用政策对象、待遇名称和资格条件搜索。"
                  : "正式政策将在核对适用地区、现行状态和官方出处后接入，不使用未经核验的占位内容。"}
              </p>
              {activeCategoryDefinition && !query ? (
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
