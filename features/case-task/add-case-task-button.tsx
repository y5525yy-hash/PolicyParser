"use client";

import Link from "next/link";
import { useState } from "react";

import { addCaseTask } from "@/features/case-task/case-task-service";
import styles from "@/features/case-task/case-task.module.css";

interface AddCaseTaskButtonProps {
  policyId: string;
  residentId: string;
}

export function AddCaseTaskButton({
  policyId,
  residentId,
}: AddCaseTaskButtonProps) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAddTask() {
    setIsSaving(true);
    const result = await addCaseTask(residentId, policyId);
    setMessage(result.created ? "已加入代办台账。" : "该事项已在代办台账中。" );
    setIsSaving(false);
  }

  return (
    <>
      <button
        className={styles.button}
        disabled={isSaving}
        onClick={handleAddTask}
        type="button"
      >
        {isSaving ? "正在加入…" : "加入代办台账"}
      </button>
      {message ? (
        <span className={styles.feedback} role="status">
          {message}
          <Link href="/cases">查看台账</Link>
        </span>
      ) : null}
    </>
  );
}

