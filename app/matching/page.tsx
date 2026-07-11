interface MatchingPageProps {
  searchParams: Promise<{ policyId?: string }>;
}

export default async function MatchingPage({ searchParams }: MatchingPageProps) {
  const { policyId = "policy-001" } = await searchParams;
  return <section className="module-placeholder"><p className="eyebrow">政策编号 {policyId}</p><h1>居民匹配结果</h1><p>匹配入口和参数契约已就绪，规则结果由 C 在 feature/matching 分支实现。</p></section>;
}

