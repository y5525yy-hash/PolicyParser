"use client";

import { useSyncExternalStore } from "react";

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

export function CaseLedger() {
  const snapshot = useSyncExternalStore(
    subscribeCaseTasks,
    getCaseTasksSnapshot,
    getServerCaseTasksSnapshot,
  );
  const tasks = parseCaseTasksSnapshot(snapshot);

  if (tasks.length === 0) {
    return <p className={styles.empty}>暂无代办事项，请先从居民详情加入台账。</p>;
  }

  return (
    <div className={styles.ledger}>
      {tasks.map((task) => {
        const resident = mockResidents.find((item) => item.id === task.residentId);
        const policy = mockPolicies.find((item) => item.id === task.policyId);

        return (
          <article className={styles.task} key={task.id}>
            <div>
              <p className={styles.eyebrow}>代办事项</p>
              <h2>{resident?.name ?? "居民信息待核实"}</h2>
              <p className={styles.meta}>{policy?.name ?? "政策事项待核实"}</p>
              <p className={styles.meta}>负责人：{task.assignee}</p>
              <p className={styles.meta}>
                下次跟进：{task.nextFollowUpAt ?? "待安排"}
              </p>
            </div>

            <div className={styles.materials}>
              <h3>缺失或待核实材料</h3>
              {task.missingMaterials.length > 0 ? (
                <ul>
                  {task.missingMaterials.map((material) => (
                    <li key={material}>{material}</li>
                  ))}
                </ul>
              ) : (
                <p>材料已齐备，仍需经办部门审核。</p>
              )}
            </div>

            <div className={styles.statusControl}>
              <label htmlFor={`status-${task.id}`}>更新办理状态</label>
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
              <span className={styles.statusLabel}>
                当前：{CASE_STATUS_LABELS[task.status]}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

