import type { AnalysisResult } from "@/lib/types";

export function directionValue(analysis: AnalysisResult | null, capabilities: string[] = []) {
  const normalized = (items: string[]) => [...new Set(items.map(x => x.trim().toLowerCase()))].sort().join("|");
  const index = capabilities.length ? analysis?.combinations.findIndex(c => normalized(c.elements) === normalized(capabilities)) ?? -1 : -1;
  const combination = index >= 0 ? analysis?.combinations[index] : undefined;
  const pricing = index >= 0 ? analysis?.pricing[index] : undefined;
  const title = combination?.services[0]?.name || capabilities.join(" · ") || "Your next commercial direction";
  // Keep currency and time/project units intact; never borrow another direction's estimate.
  const observed = pricing && pricing.sampleSize >= 2 ? pricing.range?.split(/\s*·\s*/).find(value => /[€£$]\s*\d/.test(value) && /[-–—]|\bto\b/.test(value)) : undefined;
  if (!observed && capabilities.some(capability => /\binfluencer\b/i.test(capability))) {
    return {
      title,
      range: "$800–$1,800 / project",
      label: "Illustrative project value · not guaranteed earnings",
      basis: "A 20-hour influencer-campaign management project at $40–$90/hour: our scope assumption, based on Upwork’s worldwide historical contract rates. USD, before fees and taxes; excludes creator payments and ad spend. Source checked September 2026.",
      sourceUrl: "https://www.upwork.com/hire/influencer-marketing-managers/cost/",
    };
  }
  return {
    title,
    range: observed,
    label: "Comparable opportunity value · not guaranteed earnings",
    sourceUrl: undefined,
    basis: observed ? `${pricing!.sampleSize} priced listings in your saved analysis. ${pricing!.disclaimer}` : "Your selected direction needs more comparable pricing evidence before we can show a reliable value range.",
  };
}

export function monthlySavings(weeklyCents: number, monthlyCents: number) {
  return Math.max(0, weeklyCents * 4 - monthlyCents);
}
