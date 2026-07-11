"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { mockPolicies } from "@/features/policy/mock-policies";
import { mockResidentMatches } from "@/features/resident/mock-matches";
import {
  politicalStatusOptions,
  residentDirectoryRecords,
  ruralGridOptions,
  workUnitCategoryOptions,
} from "@/features/resident/resident-directory-data";
import styles from "@/features/resident/resident-directory.module.css";
import { RuralGridView } from "@/features/resident/rural-grid-view";
import { MATCH_STATUS_LABELS } from "@/shared/demo-constants";

type AgeFilter = "all" | "under-60" | "60-79" | "80-plus" | "unknown";
type MatchFilter = "all" | "matched" | "pending" | "none";
type FocusFilter =
  | "all"
  | "elderly"
  | "living-alone"
  | "difficult"
  | "disability";
type GenderFilter = "all" | "女" | "男";
type ViewMode = "list" | "grid";

export interface ResidentDirectoryQuery {
  search: string;
  gender: GenderFilter;
  age: AgeFilter;
  political: string;
  workUnit: string;
  grid: string;
  focus: FocusFilter;
  match: MatchFilter;
  view: ViewMode;
  page: number;
  expanded: string[];
}

interface ResidentDirectoryTableProps {
  initialQuery: ResidentDirectoryQuery;
}

const pageSize = 4;

const focusTabs: Array<{ value: FocusFilter; label: string }> = [
  { value: "all", label: "全部人员" },
  { value: "elderly", label: "高龄老人" },
  { value: "living-alone", label: "独居人员" },
  { value: "difficult", label: "困难家庭" },
  { value: "disability", label: "失能 / 残疾" },
];

const matchTabs: Array<{ value: MatchFilter; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "matched", label: "高度匹配" },
  { value: "pending", label: "待核实" },
  { value: "none", label: "暂无潜在匹配" },
];

function buildListUrl(query: ResidentDirectoryQuery) {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.gender !== "all") params.set("gender", query.gender);
  if (query.age !== "all") params.set("age", query.age);
  if (query.political) params.set("political", query.political);
  if (query.workUnit) params.set("workUnit", query.workUnit);
  if (query.grid) params.set("grid", query.grid);
  if (query.focus !== "all") params.set("focus", query.focus);
  if (query.match !== "all") params.set("match", query.match);
  if (query.view !== "list") params.set("view", query.view);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.expanded.length > 0) {
    params.set("expanded", query.expanded.join(","));
  }

  const search = params.toString();
  return search ? `/residents?${search}` : "/residents";
}

function matchesAge(age: number | undefined, filter: AgeFilter) {
  if (filter === "all") return true;
  if (filter === "unknown") return age === undefined;
  if (age === undefined) return false;
  if (filter === "under-60") return age < 60;
  if (filter === "60-79") return age >= 60 && age < 80;
  return age >= 80;
}

function matchesFocus(
  resident: (typeof residentDirectoryRecords)[number]["resident"],
  filter: FocusFilter,
) {
  if (filter === "all") return true;
  if (filter === "elderly") return (resident.age ?? 0) >= 80;
  if (filter === "living-alone") {
    return resident.livingStatus?.includes("独居") ?? false;
  }
  if (filter === "difficult") {
    return (
      resident.lowIncomeStatus?.includes("低保") ||
      resident.lowIncomeStatus?.includes("低收入") ||
      resident.lowIncomeStatus?.includes("收入") ||
      false
    );
  }
  return (
    resident.disabilityStatus !== undefined &&
    !resident.disabilityStatus.includes("无残疾")
  );
}

