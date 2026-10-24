export const growthCookie = 'quest-growth-visitor';
export const internalCookie = 'quest-analytics-internal';
export const sources = ['chatgpt', 'perplexity', 'claude', 'copilot', 'gemini', 'google_search', 'bing_search', 'other_referral', 'direct_unknown'] as const;
export type GrowthSource = typeof sources[number];
export type Touch = {source: GrowthSource; evidence: 'referrer' | 'utm' | 'none'; path: string; at: string};
export type Attribution = {first: Touch; last: Touch; internal?: boolean; visitor?: string; userId?: string};
const aiHosts: Record<string, GrowthSource> = {'chatgpt.com':'chatgpt','chat.openai.com':'chatgpt','perplexity.ai':'perplexity','claude.ai':'claude','copilot.microsoft.com':'copilot','gemini.google.com':'gemini'};
const utmSources: Record<string, GrowthSource> = {...aiHosts, chatgpt:'chatgpt',perplexity:'perplexity',claude:'claude',copilot:'copilot',gemini:'gemini',google:'google_search',bing:'bing_search'};
export function sourceOf(host: unknown, utm: unknown): Pick<Touch, 'source' | 'evidence'> {
  const h = typeof host === 'string' ? host.toLowerCase().replace(/^www\./, '') : '';
  for (const [domain, source] of Object.entries(aiHosts)) if (h === domain || h.endsWith('.' + domain)) return {source, evidence:'referrer'};
  if (/^google\.(com|fr|co\.uk|de|ca|com\.au)$/.test(h)) return {source:'google_search',evidence:'referrer'};
  if (h === 'bing.com' || h.endsWith('.bing.com')) return {source:'bing_search',evidence:'referrer'};
  if (typeof utm === 'string' && utmSources[utm.toLowerCase()]) return {source:utmSources[utm.toLowerCase()],evidence:'utm'};
  if (h && h !== 'getmonetizable.com' && !h.endsWith('.getmonetizable.com') && h !== 'accounts.google.com' && h !== 'checkout.stripe.com' && h !== 'billing.stripe.com') return {source:'other_referral',evidence:'referrer'};
  return {source:'direct_unknown',evidence:'none'};
}
export function publicPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  const path = value.split(/[?#]/)[0];
  return /^\/(?:blog|product|about|faq|methodology|pricing|privacy|auth|trading-discipline-app|follow-your-trading-plan|trading-plan-checklist)?$/.test(path) ? path : '/other';
}
export function mergeAttribution(previous: Attribution | undefined, touch: Touch, now = Date.now()): Attribution {
  if (!previous) return {first:touch,last:touch};
  // Direct returns preserve the last evidenced touch for a 30-day attribution window.
  const expired = now - Date.parse(previous.last.at) > 30 * 86400_000;
  return {...previous,last:touch.source !== 'direct_unknown' || expired ? touch : previous.last};
}
export function billingStage(type: string, obj: {amount_paid?: number; status?: string; billing_reason?: string}): 'checkout_completed' | 'paid' | undefined {
  if (type === 'invoice.paid' && obj.status === 'paid' && Number.isSafeInteger(obj.amount_paid) && obj.amount_paid! > 0) return 'paid';
  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') return 'checkout_completed';
}
