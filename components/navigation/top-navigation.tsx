import Link from "next/link";

const navigationItems = [
  { href: "/policies", label: "政策知识库" },
  { href: "/residents", label: "居民档案" },
  { href: "/cases", label: "代办台账" },
];

export function TopNavigation() {
  return (
    <header className="site-header">
      <div className="navigation-shell">
        <Link className="brand" href="/policies">
          西红门民生政策助手
        </Link>
        <nav aria-label="主导航" className="top-navigation">
          {navigationItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

