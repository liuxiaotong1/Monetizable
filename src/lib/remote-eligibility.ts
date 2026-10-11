import type { UserContext } from "@/lib/types";
import { opportunityEvidence } from "@/lib/capability-evidence";

export function remoteLocationAllows(item: Record<string, unknown>, context: UserContext) {
  const residence = opportunityEvidence(item).match(/(?:must be|requires? (?:the )?(?:candidate|applicant)s? to be|(?:you are|you're) required to be)\s+(?:based|located|resident|living)\s+in\s+([^.;\n]+)/i)?.[1]?.toLowerCase().trim();
  if (residence && (!context.country || !residence.includes(context.country.toLowerCase()))) return false;
  const raw = item.raw_payload && typeof item.raw_payload === "object" ? item.raw_payload as Record<string, unknown> : item;
  const locations = Array.isArray(raw.eligibleLocations) ? raw.eligibleLocations.join(" ").toLowerCase()
    : opportunityEvidence(item).split("·").slice(0, 4).map(value => value.trim()).filter(value => /^(?:united states|usa|canada|united kingdom|france|germany|europe|emea)$/i.test(value)).join(" ").toLowerCase();
  if (!locations || /worldwide|anywhere|global/.test(locations)) return true;
  const country = context.country?.toLowerCase() ?? "";
  if (country && locations.includes(country)) return true;
  if (/france|germany|spain|italy|netherlands|belgium|portugal|ireland|austria|poland|sweden|denmark|finland/.test(country) && /europe|\beu\b|emea/.test(locations)) return true;
  return false;
}

export function permitsEmployment(item: Record<string, unknown>, context: UserContext) {
  const raw = item.raw_payload && typeof item.raw_payload === "object" ? item.raw_payload as Record<string, unknown> : item;
  const legacyArrangement = opportunityEvidence(item).split("·").slice(0, 7).find(value => /^\s*full[-_ ]time\s*$/i.test(value)) ?? "";
  if (!/full[-_ ]time/i.test(`${item.title ?? raw.title ?? ""} ${raw.employmentType ?? legacyArrangement}`)) return true;
  return !context.contractTypes?.length || context.contractTypes.some(type => /full[- ]time|employment/i.test(type));
}
