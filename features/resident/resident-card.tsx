import Link from "next/link";

import type { Resident } from "@/shared/types";

import styles from "@/features/resident/resident.module.css";

interface ResidentCardProps {
  resident: Resident;
  taskCount: number;
}

export function ResidentCard({ resident, taskCount }: ResidentCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.eyebrow}>居民编号 {resident.id}</p>
          <h2>{resident.name}</h2>
        </div>
        <span className={styles.age}>
          {resident.age === undefined ? "年龄待核实" : `${resident.age} 岁`}
        </span>
      </div>

      <div className={styles.tags} aria-label={`${resident.name}的居民标签`}>
        {resident.labels.map((label) => (
          <span className={styles.tag} key={label}>
            {label}
          </span>
        ))}
      </div>

      <p className={styles.summary}>
        {resident.hukou ?? "户籍待核实"} · {resident.livingStatus ?? "居住情况待核实"}
      </p>

      <div className={styles.cardHeader}>
        <span className={styles.taskCount}>待办事项 {taskCount} 项</span>
        <Link className={styles.link} href={`/residents/${resident.id}`}>
          查看详情
        </Link>
      </div>
    </article>
  );
}

