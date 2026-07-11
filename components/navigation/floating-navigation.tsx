"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigationItems = [
  { href: "/policies", icon: "政", label: "政策库" },
  { href: "/residents", icon: "居", label: "居民档案" },
  { href: "/matching?policyId=policy-001", icon: "匹", label: "智能匹配" },
  { href: "/cases", icon: "办", label: "任务台账" },
];

export function FloatingNavigation() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <aside
      aria-label="快捷导航"
      className={`floating-navigation ${isCollapsed ? "collapsed" : ""}`}
    >
      <button
        aria-label={isCollapsed ? "展开快捷导航" : "收起快捷导航"}
        className="floating-navigation-toggle"
        onClick={() => setIsCollapsed((current) => !current)}
        type="button"
      >
        {isCollapsed ? "‹" : "›"}
      </button>
      <strong className="floating-navigation-title">快捷导航</strong>
      <nav>
        {navigationItems.map((item) => {
          const itemPath = item.href.split("?")[0];
          const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "active" : undefined}
              href={item.href}
              key={item.href}
              title={item.label}
            >
              <span aria-hidden="true">{item.icon}</span>
              <em>{item.label}</em>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
