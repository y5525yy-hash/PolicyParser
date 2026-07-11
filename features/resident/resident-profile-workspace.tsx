"use client";

import Link from "next/link";
import { useState } from "react";

import { AddCaseTaskButton } from "@/features/case-task/add-case-task-button";
import { mockPolicies } from "@/features/policy/mock-policies";
import type { ResidentDirectoryRecord } from "@/features/resident/resident-directory-data";
import styles from "@/features/resident/resident-profile.module.css";
import type { SimilarResident } from "@/features/resident/similar-residents";
import { MATCH_STATUS_LABELS } from "@/shared/demo-constants";
import type { MatchResult } from "@/shared/types";

interface ResidentProfileWorkspaceProps {
  backHref: string;
  matches: MatchResult[];
  previousHref?: string;
  record: ResidentDirectoryRecord;
  similarResidents: SimilarResident[];
}

type DrawerState =
  | { type: "record" }
  | { policyId: string; type: "policy" }
  | null;

export function ResidentProfileWorkspace({
  backHref,
  matches,
  previousHref,
  record,
  similarResidents,
}: ResidentProfileWorkspaceProps) {
  const [expandedMaterials, setExpandedMaterials] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const { resident, metadata } = record;
  const policyMatches = matches.flatMap((match) => {
    const policy = mockPolicies.find((item) => item.id === match.policyId);
    return policy ? [{ match, policy }] : [];
  });
  const activeMatches = policyMatches.filter(
    ({ match }) => match.status !== "unmatched",
  );
  const unmatchedMatches = policyMatches.filter(
    ({ match }) => match.status === "unmatched",
  );
  const matchedCount = matches.filter((match) => match.status === "matched").length;
  const pendingCount = matches.filter((match) => match.status === "pending").length;
  const pendingItems = activeMatches.flatMap(({ match, policy }) =>
    match.missingFields.map((field) => `${policy.name}：${field}`),
  );
  const openPolicy =
    drawer?.type === "policy"
      ? policyMatches.find(({ policy }) => policy.id === drawer.policyId)
      : undefined;
  const verificationClass =
    metadata.verificationStatus === "已核实"
      ? styles.verificationVerified
      : metadata.verificationStatus === "部分核实"
        ? styles.verificationPartial
        : styles.verificationPending;

  function toggleMaterials(policyId: string) {
    setExpandedMaterials((current) =>
      current.includes(policyId)
        ? current.filter((id) => id !== policyId)
        : [...current, policyId],
    );
  }

  return (
    <section className={styles.profileWorkspace}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link className={styles.backLink} href={backHref}>
            ← 返回居民列表
          </Link>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.safetyNotice}>敏感信息默认脱敏展示</span>
          <button
            className={styles.actionButton}
            onClick={() => setDrawer({ type: "record" })}
            type="button"
          >
            查看完整居民档案
          </button>
        </div>
      </header>

      <div className={styles.columns}>
        <aside className={styles.leftPanel} aria-label="居民核心档案">
          <div className={styles.portraitBlock}>
            <div
              aria-label={`${resident.name}的匿名中性证件照占位`}
              className={styles.portrait}
              role="img"
            />
            <div className={styles.identity}>
              <h1>{resident.name}</h1>
              <p>{metadata.gender} · {resident.age ?? "年龄待核实"} 岁</p>
              <p>{metadata.administrativeVillage} · {metadata.villageGroup}</p>
              <p>档案编号：{resident.id}</p>
            </div>
          </div>

          <div className={styles.tagList}>
            {resident.labels.slice(0, 4).map((label) => (
              <span className={styles.tag} key={label}>{label}</span>
            ))}
          </div>

          <h2 className={styles.sectionHeading}>核心档案</h2>
          <dl className={styles.profileFacts}>
            <div className={styles.factRow}><dt>户籍状态</dt><dd>{metadata.householdTags.join("、")}</dd></div>
            <div className={styles.factRow}><dt>居住情况</dt><dd>{resident.livingStatus ?? "待核实"}</dd></div>
            <div className={styles.factRow}><dt>家庭人口</dt><dd>{metadata.familyPopulation} 人</dd></div>
            <div className={styles.factRow}><dt>收入情况</dt><dd>{resident.lowIncomeStatus ?? "待核实"}</dd></div>
            <div className={styles.factRow}><dt>健康/残疾</dt><dd>{resident.disabilityStatus ?? "待核实"}</dd></div>
            <div className={styles.factRow}><dt>联系电话</dt><dd>{metadata.maskedPhone}</dd></div>
            <div className={styles.factRow}><dt>档案来源</dt><dd>{metadata.recordSource}</dd></div>
            <div className={styles.factRow}><dt>更新时间</dt><dd>{metadata.updatedAt}</dd></div>
            <div className={styles.factRow}>
              <dt>人工核实</dt>
              <dd><span className={verificationClass}>{metadata.verificationStatus}</span></dd>
            </div>
          </dl>

          <button
            className={styles.recordButton}
            onClick={() => setDrawer({ type: "record" })}
            type="button"
          >
            展开完整档案
          </button>
        </aside>

        <main className={styles.centerPanel}>
          <div className={styles.metricRow}>
            <div className={styles.metric}><strong>{metadata.enjoyedPolicies.length}</strong><span>已享受政策</span></div>
            <div className={styles.metric}><strong>{matchedCount}</strong><span>高度匹配</span></div>
            <div className={styles.metric}><strong>{pendingCount}</strong><span>待核实政策</span></div>
          </div>

          <section className={styles.pendingFocus}>
            <strong>优先待核实</strong>
            {pendingItems.length > 0 ? (
              <ul>{pendingItems.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
            ) : (
              <span>当前没有待补充信息，仍需经办人员完成最终核验。</span>
            )}
          </section>

          <div className={styles.policyStack}>
            {activeMatches.map(({ match, policy }) => {
              const materialsExpanded = expandedMaterials.includes(policy.id);
              const nextStep =
                match.status === "matched"
                  ? "核验现有待遇和发放账户，材料齐备后交由经办人员复核。"
                  : `优先补齐“${match.missingFields[0] ?? "必要信息"}”，再重新执行资格核查。`;

              return (
                <article className={styles.policyCard} key={policy.id}>
                  <header className={styles.policyCardHeader}>
                    <Link className={styles.policyTitle} href={`/policies/${policy.id}`}>
                      {policy.name}
                    </Link>
                    <span className={match.status === "matched" ? styles.statusMatched : styles.statusPending}>
                      {MATCH_STATUS_LABELS[match.status]}
                    </span>
                  </header>
                  <div className={styles.policyBody}>
                    <p className={styles.benefit}>政策标准 / 预计权益：{policy.benefitText}</p>
                    <div className={styles.conditionGrid}>
                      <section className={styles.conditionBlock}>
                        <h3>已满足条件</h3>
                        <ul>{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                      </section>
                      <section className={styles.conditionBlock}>
                        <h3>待核实条件</h3>
                        {match.missingFields.length > 0 ? (
                          <ul>{match.missingFields.map((field) => <li key={field}>{field}</li>)}</ul>
                        ) : <span>暂无，仍需人工复核</span>}
                      </section>
                    </div>
                    <div className={styles.nextStep}><strong>建议下一步</strong><span>{nextStep}</span></div>
                    <div className={styles.materialSummary}>
                      <strong>材料摘要</strong>
                      <span>{policy.materials.slice(0, 2).join("；")}</span>
                    </div>
                    {materialsExpanded ? (
                      <div className={styles.materialDetails}>
                        <ul>{policy.materials.map((material) => <li key={material}>{material}</li>)}</ul>
                      </div>
                    ) : null}
                    <div className={styles.cardActions}>
                      <button className={styles.actionButton} onClick={() => toggleMaterials(policy.id)} type="button">
                        {materialsExpanded ? "收起材料" : "展开材料"}
                      </button>
                      <button className={styles.actionButton} onClick={() => setDrawer({ type: "policy", policyId: policy.id })} type="button">
                        查看政策依据
                      </button>
                      <Link className={styles.textLink} href={`/policies/${policy.id}`}>查看政策详情</Link>
                      <AddCaseTaskButton policyId={policy.id} residentId={resident.id} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {unmatchedMatches.length > 0 ? (
            <details className={styles.unmatchedSection}>
              <summary>暂不匹配政策（{unmatchedMatches.length} 项）</summary>
              <div className={styles.unmatchedList}>
                {unmatchedMatches.map(({ match, policy }) => (
                  <p key={policy.id}><strong>{policy.name}：</strong>{match.reasons.join("；")}</p>
                ))}
              </div>
            </details>
          ) : null}

          <p className={styles.fixedDisclaimer}>系统结果仅供工作人员辅助核查，不作为正式审批结论</p>
        </main>

        <aside className={styles.rightPanel} aria-label="同类居民">
          <h2>同类居民</h2>
          {previousHref ? <Link className={styles.previousLink} href={previousHref}>← 返回上一位居民</Link> : null}
          <div className={styles.similarList}>
            {similarResidents.map(({ reason, record: similar }) => (
              <article className={styles.similarItem} key={similar.resident.id}>
                <div className={styles.miniPortrait} aria-hidden="true" />
                <div>
                  <Link
                    className={styles.similarName}
                    href={`/residents/${similar.resident.id}?from=${encodeURIComponent(backHref)}&previous=${resident.id}`}
                  >
                    {similar.resident.name}
                  </Link>
                  <div className={styles.similarMeta}>
                    <span>{similar.metadata.gender} · {similar.resident.age} 岁</span>
                    <span>{similar.metadata.villageGroup}</span>
                    {similar.resident.labels.slice(0, 1).map((label) => <span className={styles.similarTag} key={label}>{label}</span>)}
                  </div>
                  <p className={styles.similarReason}>{reason}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {drawer ? (
        <div className={styles.drawerBackdrop} onClick={() => setDrawer(null)} role="presentation">
          <aside className={styles.drawer} onClick={(event) => event.stopPropagation()} aria-label="详情抽屉">
            <header className={styles.drawerHeader}>
              <h2>{drawer.type === "record" ? `${resident.name}完整档案` : `${openPolicy?.policy.name ?? "政策"}依据`}</h2>
              <button aria-label="关闭抽屉" className={styles.closeButton} onClick={() => setDrawer(null)} type="button">×</button>
            </header>

            {drawer.type === "record" ? (
              <div className={styles.drawerGrid}>
                <section className={styles.drawerSection}><h3>基本信息</h3><p>{metadata.gender}，{resident.age} 岁，{metadata.politicalStatus}，{metadata.administrativeVillage}{metadata.villageGroup}。</p></section>
                <section className={styles.drawerSection}><h3>家庭与居住</h3><p>{metadata.familySummary}；家庭人口 {metadata.familyPopulation} 人；户籍状态为 {metadata.householdTags.join("、")}。</p></section>
                <section className={styles.drawerSection}><h3>工作情况</h3><p>{metadata.workUnit}（{metadata.workUnitCategory}）。</p></section>
                <section className={styles.drawerSection}><h3>健康与特殊群体</h3><p>{resident.disabilityStatus ?? "待核实"}；重点标签：{resident.labels.join("、")}。</p></section>
                <section className={styles.drawerSection}><h3>收入与保障</h3><p>{resident.lowIncomeStatus ?? "待核实"}；{resident.insuranceStatus ?? "参保信息待核实"}。</p></section>
                <section className={styles.drawerSection}><h3>已享受政策</h3><p>{metadata.enjoyedPolicies.length > 0 ? metadata.enjoyedPolicies.join("、") : "暂无登记"}</p></section>
                <section className={styles.drawerSection}><h3>档案治理信息</h3><p>来源：{metadata.recordSource}；更新时间：{metadata.updatedAt}；人工核实：{metadata.verificationStatus}。</p></section>
                <section className={styles.drawerSection}><h3>隐私信息</h3><p>电话：{metadata.maskedPhone}。身份证号和详细地址默认不在画像页面展示。</p></section>
              </div>
            ) : openPolicy ? (
              <>
                <section className={styles.drawerSection}><h3>政策文件</h3><p>{openPolicy.policy.originalName}</p><p>生效日期：{openPolicy.policy.effectiveDate}；更新日期：{openPolicy.policy.updatedAt}</p></section>
                <section className={styles.drawerSection}><h3>适用对象</h3><ul>{openPolicy.policy.applicableTo.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className={styles.drawerSection}><h3>本次匹配依据</h3><ul>{openPolicy.match.reasons.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className={styles.drawerSection}><h3>待核实事项</h3>{openPolicy.match.missingFields.length > 0 ? <ul>{openPolicy.match.missingFields.map((item) => <li key={item}>{item}</li>)}</ul> : <p>暂无，仍需人工复核。</p>}</section>
                <section className={styles.drawerSection}><h3>官方来源</h3><a className={styles.textLink} href={openPolicy.policy.officialUrl} rel="noreferrer" target="_blank">打开官方政策来源</a></section>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
