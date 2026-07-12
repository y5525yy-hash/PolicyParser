import Link from "next/link";

import { DEMO_IDS, MATCH_STATUS_LABELS } from "@/shared/demo-constants";
import type { MatchResult } from "@/shared/types";
import { getMockPolicy } from "@/features/policy/mock-policies";
import { formatPolicyEvidenceText } from "@/features/policy/policy-evidence-format";
import { mockResidents } from "@/features/resident/mock-residents";
import { residentDirectoryRecords } from "@/features/resident/resident-directory-data";
import {
  getPolicyEvidenceForDisplay,
  getPolicyResidentFactDisplay,
} from "@/features/matching/integrated-providers";
import type { ResidentFactDisplayItem } from "@/features/matching/integration-contracts";
import {
  getMatchingRuntimeInfo,
  matchResidentsByPolicy,
} from "@/features/matching/matching-service";
import styles from "@/features/matching/matching.module.css";

interface MatchingPageProps {
  searchParams: Promise<{ policyId?: string }>;
}

export default async function MatchingPage({ searchParams }: MatchingPageProps) {
  const { policyId: requestedPolicyId } = await searchParams;
  const policyId =
    requestedPolicyId?.trim() || DEMO_IDS.policies.elderlyAllowance;
  const policy = getMockPolicy(policyId);
  const runtimeInfo = getMatchingRuntimeInfo();

  let results: MatchResult[] = [];
  let residentFactDisplay: Record<string, ResidentFactDisplayItem[]> = {};
  let policyEvidence = await getPolicyEvidenceForDisplay(policyId);
  let loadError: string | null = null;
  try {
    [results, residentFactDisplay] = await Promise.all([
      matchResidentsByPolicy(policyId),
      getPolicyResidentFactDisplay(policyId),
    ]);
  } catch (error) {
    policyEvidence = [];
    loadError =
      error instanceof Error ? error.message : "居民匹配结果加载失败，请稍后重试。";
  }

  return (
    <section className={styles.matchingPage}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>政策编号 {policyId}</p>
        <h1>{policy ? `${policy.name} · 居民匹配结果` : "居民匹配结果"}</h1>
        <p>
          根据已录入的居民信息进行初步匹配，结果仅供代办员核查参考，最终资格以经办部门审核为准。
        </p>
        <p>
          匹配方式：
          {runtimeInfo.llmEnabled
            ? `${runtimeInfo.model} 辅助核验政策字段与居民字段的语义对应，确定性规则脚本负责资格计算；模型异常时自动安全回退。`
            : "本地字段词典完成语义对应，确定性规则脚本负责资格计算。"}
        </p>
      </div>

      {loadError ? (
        <p className={styles.errorState}>{loadError}</p>
      ) : (
        <>
          {policyEvidence.length > 0 ? (
            <section className={styles.evidencePanel}>
              <h2>本次匹配使用的政策依据</h2>
              <ul>
                {policyEvidence.map((chunk) => (
                  <li key={chunk.chunkId}>
                    <p>{formatPolicyEvidenceText(chunk.text)}</p>
                    <p>
                      片段：{chunk.chunkId} ·{" "}
                      <a href={chunk.sourceUrl} target="_blank" rel="noreferrer">
                        查看官方出处
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className={styles.resultSummary}>
            共核查 {results.length} 名居民，建议联系或补充核实{" "}
            {results.filter((result) => result.status !== "unmatched").length} 人；明确不符合者不进入走访名单。
          </p>
          <div className={styles.resultGrid}>
          {results.map((result) => {
            const resident = mockResidents.find((item) => item.id === result.residentId);
            const directoryRecord = residentDirectoryRecords.find(
              (record) => record.resident.id === result.residentId,
            );
            return (
              <article className={styles.resultCard} key={result.residentId}>
                <div>
                  <span className={styles.statusBadge} data-status={result.status}>
                    {MATCH_STATUS_LABELS[result.status]}
                  </span>
                  <h2>{resident?.name ?? result.residentId}</h2>
                  {resident?.labels && resident.labels.length > 0 ? (
                    <p>{resident.labels.join(" · ")}</p>
                  ) : null}
                  {directoryRecord ? (
                    <p>
                      {directoryRecord.metadata.administrativeVillage} ·{" "}
                      {directoryRecord.metadata.gridName} ·{" "}
                      {directoryRecord.metadata.villageGroup}
                    </p>
                  ) : null}
                </div>
                <dl className={styles.resultMeta}>
                  <div>
                    <dt>本次用于匹配的居民数据</dt>
                    <dd>
                      <ul>
                        {(residentFactDisplay[result.residentId] ?? []).map(
                          (item) => (
                            <li key={item.label}>
                              {item.label}：{item.value}
                            </li>
                          ),
                        )}
                      </ul>
                    </dd>
                  </div>
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
                  className={styles.primaryLink}
                  href={`/residents/${result.residentId}`}
                >
                  查看居民档案
                </Link>
              </article>
            );
          })}
          </div>
        </>
      )}
    </section>
  );
}
