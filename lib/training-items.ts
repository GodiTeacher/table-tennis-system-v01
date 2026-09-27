import skills from "@/data/core-skills.json";
import type { TrainingLevelId } from "./training-levels";

export type TrainingItem = {
  id: string;
  name: string;
  domain: string;
  subcategory: string;
  recommendedLevels: TrainingLevelId[];
};

function recommendedLevelsFor(stage: string): TrainingLevelId[] {
  if (stage.includes("全階段")) return ["A","B","C","D","E","F"];
  if (stage.includes("進階")) return ["C","D","E","F"];
  if (stage.includes("基礎")) return ["B","C","D","E","F"];
  return ["A","B","C","D","E","F"];
}

export const TRAINING_ITEMS: TrainingItem[] = skills.map((skill) => ({
  id: skill.id,
  name: skill.name,
  domain: skill.domain,
  subcategory: skill.subcategory,
  recommendedLevels: recommendedLevelsFor(skill.stage)
}));

export function getItemsForLevel(level: TrainingLevelId) {
  return TRAINING_ITEMS.filter((item) => item.recommendedLevels.includes(level));
}
