"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/policies", label: "政策库" },
  { href: "/residents", label: "居民档案" },
  { href: "/cases", label: "任务台账" },
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="navigation-shell">
        <div className="brand-area">
          <Link className="brand" href="/policies">
            政解
          </Link>
        </div>
        <nav aria-label="主导航" className="top-navigation">
          {navigationItems.map((item) => {
            const itemPath = item.href.split("?")[0];
            const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "active" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          aria-current={pathname === "/matching" ? "page" : undefined}
          className="matching-action"
          href="/matching?policyId=policy-001"
        >
          <span aria-hidden="true">匹</span>
          开始智能匹配
        </Link>
        <div className="user-summary" aria-label="当前登录用户">
          <div className="user-avatar" aria-label="网格员头像" role="img" />
          <div className="user-identity">
            <span>已登录</span>
            <strong>西红门一村网格员</strong>
          </div>
        </div>
      </div>
    </header>
  );
}

