"use client";

import { useEffect, useState, type FormEvent } from "react";

import styles from "@/features/resident/resident-profile.module.css";

const STORAGE_KEY = "shenicest.residentOnsiteSupplement.v1";

interface OnsiteSupplement {
  hukou: string;
  income: string;
  insurance: string;
  note: string;
  updatedAt: string;
}

interface OnsiteSupplementFormProps {
  residentId: string;
}

const emptySupplement: OnsiteSupplement = {
  hukou: "",
  income: "",
  insurance: "",
  note: "",
  updatedAt: "",
};

function readStoredSupplements() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      OnsiteSupplement
    >;
  } catch {
    return {};
  }
}

export function OnsiteSupplementForm({
  residentId,
}: OnsiteSupplementFormProps) {
  const [form, setForm] = useState(emptySupplement);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readStoredSupplements()[residentId];
      if (stored) setForm(stored);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [residentId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      ...form,
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    };
    const supplements = readStoredSupplements();
    supplements[residentId] = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(supplements));
    setForm(next);
    setSavedMessage("现场补录已保存到本机演示记录");
  }

  return (
    <section className={styles.onsiteSupplement}>
      <div>
        <span>现场补录</span>
        <h2>补充本次核实结果</h2>
        <p>仅保存虚构演示信息，不会自动形成正式资格结论。</p>
      </div>
      <form className={styles.onsiteForm} onSubmit={submit}>
        <label>
          户籍核实
          <select
            onChange={(event) =>
              setForm((current) => ({ ...current, hukou: event.target.value }))
            }
            value={form.hukou}
          >
            <option value="">暂未核实</option>
            <option value="北京市">北京市</option>
            <option value="外省户籍">外省户籍</option>
          </select>
        </label>
        <label>
          收入情况
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, income: event.target.value }))
            }
            placeholder="例如：低保、低收入或待补证明"
            value={form.income}
          />
        </label>
        <label>
          参保情况
          <input
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                insurance: event.target.value,
              }))
            }
            placeholder="例如：居民养老保险已核实"
            value={form.insurance}
          />
        </label>
        <label>
          现场备注
          <textarea
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
            placeholder="只记录本次走访需要继续核实的事项"
            rows={3}
            value={form.note}
          />
        </label>
        <button type="submit">保存补录</button>
        {savedMessage ? <p role="status">{savedMessage}</p> : null}
        {form.updatedAt ? <small>最近保存：{form.updatedAt}</small> : null}
      </form>
    </section>
  );
}
