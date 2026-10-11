import type { BrowserRecord } from "./browser-store";
/** Preserve synced immutable snapshots, merge distinct activity, never sum shared XP twice. */
export function mergeRecords(
  cloud: BrowserRecord,
  local: BrowserRecord,
): BrowserRecord {
  const unique = <T>(a: T[], b: T[], id: (item: T) => string) => [
    ...new Map([...b, ...a].map((item) => [id(item), item])).values(),
  ];
  const merged = structuredClone(cloud);
  merged.judgments = unique(cloud.judgments, local.judgments, (j) => j.date);
  merged.forecasts = unique(cloud.forecasts, local.forecasts, (f) => f.id);
  merged.cards = unique(cloud.cards, local.cards, (c) => c.id);
  const later = (p: {
    updatedAt?: string;
    lastDispositionAt?: string;
    lastAnswerAt?: string;
    masteredAt?: string;
    completedAt?: string;
  }) =>
    p.updatedAt ||
    p.lastDispositionAt ||
    p.masteredAt ||
    p.lastAnswerAt ||
    p.completedAt ||
    "";
  merged.progress = unique(cloud.progress, local.progress, (p) => p.cardId).map(
    (p) => {
      const a = cloud.progress.find((v) => v.cardId === p.cardId),
        b = local.progress.find((v) => v.cardId === p.cardId);
      return a && b ? structuredClone(later(b) > later(a) ? b : a) : p;
    },
  );
  merged.notes = { ...local.notes, ...cloud.notes };
  for (const [id, note] of Object.entries(local.notes))
    if (!cloud.notes[id] || later(note) > later(cloud.notes[id]))
      merged.notes[id] = structuredClone(note);
  merged.rewards = [...new Set([...cloud.rewards, ...local.rewards])];
  const xp = (key: string) =>
    key.startsWith("judgment:") ? 10 : key.startsWith("review:") ? 20 : 5;
  merged.xp = Math.max(
    cloud.xp +
      local.rewards
        .filter((r) => !cloud.rewards.includes(r))
        .reduce((n, r) => n + xp(r), 0),
    local.xp,
  );
  merged.learningDays = { ...cloud.learningDays };
  for (const [date, ids] of Object.entries(local.learningDays))
    merged.learningDays[date] = [
      ...new Set([...(merged.learningDays[date] || []), ...ids]),
    ];
  if ((local.settingsUpdatedAt || "") > (cloud.settingsUpdatedAt || "")) {
    merged.settings = structuredClone(local.settings);
    merged.settingsUpdatedAt = local.settingsUpdatedAt;
  }
  if (local.adventure) {
    if (!cloud.adventure || local.adventure.date > cloud.adventure.date)
      merged.adventure = structuredClone(local.adventure);
    else if (local.adventure.date === cloud.adventure.date)
      merged.adventure = {
        ...cloud.adventure,
        sections: [
          ...new Set([
            ...cloud.adventure.sections,
            ...local.adventure.sections,
          ]),
        ],
        completedAt: cloud.adventure.completedAt || local.adventure.completedAt,
      };
  }
  merged.readNotices = [
    ...new Set([...cloud.readNotices, ...local.readNotices]),
  ];
  merged.learningVisitId = local.learningVisitId;
  return merged;
}
