import { CaseLedger } from "@/features/case-task/case-ledger";
import styles from "@/features/case-task/case-task.module.css";

export default function CasesPage() {
  return (
    <section>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>代办台账</p>
        <h1>把发现的问题跟进到底</h1>
        <p>
          集中查看居民办理事项、缺失材料、负责人和下一次跟进时间，并更新当前办理进度。
        </p>
      </header>

      <p className={styles.notice}>
        台账状态保存在当前浏览器，仅用于黑客松演示；正式办理结果仍以经办部门反馈为准。
      </p>

      <CaseLedger />
    </section>
  );
}

