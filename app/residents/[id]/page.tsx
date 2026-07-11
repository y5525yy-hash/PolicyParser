interface ResidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResidentDetailPage({ params }: ResidentDetailPageProps) {
  const { id } = await params;
  return <section className="module-placeholder"><p className="eyebrow">居民编号 {id}</p><h1>居民详情</h1><p>详情路由已就绪，页面内容由 B 在 feature/resident 分支实现。</p></section>;
}

