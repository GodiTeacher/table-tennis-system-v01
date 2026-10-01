import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./app-shell.css";
import "./themes.css";
import "./equipment-guide.css";
import AppBottomNav from "@/components/AppBottomNav";

export const metadata: Metadata = {
  title: "桌球系統 App V01",
  description: "教練訓練規劃、技能成長與紀錄系統"
};

const VALID_THEMES = new Set(["current", "clean", "teaching", "competitive", "sunset", "berry", "pingpong", "equipment", "candy", "neon"]);

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("ui-theme")?.value ?? "current";
  const theme = VALID_THEMES.has(savedTheme) ? savedTheme : "current";

  return (
    <html lang="zh-Hant">
      <body className={`theme-${theme}`}>
        {children}
        <AppBottomNav />
      </body>
    </html>
  );
}
