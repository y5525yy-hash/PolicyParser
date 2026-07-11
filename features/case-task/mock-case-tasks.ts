import { DEMO_IDS } from "@/shared/demo-constants";
import type { CaseTask } from "@/shared/types";

export const mockCaseTasks = [
  {
    id: "case-001",
    residentId: DEMO_IDS.residents.wangNainai,
    policyId: DEMO_IDS.policies.elderlyAllowance,
    status: "todo",
    missingMaterials: ["北京市户籍信息", "津贴领取情况"],
    assignee: "西红门镇代办员",
    nextFollowUpAt: "2026-07-12",
  },
] satisfies CaseTask[];

