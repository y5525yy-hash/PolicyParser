interface MatchingPageProps {
  searchParams: Promise<{ policyId?: string }>;
}

export default async function MatchingPage({ searchParams }: MatchingPageProps) {
  const { policyId = "policy-001" } = await searchParams;
  return (
    <section className="module-placeholder matching-shell">
      <div className="matching-context">
        <div>
          <strong>当前政策：{policyId}</strong>
          <span>　匹配范围：西红门镇模拟居民档案</span>
        </div>
        <span>数据结果仅用于工作人员辅助核查</span>
      </div>

      <div className="matching-empty">
        <strong>匹配规则结果接入中</strong>
        <p>结果将在此处按“高度匹配、待核实、暂不匹配”分组展示。</p>
      </div>
    </section>
  );
}

