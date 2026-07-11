import { CaseLedger } from "@/features/case-task/case-ledger";
import styles from "@/features/case-task/case-task.module.css";

export default function CasesPage() {
  return (
    <section className={styles.casePage}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>核实任务管理</p>
          <h1>核实任务台账</h1>
        </div>
        <p>
          集中跟进居民政策核实事项、缺失材料、责任人和办理进度。
        </p>
      </header>

      <p className={styles.notice}>
        台账状态保存在当前浏览器，仅用于黑客松演示；正式办理结果仍以经办部门反馈为准。
      </p>

      <CaseLedger />
    </section>
  );
}
