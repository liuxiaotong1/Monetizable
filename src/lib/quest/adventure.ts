import { marketDate } from "./domain";
import type { AdventureProgress, AdventureSection } from "./types";
export function dailyAdventure(saved: AdventureProgress | undefined, now: string): AdventureProgress {
  const date = marketDate(new Date(now));
  return saved?.date === date ? {...saved, sections: [...new Set(saved.sections)]} : {date, sections: []};
}
export function completeAdventure(saved: AdventureProgress | undefined, section: AdventureSection, now: string): AdventureProgress {
  const progress = dailyAdventure(saved, now);
  if (!progress.sections.includes(section)) progress.sections.push(section);
  if (progress.sections.length === 3) progress.completedAt ??= now;
  return progress;
}
