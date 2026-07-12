"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import styles from "./mobile-home.module.css";

const mobileEntries = [
  {
    href: "/residents",
    index: "01",
    title: "人找政策",
    description: "选择居民，从现有档案出发查看可能符合的政策。",
  },
  {
    href: "/policies",
    index: "02",
    title: "政策找人",
    description: "选择政策，查找可能符合或需要继续核实的居民。",
  },
  {
    href: "/residents?view=grid",
    index: "03",
    title: "快速搜索与现场补录",
    description: "搜索居民并进入档案，补充现场核实的信息。",
  },
  {
    href: "/cases",
    index: "04",
    title: "今日任务",
    description: "查看需要继续核实和跟进的办理事项。",
  },
] as const;

export function MobileHome() {
  const router = useRouter();

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 721px)");
    document.body.classList.add("mobile-home-route");

    if (desktopQuery.matches) {
      router.replace("/policies");
    }

    return () => {
      document.body.classList.remove("mobile-home-route");
    };
  }, [router]);

  return (
    <>
      <section className={styles.mobileHome} aria-labelledby="mobile-home-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>西红门镇便民服务</p>
          <h1 id="mobile-home-title">民生政策助手</h1>
          <p>现场只做查询、匹配、补录和任务跟进。</p>
        </header>

        <nav className={styles.entryGrid} aria-label="手机端主要功能">
          {mobileEntries.map((entry) => (
            <Link className={styles.entryCard} href={entry.href} key={entry.title}>
              <span className={styles.entryIndex}>{entry.index}</span>
              <span className={styles.entryContent}>
                <strong>{entry.title}</strong>
                <span>{entry.description}</span>
              </span>
              <span className={styles.entryArrow} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>

        <p className={styles.notice}>匹配结果用于初步核查，最终以经办部门审核为准。</p>
      </section>

      <div className={styles.desktopRedirect} role="status">
        正在进入政策知识库…
      </div>
    </>
  );
}
