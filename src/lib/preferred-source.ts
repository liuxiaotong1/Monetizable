export const GOOGLE_PREFERRED_SOURCE_URL =
  "https://google.com/preferences/source?q=getmonetizable.com";

/**
 * This CTA must stay off until the production Blog is indexed and appears in
 * Google's source-preferences tool. The flag records that manual eligibility
 * check; it is not a claim that Google has endorsed the publication.
 */
export function preferredSourceCtaEnabled(value = process.env.NEXT_PUBLIC_GOOGLE_PREFERRED_SOURCE_ENABLED) {
  return value?.trim().toLowerCase() === "true";
}
