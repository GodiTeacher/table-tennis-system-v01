# 桌球系統 App V01

正式技術架構起點：**GitHub + Cloudflare Workers + Supabase**。

## 本版已完成
- Next.js / TypeScript 專案骨架
- Cloudflare 新專案採 vinext 路線
- Supabase 初始 schema
- 匯入 31 項核心技能
- 教練程度 A–F
- 訓練時間 / 人數 / 桌數
- 分桌基礎建議
- **跨程度共用訓練項目選取**
  - A–F 是「推薦/篩選條件」
  - 今日已選項目是 session-level 全域集合
  - 切換 B → A 或其他程度不會清除已選項目
  - 「顯示全部程度可用項目」可跨程度新增項目
- 今日自動課表初版
  - 自動加入暖身／收操
  - 依總時間平均分配訓練分鐘數
  - 可用上下按鈕調整訓練順序

## 重要資料模型
`training_sessions.focus_level` 只表示本次課程目前主要程度。
真正已選訓練項目存於 `training_session_items`，因此不應綁在 level 上。

## 本機啟動
```bash
npm install
npm run dev
```

## Cloudflare
依 Cloudflare 目前 Next.js 建議路線：
```bash
npx vinext check
npx vinext init
npm run dev:vinext
```
之後連結 GitHub repository 至 Cloudflare Workers Builds。

## Supabase
1. 建立新的 Supabase project
2. 依序執行：
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_core_skills.sql`
3. 複製 `.env.example` → `.env.local`
4. 填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 下一步
1. 每項訓練分鐘數手動微調
2. 學生名單
3. 課程儲存/讀取
4. 依學生程度與桌數自動分組
5. 教練觀察紀錄
6. 個人技能成長地圖
