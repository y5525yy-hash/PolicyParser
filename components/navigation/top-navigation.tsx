"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "@/components/navigation/navigation.module.css";

const navigationItems = [
  { href: "/policies", label: "政策库" },
  { href: "/residents", label: "居民档案" },
  { href: "/cases", label: "任务台账" },
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <header className={styles.siteHeader}>
      <div className={styles.navigationShell}>
        <div className={styles.brandArea}>
          <Link className={styles.brand} href="/policies">
            <span className={styles.brandMark} aria-hidden="true">政</span>
            <span className={styles.brandWordmark}>政解</span>
          </Link>
        </div>
        <nav aria-label="主导航" className={styles.topNavigation}>
          {navigationItems.map((item) => {
            const itemPath = item.href.split("?")[0];
            const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={isActive ? styles.active : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <span aria-disabled="true" className={styles.navigationPlaceholder}>
            平台维护
          </span>
        </nav>
        <Link
          aria-current={pathname === "/matching" ? "page" : undefined}
          className={`${styles.matchingAction} ${pathname === "/matching" ? styles.matchingActionActive : ""}`}
          href="/matching?policyId=policy-001"
        >
          <span aria-hidden="true">匹</span>
          开始智能匹配
        </Link>
        <div className={styles.userSummary} aria-label="当前登录用户">
          <div className={styles.userAvatar} aria-label="网格员头像" role="img" />
          <div className={styles.userIdentity}>
            <span>已登录</span>
            <strong>西红门一村网格员</strong>
          </div>
        </div>
      </div>
    </header>
  );
}
