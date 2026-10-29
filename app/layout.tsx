import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import "./app-shell.css";
import "./themes.css";
import "./equipment-guide.css";
import "./photo-import-fixes.css";
import AppBottomNav from "@/components/AppBottomNav";
import ThemeCookieBootstrap from "@/components/ThemeCookieBootstrap";
import OperationsFlowNav from "@/components/OperationsFlowNav";
import PublicParentNav from "@/components/PublicParentNav";
import HydrationStabilizer from "@/components/HydrationStabilizer";
import ScrollPositionKeeper from "@/components/ScrollPositionKeeper";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "桌球系統 App V01",
  description: "教練訓練規劃、技能成長與紀錄系統"
};

const VALID_THEMES = new Set(["current", "clean", "teaching", "competitive", "sunset", "berry", "pingpong", "equipment", "candy", "neon"]);

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("ui-theme")?.value;
  const validCookieTheme = savedTheme && VALID_THEMES.has(savedTheme) ? savedTheme : null;
  let theme = validCookieTheme ?? "current";

  // Theme changes already persist the ui-theme cookie in settings/actions.ts.
  // Avoid an auth + profile round-trip on every route transition when a valid
  // cookie is already present. Only bootstrap from the profile when needed.
  if (!validCookieTheme) {
    try {
      const supabase = await createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims?.sub;
      if (userId) {
        const { data: profile } = await supabase.from("profiles").select("theme_preference").eq("id", userId).single();
        if (profile?.theme_preference && VALID_THEMES.has(profile.theme_preference)) {
          theme = profile.theme_preference;
        }
      }
    } catch {
      theme = "current";
    }
  }

  const shouldBootstrap = validCookieTheme !== theme;

  return (
    <html lang="zh-Hant">
      <body className={`theme-${theme}`} data-hydrating="true">
        <HydrationStabilizer />
        <Suspense fallback={null}><ScrollPositionKeeper /></Suspense>
        {shouldBootstrap ? <ThemeCookieBootstrap theme={theme} /> : null}
        <OperationsFlowNav />
        {children}
        <PublicParentNav />
        <AppBottomNav />
      </body>
    </html>
  );
}
