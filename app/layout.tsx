import type { Metadata } from "next";
import "./globals.css";
import AppBottomNav from "@/components/AppBottomNav";

export const metadata: Metadata = {
  title: "桌球系統 App V01",
  description: "教練訓練規劃、技能成長與紀錄系統"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <AppBottomNav />
      </body>
    </html>
  );
}
