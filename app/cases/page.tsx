import { CaseLedger } from "@/features/case-task/case-ledger";
import styles from "@/features/case-task/case-task.module.css";

export default function CasesPage() {
  return (
    <section className={styles.casePage}>
      <CaseLedger />
    </section>
  );
}
