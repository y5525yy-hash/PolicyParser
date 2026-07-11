"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { mockPolicies } from "@/features/policy/mock-policies";
import { mockResidents } from "@/features/resident/mock-residents";
import {
  getCaseTasksSnapshot,
  getServerCaseTasksSnapshot,
  parseCaseTasksSnapshot,
  subscribeCaseTasks,
  updateCaseTask,
} from "@/features/case-task/case-task-service";
import styles from "@/features/case-task/case-task.module.css";
import { CASE_STATUS_LABELS } from "@/shared/demo-constants";
import type { CaseStatus } from "@/shared/types";

const caseStatuses = Object.keys(CASE_STATUS_LABELS) as CaseStatus[];
type StatusFilter = "all" | CaseStatus;

const statusTabs: Array<{ label: string; value: StatusFilter }> = [
  { label: "全部任务", value: "all" },
  ...caseStatuses.map((status) => ({
    label: CASE_STATUS_LABELS[status],
    value: status,
  })),
];

export function CaseLedger() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const snapshot = useSyncExternalStore(
    subscribeCaseTasks,
    getCaseTasksSnapshot,
    getServerCaseTasksSnapshot,
  );
  const tasks = parseCaseTasksSnapshot(snapshot);
  const filteredTasks = tasks.filter(
    (task) => statusFilter === "all" || task.status === statusFilter,
  );

  if (tasks.length === 0) {
    return <p className={styles.empty}>暂无代办事项，请先从居民详情加入台账。</p>;
  }

  return (
    <div className={styles.ledger}>
      <div className={styles.summaryGrid}>
        <div><strong>{tasks.length}</strong><span>全部任务</span></div>
        <div><strong>{tasks.filter((task) => task.status === "todo").length}</strong><span>待处理</span></div>
        <div><strong>{tasks.filter((task) => task.status === "collecting").length}</strong><span>材料收集中</span></div>
        <div><strong>{tasks.filter((task) => task.status === "processing").length}</strong><span>审核中</span></div>
        <div><strong>{tasks.filter((task) => task.status === "completed").length}</strong><span>已办结</span></div>
      </div>

      <div aria-label="任务状态" className={styles.statusTabs} role="tablist">
        {statusTabs.map((tab) => (
          <button
            aria-selected={statusFilter === tab.value}
            className={statusFilter === tab.value ? styles.statusTabActive : undefined}
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tableFrame}>
        <table className={styles.taskTable}>
          <thead>
            <tr>
              <th>任务与居民</th>
              <th>关联政策</th>
              <th>待核实事项</th>
              <th>责任人</th>
              <th>下次跟进</th>
              <th>当前状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
          {filteredTasks.map((task) => {
        const resident = mockResidents.find((item) => item.id === task.residentId);
        const policy = mockPolicies.find((item) => item.id === task.policyId);

        return (
          <tr key={task.id}>
            <td>
              <Link className={styles.residentLink} href={`/residents/${task.residentId}`}>
                {resident?.name ?? "居民信息待核实"}
              </Link>
              <span className={styles.subText}>任务编号：{task.id}</span>
            </td>
            <td>
              <Link className={styles.policyLink} href={`/policies/${task.policyId}`}>
                {policy?.name ?? "政策事项待核实"}
              </Link>
            </td>
            <td className={styles.materials}>
              {task.missingMaterials.length > 0 ? (
                <ul>
                  {task.missingMaterials.map((material) => (
                    <li key={material}>{material}</li>
                  ))}
                </ul>
              ) : (
                <p>材料已齐备，仍需经办部门审核。</p>
              )}
            </td>
            <td>{task.assignee}</td>
            <td>{task.nextFollowUpAt ?? "待安排"}</td>
            <td>
              <span className={styles.statusLabel} data-status={task.status}>
                {CASE_STATUS_LABELS[task.status]}
              </span>
            </td>
            <td className={styles.statusControl}>
              <label className={styles.visuallyHidden} htmlFor={`status-${task.id}`}>更新办理状态</label>
              <select
                id={`status-${task.id}`}
                onChange={(event) =>
                  updateCaseTask(task.id, event.target.value as CaseStatus)
                }
                value={task.status}
              >
                {caseStatuses.map((status) => (
                  <option key={status} value={status}>
                    {CASE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        );
      })}
          {filteredTasks.length === 0 ? (
            <tr><td className={styles.emptyRow} colSpan={7}>当前状态下暂无任务</td></tr>
          ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
