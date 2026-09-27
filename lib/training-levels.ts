export type TrainingLevelId = "A" | "B" | "C" | "D" | "E" | "F";

export const TRAINING_LEVELS = [
  { id: "A" as const, name: "入門啟蒙", description: "先建立安全、球感與基本動作" },
  { id: "B" as const, name: "基礎建立", description: "穩定基本技術與簡單銜接" },
  { id: "C" as const, name: "初階銜接", description: "加入移動、旋轉與組合技術" },
  { id: "D" as const, name: "進階攻防", description: "提升攻防品質與情境應用" },
  { id: "E" as const, name: "競賽應用", description: "以比賽需求安排訓練重點" },
  { id: "F" as const, name: "專項選手", description: "依打法、角色與賽事目標專項化" }
];
