import type { PushLocale } from "./copy";

/** A saved en/fr/zh choice. Anything else means the language has not been stored. */
export function savedLocale(value: unknown): PushLocale | null {
  return value === "en" || value === "fr" || value === "zh" ? value : null;
}

/**
 * One language for a whole reminder.
 * Signed-in accounts use the language saved on the profile (set at account
 * creation, then replaced when they switch language). Guest subscriptions,
 * and accounts that have not stored a language yet, use the subscription language.
 */
export function resolveReminderLocale(input: {
  accountLocale?: unknown;
  subscriptionLocale?: unknown;
  signedIn: boolean;
}): PushLocale {
  if (input.signedIn) {
    const account = savedLocale(input.accountLocale);
    if (account) return account;
  }
  return savedLocale(input.subscriptionLocale) ?? "en";
}
