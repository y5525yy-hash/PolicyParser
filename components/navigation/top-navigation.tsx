"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/policies", label: "政策管理" },
  { href: "/residents", label: "居民档案" },
  { href: "/matching?policyId=policy-001", label: "智能匹配" },
  { href: "/cases", label: "核实任务" },
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
          <span className="system-label">基层政务工作台</span>
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
        <div className="operator-summary">
          <span>北京市大兴区</span>
          <strong>西红门镇工作人员</strong>
        </div>
      </div>
    </header>
  );
}

