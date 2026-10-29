import type { CompanionId, PushCategory, PushLocale } from "./copy";

export interface PushCategories {
  premarket: boolean;
  review: boolean;
  knowledge: boolean;
  event: boolean;
}
export function defaultCategories(): PushCategories {
  return { premarket: true, review: true, knowledge: true, event: true };
}
export function normalizeCategories(value: unknown): PushCategories {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const categories = defaultCategories();
  for (const key of Object.keys(categories) as PushCategory[]) {
    if (typeof source[key] === "boolean") categories[key] = source[key] as boolean;
  }
  return categories;
}
export function normalizeKnowledgeTime(value: unknown) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "12:30";
}
export function normalizeCompanion(value: unknown): CompanionId {
  return value === "female" ? "female" : "supercharlie";
}
export function normalizeLocale(value: unknown): PushLocale {
  return value === "fr" || value === "zh" ? value : "en";
}
export function safeTimeZone(value: unknown) {
  if (typeof value !== "string" || value.length > 80) return "Europe/Paris";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "Europe/Paris";
  }
}
