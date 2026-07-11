import type { Metadata } from "next";
import type { ReactNode } from "react";

import { FloatingNavigation } from "@/components/navigation/floating-navigation";
import { TopNavigation } from "@/components/navigation/top-navigation";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "西红门民生政策助手",
  description: "政策知识、居民匹配与代办台账演示系统",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNavigation />
        <main className="page-shell">{children}</main>
        <FloatingNavigation />
      </body>
    </html>
  );
}

