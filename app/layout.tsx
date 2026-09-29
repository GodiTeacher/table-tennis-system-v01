import type { Metadata } from "next";
import "./globals.css";
import "./app-shell.css";
import "./themes.css";
import AppBottomNav from "@/components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "桌球系統 App V01",
  description: "教練訓練規劃、技能成長與紀錄系統"
};

const VALID_THEMES = new Set(["current", "clean", "teaching", "competitive", "sunset", "berry", "pingpong"]);

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let theme = "current";
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("theme_preference").eq("id", userId).single();
      if (profile?.theme_preference && VALID_THEMES.has(profile.theme_preference)) theme = profile.theme_preference;
    }
  } catch {
    theme = "current";
  }

  return (
    <html lang="zh-Hant">
      <body className={`theme-${theme}`}>
        {children}
        <AppBottomNav />
      </body>
    </html>
  );
}
