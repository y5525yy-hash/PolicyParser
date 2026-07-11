import Link from "next/link";

import { DEMO_IDS, MATCH_STATUS_LABELS } from "@/shared/demo-constants";
import type { MatchResult } from "@/shared/types";
import { demoPolicies, demoResidents } from "@/features/matching/match-fixtures";
import { matchResidentsByPolicy } from "@/features/matching/matching-service";

interface MatchingPageProps {
  searchParams: Promise<{ policyId?: string }>;
}

export default async function MatchingPage({ searchParams }: MatchingPageProps) {
  const { policyId: requestedPolicyId } = await searchParams;
  const policyId =
    requestedPolicyId?.trim() || DEMO_IDS.policies.elderlyAllowance;
  const policy = demoPolicies.find((item) => item.id === policyId);

  let results: MatchResult[] = [];
  let loadError: string | null = null;
  try {
    results = await matchResidentsByPolicy(policyId);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "居民匹配结果加载失败，请稍后重试。";
  }

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">政策编号 {policyId}</p>
        <h1>{policy ? `${policy.name} · 居民匹配结果` : "居民匹配结果"}</h1>
        <p>
          根据已录入的居民信息进行初步匹配，结果仅供代办员核查参考，最终资格以经办部门审核为准。
        </p>
      </div>

      {loadError ? (
        <p>{loadError}</p>
      ) : (
        <div className="card-grid">
          {results.map((result) => {
            const resident = demoResidents.find((item) => item.id === result.residentId);
            return (
              <article className="policy-card" key={result.residentId}>
                <div>
                  <span className="region-badge">{MATCH_STATUS_LABELS[result.status]}</span>
                  <h2>{resident?.name ?? result.residentId}</h2>
                  {resident?.labels && resident.labels.length > 0 ? (
                    <p>{resident.labels.join(" · ")}</p>
                  ) : null}
                </div>
                <dl className="card-meta">
                  <div>
                    <dt>匹配原因</dt>
                    <dd>
                      <ul>
                        {result.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  {result.missingFields.length > 0 ? (
                    <div>
                      <dt>待核实信息</dt>
                      <dd>
                        <ul>
                          {result.missingFields.map((field) => (
                            <li key={field}>{field}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <Link
                  className="primary-link"
                  href={`/residents/${result.residentId}`}
                >
                  查看居民档案
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
