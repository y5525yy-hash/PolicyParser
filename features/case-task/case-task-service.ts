import type {
  CreateCaseTask,
  UpdateCaseTask,
} from "@/shared/contracts";
import { CASE_STORAGE_KEY, DEMO_IDS } from "@/shared/demo-constants";
import type { CaseTask } from "@/shared/types";

import { mockCaseTasks } from "@/features/case-task/mock-case-tasks";

const defaultTasksSnapshot = JSON.stringify(mockCaseTasks);

function isCaseTask(value: unknown): value is CaseTask {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const task = value as Partial<CaseTask>;
  return (
    typeof task.id === "string" &&
    typeof task.residentId === "string" &&
    typeof task.policyId === "string" &&
    typeof task.status === "string" &&
    Array.isArray(task.missingMaterials) &&
    typeof task.assignee === "string"
  );
}

export function getCaseTasksSnapshot() {
  if (typeof window === "undefined") {
    return defaultTasksSnapshot;
  }

  return window.localStorage.getItem(CASE_STORAGE_KEY) ?? defaultTasksSnapshot;
}

export function getServerCaseTasksSnapshot() {
  return defaultTasksSnapshot;
}

export function parseCaseTasksSnapshot(snapshot: string): CaseTask[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) && parsed.every(isCaseTask)
      ? parsed
      : mockCaseTasks;
  } catch {
    return mockCaseTasks;
  }
}

export function subscribeCaseTasks(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("case-tasks-updated", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("case-tasks-updated", handleChange);
  };
}

function saveCaseTasks(tasks: CaseTask[]) {
  window.localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event("case-tasks-updated"));
}

export const createCaseTask: CreateCaseTask = async (residentId, policyId) => {
  const missingMaterials =
    policyId === DEMO_IDS.policies.elderlyAllowance
      ? ["本人确认的补贴津贴发放账户信息", "津贴领取情况待核实"]
      : ["申请材料需由代办员进一步核实"];

  return {
    id: `case-${residentId}-${policyId}`,
    residentId,
    policyId,
    status: "todo",
    missingMaterials,
    assignee: "西红门镇代办员",
    nextFollowUpAt: "2026-07-12",
  };
};

export async function addCaseTask(residentId: string, policyId: string) {
  const tasks = parseCaseTasksSnapshot(getCaseTasksSnapshot());
  const existing = tasks.find(
    (task) => task.residentId === residentId && task.policyId === policyId,
  );

  if (existing) {
    return { task: existing, created: false };
  }

  const task = await createCaseTask(residentId, policyId);
  saveCaseTasks([...tasks, task]);
  return { task, created: true };
}

export const updateCaseTask: UpdateCaseTask = async (taskId, status) => {
  if (typeof window === "undefined") {
    return null;
  }

  const tasks = parseCaseTasksSnapshot(getCaseTasksSnapshot());
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) {
    return null;
  }

  const updatedTask = { ...tasks[taskIndex], status };
  const updatedTasks = tasks.map((task, index) =>
    index === taskIndex ? updatedTask : task,
  );
  saveCaseTasks(updatedTasks);
  return updatedTask;
};

