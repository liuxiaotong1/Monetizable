import "server-only";
import { fromDomain, interpretDomains, type ProviderHealth } from "./policy";

export async function providerHealth(): Promise<ProviderHealth> {
  const domain = fromDomain(process.env.OPPORTUNITY_EMAIL_FROM);
  const key = process.env.RESEND_API_KEY;
  if (!key) return { key_valid: false, from_domain: domain, domain_status: "unknown" };
  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json().catch(() => null);
    return interpretDomains(response.status, body, domain);
  } catch {
    return { key_valid: false, from_domain: domain, domain_status: "unchecked" };
  }
}
