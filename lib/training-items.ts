import skills from "@/data/core-skills.json";
import type { TrainingLevelId } from "./training-levels";

export type TrainingItem = {
  id: string;
  name: string;
  domain: string;
  subcategory: string;
  recommendedLevels: TrainingLevelId[];
};

const ALL_LEVELS: TrainingLevelId[] = ["A", "B", "C", "D", "E", "F"];

function recommendedLevelsFor(stage: string): TrainingLevelId[] {
  const normalized = stage.replaceAll(" ", "").trim();

  switch (normalized) {
    case "啟蒙":
      return ["A"];
    case "啟蒙→基礎":
    case "啟蒙->基礎":
      return ["A", "B"];
    case "基礎":
      return ["B", "C"];
    case "基礎→進階":
    case "基礎->進階":
      return ["C", "D", "E"];
    case "進階":
      return ["D", "E", "F"];
    case "全階段":
      return ALL_LEVELS;
    default:
      return [];
  }
}

export const TRAINING_ITEMS: TrainingItem[] = skills.map((skill) => ({
  id: skill.id,
  name: skill.name,
  domain: skill.domain,
  subcategory: skill.subcategory,
  recommendedLevels: recommendedLevelsFor(skill.stage),
}));

export function getItemsForLevel(level: TrainingLevelId) {
  return TRAINING_ITEMS.filter((item) => item.recommendedLevels.includes(level));
}
