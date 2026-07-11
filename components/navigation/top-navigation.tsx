"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/policies", label: "政策库" },
  { href: "/residents", label: "居民档案" },
  { href: "/matching?policyId=policy-001", label: "智能匹配" },
  { href: "/cases", label: "任务台账" },
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="navigation-shell">
        <div className="brand-area">
          <Link className="brand" href="/policies">
            西红门民生政策助手
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
      </div>
    </header>
  );
}

