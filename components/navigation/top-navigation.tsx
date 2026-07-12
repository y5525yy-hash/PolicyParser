"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/policies", label: "政策知识库" },
  { href: "/residents", label: "居民档案" },
  { href: "/cases", label: "代办台账" },
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="navigation-shell">
        <Link className="brand" href="/policies">
          <span className="brand-mark" aria-hidden="true">政</span>
          <span className="brand-wordmark">政解</span>
        </Link>
        <nav aria-label="主导航" className="top-navigation">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "is-active" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <span aria-disabled="true" className="top-navigation-placeholder">
            平台维护
          </span>
        </nav>
      </div>
    </header>
  );
}
