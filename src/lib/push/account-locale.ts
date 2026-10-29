import "server-only";
import { database } from "@/lib/account/db";
import type { PushLocale } from "./copy";

let columnReady: Promise<void> | null = null;

export function ensureAccountLocaleColumn() {
  if (!columnReady) {
    columnReady = database().query("ALTER TABLE public.quest_profiles ADD COLUMN IF NOT EXISTS locale text").then(() => undefined).catch((error) => {
      columnReady = null;
      throw error;
    });
  }
  return columnReady;
}

/** Fill an empty account language. Does not replace a language the person already saved. */
export async function rememberAccountLocale(userId: string, locale: PushLocale) {
  await ensureAccountLocaleColumn();
  await database().query(
    `INSERT INTO public.quest_profiles(user_id, locale) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET locale = EXCLUDED.locale
     WHERE quest_profiles.locale IS NULL`,
    [userId, locale],
  );
}

/** The person chose this language. Future reminders and every device subscription follow it. */
export async function setAccountLocale(userId: string, locale: PushLocale) {
  await ensureAccountLocaleColumn();
  await database().query(
    `INSERT INTO public.quest_profiles(user_id, locale) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET locale = EXCLUDED.locale`,
    [userId, locale],
  );
  await database().query(
    "UPDATE public.web_push_subscriptions SET locale = $2, updated_at = now() WHERE user_id = $1",
    [userId, locale],
  );
}