export function ResidentDirectoryTable({
  initialQuery,
}: ResidentDirectoryTableProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.search);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    initialQuery.gender !== "all" ||
      initialQuery.political !== "" ||
      initialQuery.workUnit !== "",
  );
  const initialListUrl = useMemo(() => buildListUrl(initialQuery), [initialQuery]);
  const currentListUrl = buildListUrl(query);
  const activeFilterCount = [
    query.gender !== "all",
    query.age !== "all",
    query.political !== "",
    query.workUnit !== "",
    query.grid !== "",
  ].filter(Boolean).length;

  useEffect(() => {
    const savedPosition = window.sessionStorage.getItem(
      `resident-list-scroll:${initialListUrl}`,
    );

    if (savedPosition) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedPosition), behavior: "auto" });
      });
    }
  }, [initialListUrl]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = query.search.trim().toLocaleLowerCase("zh-CN");

    return residentDirectoryRecords.filter(({ resident, metadata }) => {
      const residentMatches = mockResidentMatches.filter(
        (match) => match.residentId === resident.id && match.status !== "unmatched",
      );
      const matchesSearch =
        !normalizedSearch ||
        resident.name.toLocaleLowerCase("zh-CN").includes(normalizedSearch);
      const matchesGender =
        query.gender === "all" || metadata.gender === query.gender;
      const matchesPolitical =
        !query.political || metadata.politicalStatus === query.political;
      const matchesWorkUnit =
        !query.workUnit || metadata.workUnitCategory === query.workUnit;
      const matchesGrid =
        !query.grid ||
        `${metadata.administrativeVillage} / ${metadata.gridName}` === query.grid;
      const matchesStatus =
        query.match === "all" ||
        (query.match === "none" && residentMatches.length === 0) ||
        residentMatches.some((match) => match.status === query.match);

      return (
        matchesSearch &&
        matchesGender &&
        matchesAge(resident.age, query.age) &&
        matchesPolitical &&
        matchesWorkUnit &&
        matchesGrid &&
        matchesFocus(resident, query.focus) &&
        matchesStatus
      );
    });
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(query.page, pageCount);
  const pageRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function updateQuery(
    patch: Partial<ResidentDirectoryQuery>,
    resetPage = true,
  ) {
    const nextQuery = {
      ...query,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? query.page),
    };
    setQuery(nextQuery);
    window.history.replaceState(null, "", buildListUrl(nextQuery));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ search: searchInput.trim() });
  }

  function clearFilters() {
    const nextQuery: ResidentDirectoryQuery = {
      search: "",
      gender: "all",
      age: "all",
      political: "",
      workUnit: "",
      grid: "",
      focus: "all",
      match: "all",
      view: "list",
      page: 1,
      expanded: [],
    };
    setSearchInput("");
    setQuery(nextQuery);
    window.history.replaceState(null, "", "/residents");
  }

  function toggleExpanded(residentId: string) {
    const expanded = query.expanded.includes(residentId)
      ? query.expanded.filter((id) => id !== residentId)
      : [...query.expanded, residentId];
    updateQuery({ expanded }, false);
  }

  function saveScrollPosition() {
    window.sessionStorage.setItem(
      `resident-list-scroll:${currentListUrl}`,
      String(window.scrollY),
    );
  }

  function changePage(page: number) {
    updateQuery({ page }, false);
    document.getElementById("resident-directory-table")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className={styles.workspace}>
      <div aria-label="人员管理视图" className={styles.viewTabs} role="tablist">
        <button
          aria-selected={query.view === "list"}
          className={`${styles.viewTab} ${query.view === "list" ? styles.viewTabActive : ""}`}
          onClick={() => updateQuery({ view: "list" }, false)}
          role="tab"
          type="button"
        >
          人员档案列表
        </button>
        <button
          aria-selected={query.view === "grid"}
          className={`${styles.viewTab} ${query.view === "grid" ? styles.viewTabActive : ""}`}
          onClick={() => updateQuery({ view: "grid" }, false)}
          role="tab"
          type="button"
        >
          乡村网格视图
        </button>
      </div>

      <div className={styles.segmentArea}>
        <div className={styles.segmentRow}>
          <span className={styles.segmentLabel}>重点人群</span>
          <div aria-label="重点人群" className={styles.segmentTabs} role="tablist">
            {focusTabs.map((tab) => (
              <button
                aria-selected={query.focus === tab.value}
                className={`${styles.segmentTab} ${query.focus === tab.value ? styles.segmentTabActive : ""}`}
                key={tab.value}
                onClick={() => updateQuery({ focus: tab.value })}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.segmentRow}>
          <span className={styles.segmentLabel}>政策匹配</span>
          <div aria-label="政策匹配" className={styles.segmentTabs} role="tablist">
            {matchTabs.map((tab) => (
              <button
                aria-selected={query.match === tab.value}
                className={`${styles.segmentTab} ${query.match === tab.value ? styles.segmentTabActive : ""}`}
                key={tab.value}
                onClick={() => updateQuery({ match: tab.value })}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarPrimary}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              aria-label="按居民姓名搜索"
              className={styles.searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="输入居民姓名"
              type="search"
              value={searchInput}
            />
            <button className={styles.primaryButton} type="submit">
              搜索
            </button>
          </form>

          <div className={styles.quickFilters}>
            <div className={styles.filterField}>
              <label htmlFor="age-filter">年龄</label>
              <select
                className={styles.select}
                id="age-filter"
                onChange={(event) =>
                  updateQuery({ age: event.target.value as AgeFilter })
                }
                value={query.age}
              >
                <option value="all">全部年龄</option>
                <option value="under-60">60 岁以下</option>
                <option value="60-79">60–79 岁</option>
                <option value="80-plus">80 岁及以上</option>
                <option value="unknown">年龄待核实</option>
              </select>
            </div>

            <div className={styles.filterField}>
              <label htmlFor="grid-filter">乡村网格</label>
              <select
                className={styles.select}
                id="grid-filter"
                onChange={(event) => updateQuery({ grid: event.target.value })}
                value={query.grid}
              >
                <option value="">全部乡村网格</option>
                {ruralGridOptions.map((grid) => (
                  <option key={grid} value={grid}>{grid}</option>
                ))}
              </select>
            </div>

            <button
              aria-expanded={showAdvancedFilters}
              className={styles.secondaryButton}
              onClick={() => setShowAdvancedFilters((current) => !current)}
              type="button"
            >
              更多筛选{activeFilterCount > 0 ? `（${activeFilterCount}）` : ""}
            </button>
            <button className={styles.secondaryButton} onClick={clearFilters} type="button">
              清空
            </button>
          </div>
        </div>

        {showAdvancedFilters ? <div className={styles.filters}>
          <div className={styles.filterField}>
            <label htmlFor="gender-filter">性别</label>
            <select
              className={styles.select}
              id="gender-filter"
              onChange={(event) =>
                updateQuery({ gender: event.target.value as GenderFilter })
              }
              value={query.gender}
            >
              <option value="all">全部性别</option>
              <option value="女">女</option>
              <option value="男">男</option>
            </select>
          </div>

          <div className={styles.filterField}>
            <label htmlFor="political-filter">政治面貌</label>
            <select
              className={styles.select}
              id="political-filter"
              onChange={(event) =>
                updateQuery({ political: event.target.value })
              }
              value={query.political}
            >
              <option value="">全部政治面貌</option>
              {politicalStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label htmlFor="work-unit-filter">工作单位</label>
            <select
              className={styles.select}
              id="work-unit-filter"
              onChange={(event) => updateQuery({ workUnit: event.target.value })}
              value={query.workUnit}
            >
              <option value="">全部单位类型</option>
              {workUnitCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

        </div> : null}
      </div>

      <div className={styles.resultBar}>
        <span>
          共找到 <strong>{filteredRecords.length}</strong> 名居民
        </span>
        <span>模拟档案仅用于政策摸排，不展示完整敏感信息</span>
      </div>

      {query.view === "grid" ? (
        <RuralGridView
          currentListUrl={currentListUrl}
          records={filteredRecords}
          saveScrollPosition={saveScrollPosition}
        />
      ) : (
        <>
      <div className={styles.tableFrame} id="resident-directory-table">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>居民</th>
              <th>村组</th>
              <th>户籍与人户状态</th>
              <th>家庭情况</th>
              <th>重点标签</th>
              <th>当前已享受政策</th>
              <th>匹配到的政策</th>
              <th>待核实信息</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRecords.length === 0 ? (
              <tr>
                <td className={styles.emptyState} colSpan={10}>
                  暂无符合当前条件的居民，请调整搜索或筛选条件。
                </td>
              </tr>
            ) : (
              pageRecords.map(({ resident, metadata }) => {
                const isExpanded = query.expanded.includes(resident.id);
                const matches = mockResidentMatches.filter(
                  (match) =>
                    match.residentId === resident.id &&
                    match.status !== "unmatched",
                );
                const policyMatches = matches.flatMap((match) => {
                  const policy = mockPolicies.find(
                    (item) => item.id === match.policyId,
                  );
                  return policy ? [{ match, policy }] : [];
                });
                const displayedPolicies = isExpanded
                  ? policyMatches
                  : policyMatches.slice(0, 3);
                const displayTags = isExpanded
                  ? resident.labels
                  : resident.labels.slice(0, 3);
                const detailUrl = `/residents/${resident.id}?from=${encodeURIComponent(currentListUrl)}`;

                return (
                  <Fragment key={resident.id}>
                    <tr
                      className={isExpanded ? styles.expandedMainRow : undefined}
                    >
                      <td>
                        <Link
                          className={styles.residentName}
                          href={detailUrl}
                          onClick={saveScrollPosition}
                        >
                          {resident.name}
                        </Link>
                        <span className={styles.subText}>
                          {metadata.gender} · {resident.age ?? "年龄待核实"}
                          {resident.age === undefined ? "" : " 岁"}
                        </span>
                      </td>
                      <td>{metadata.villageGroup}</td>
                      <td>
                        <div className={styles.tagList}>
                          {metadata.householdTags.map((tag) => (
                            <span className={styles.householdTag} key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{metadata.familySummary}</td>
                      <td>
                        <div className={styles.tagList}>
                          {displayTags.map((tag) => (
                            <span className={styles.tag} key={tag}>
                              {tag}
                            </span>
                          ))}
                          {!isExpanded && resident.labels.length > 3 ? (
                            <span className={styles.tag}>
                              +{resident.labels.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {metadata.enjoyedPolicies.length > 0 ? (
                          <ul className={styles.plainList}>
                            {metadata.enjoyedPolicies.map((policy) => (
                              <li key={policy}>{policy}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className={styles.subText}>暂无登记</span>
                        )}
                      </td>
                      <td>
                        {displayedPolicies.length > 0 ? (
                          <ul className={styles.policyList}>
                            {displayedPolicies.map(({ match, policy }) => (
                              <li className={styles.policyItem} key={policy.id}>
                                <Link
                                  className={styles.policyLink}
                                  href={`/policies/${policy.id}`}
                                  onClick={saveScrollPosition}
                                >
                                  {policy.name}
                                </Link>
                                <span
                                  className={
                                    match.status === "matched"
                                      ? styles.statusMatched
                                      : styles.statusPending
                                  }
                                >
                                  {MATCH_STATUS_LABELS[match.status]}
                                </span>
                              </li>
                            ))}
                            {!isExpanded && policyMatches.length > 3 ? (
                              <li>
                                <button
                                  className={styles.textButton}
                                  onClick={() => toggleExpanded(resident.id)}
                                  type="button"
                                >
                                  查看全部 {policyMatches.length} 项
                                </button>
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          <span className={styles.statusNeutral}>暂无潜在匹配</span>
                        )}
                      </td>
                      <td>
                        {policyMatches.some(
                          ({ match }) => match.missingFields.length > 0,
                        ) ? (
                          <ul className={styles.verificationList}>
                            {policyMatches
                              .flatMap(({ match, policy }) =>
                                match.missingFields.map((field) => ({
                                  key: `${policy.id}-${field}`,
                                  policyName: policy.name,
                                  field,
                                })),
                              )
                              .slice(0, isExpanded ? undefined : 2)
                              .map((item) => (
                                <li
                                  className={styles.verificationItem}
                                  key={item.key}
                                >
                                  <strong>{item.policyName}：</strong>
                                  {item.field}
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <span className={styles.subText}>暂无待核实项</span>
                        )}
                      </td>
                      <td>{metadata.updatedAt}</td>
                      <td>
                        <div className={styles.actions}>
                          <Link
                            className={styles.actionLink}
                            href={detailUrl}
                            onClick={saveScrollPosition}
                          >
                            查看画像
                          </Link>
                          <button
                            aria-expanded={isExpanded}
                            className={styles.textButton}
                            onClick={() => toggleExpanded(resident.id)}
                            type="button"
                          >
                            {isExpanded ? "收起档案" : "展开档案"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded ? (
                      <tr key={`${resident.id}-expanded`}>
                        <td className={styles.expandedCell} colSpan={10}>
                          <div className={styles.expandedPanel}>
                            <section className={styles.expandedSection}>
                              <h3>居民档案摘要</h3>
                              <p>{metadata.profileSummary}</p>
                              <p>
                                <strong>联系方式：</strong>
                                {metadata.maskedPhone}
                              </p>
                              <p>
                                <strong>政治面貌：</strong>
                                {metadata.politicalStatus}
                              </p>
                              <p>
                                <strong>工作单位：</strong>
                                {metadata.workUnit}
                              </p>
                              <p>
                                <strong>居住情况：</strong>
                                {resident.livingStatus ?? "待核实"}
                              </p>
                              <p>
                                <strong>参保情况：</strong>
                                {resident.insuranceStatus ?? "待核实"}
                              </p>
                            </section>

                            <section className={styles.expandedSection}>
                              <h3>全部匹配政策与预计权益</h3>
                              {policyMatches.length > 0 ? (
                                policyMatches.map(({ match, policy }) => (
                                  <div className={styles.expandedPolicy} key={policy.id}>
                                    <div className={styles.expandedPolicyHeader}>
                                      <Link
                                        className={styles.policyLink}
                                        href={`/policies/${policy.id}`}
                                        onClick={saveScrollPosition}
                                      >
                                        {policy.name}
                                      </Link>
                                      <span
                                        className={
                                          match.status === "matched"
                                            ? styles.statusMatched
                                            : styles.statusPending
                                        }
                                      >
                                        {MATCH_STATUS_LABELS[match.status]}
                                      </span>
                                    </div>
                                    <p className={styles.benefitText}>
                                      预计权益：{policy.benefitText}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p>当前没有高度匹配或待核实政策。</p>
                              )}
                            </section>

                            <section className={styles.expandedSection}>
                              <h3>核心依据与完整待核实项</h3>
                              {policyMatches.length > 0 ? (
                                policyMatches.map(({ match, policy }) => (
                                  <div className={styles.expandedPolicy} key={policy.id}>
                                    <strong>{policy.name}</strong>
                                    <ul className={styles.detailList}>
                                      {match.reasons.map((reason) => (
                                        <li key={reason}>依据：{reason}</li>
                                      ))}
                                      {match.missingFields.map((field) => (
                                        <li key={field}>待核实：{field}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))
                              ) : (
                                <p>暂无需要展示的匹配依据。</p>
                              )}
                            </section>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="居民列表分页" className={styles.pagination}>
        <button
          className={styles.pageButton}
          disabled={currentPage <= 1}
          onClick={() => changePage(currentPage - 1)}
          type="button"
        >
          上一页
        </button>
        <span className={styles.pageIndicator}>
          第 {currentPage} / {pageCount} 页
        </span>
        <button
          className={styles.pageButton}
          disabled={currentPage >= pageCount}
          onClick={() => changePage(currentPage + 1)}
          type="button"
        >
          下一页
        </button>
      </nav>
        </>
      )}
    </div>
  );
}
