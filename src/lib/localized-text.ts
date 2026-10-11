import french from "@/lib/messages-fr.json";
import type { Locale } from "@/lib/i18n";

const dictionary: Record<string, string> = french;
const foldedDictionary = Object.fromEntries(Object.entries(dictionary).map(([key, value]) => [key.toLowerCase(), value]));
const templates = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => ({
  localizeRole: key.startsWith("For a {0}"),
  pattern: new RegExp(`^${key.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)")}$`), value,
}));
/** Exact presentation lookup: identifiers and form values never pass through it. */
export function translateText(text: string, locale: Locale, extra: Record<string, string> = {}): string {
  const key = text.replace(/\s+/g, " ").trim();
  let translated = extra[key] ?? (locale === "fr" ? dictionary[key] : undefined);
  if (!translated && locale === "fr") {
    for (const template of templates) {
      const match = key.match(template.pattern);
      if (match) { translated = template.value.replace(/\{(\d+)\}/g, (_, index) => { const part = match[Number(index) + 1] ?? ""; return template.localizeRole && index === "0" ? (foldedDictionary[part.toLowerCase()] ?? part) : part; }); break; }
    }
  }
  if (!translated && / × | · | → /.test(key)) return text.split(/( × | · | → )/).map(part => /^( × | · | → )$/.test(part) ? part : translateText(part, locale, extra)).join("");
  if (!translated) return text;
  return `${text.match(/^\s*/)?.[0] ?? ""}${translated}${text.match(/\s*$/)?.[0] ?? ""}`;
}

export function translateMetadata<T>(value: T, locale: Locale): T {
  if (typeof value === "string") return translateText(value, locale) as T;
  if (Array.isArray(value)) return value.map(item => translateMetadata(item, locale)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateMetadata(item, locale)])) as T;
  return value;
}
