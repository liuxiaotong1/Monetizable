export const config = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  priceCents: Number(process.env.MONETIZABLE_PRICE_CENTS ?? 499),
  agentWeeklyPriceCents: Number(process.env.MONETIZABLE_AGENT_WEEKLY_PRICE_CENTS ?? 999),
  agentMonthlyPriceCents: Number(process.env.MONETIZABLE_AGENT_MONTHLY_PRICE_CENTS ?? 2999),
  agentTrialDays: 0,
  currency: process.env.MONETIZABLE_CURRENCY ?? "eur",
  resultTtlHours: Number(process.env.RESULT_TTL_HOURS ?? 24),
  freshnessDays: Number(process.env.OPPORTUNITY_FRESHNESS_DAYS ?? 45),
  searchProvider: process.env.SEARCH_PROVIDER ?? "mock",
  enableRemoteFirstJobs: process.env.ENABLE_REMOTE_FIRST_JOBS !== "false",
  enableArbeitnow: process.env.ENABLE_ARBEITNOW !== "false",
  maxSearchQueries: Number(process.env.MAX_SEARCH_QUERIES ?? 8),
  demoMode: process.env.DEMO_MODE === "true",
  stripePaymentLinkUrl: process.env.STRIPE_PAYMENT_LINK_URL ?? "",
  opportunityAgentEnabled: process.env.OPPORTUNITY_AGENT_ENABLED === "true",
  opportunityAgentExecutionEnabled: process.env.OPPORTUNITY_AGENT_EXECUTION_ENABLED === "true",
  opportunityAgentExecutionTestEmails: (process.env.OPPORTUNITY_AGENT_EXECUTION_TEST_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  stripeAgentWeeklyPriceId: process.env.STRIPE_AGENT_WEEKLY_PRICE_ID ?? "",
  stripeAgentMonthlyPriceId: process.env.STRIPE_AGENT_MONTHLY_PRICE_ID ?? process.env.STRIPE_AGENT_PRICE_ID ?? "",
  stripeAgentWeeklyPaymentLinkUrl: process.env.STRIPE_AGENT_WEEKLY_PAYMENT_LINK_URL ?? "",
  stripeAgentMonthlyPaymentLinkUrl: process.env.STRIPE_AGENT_MONTHLY_PAYMENT_LINK_URL ?? "",
  agentLightCandidateLimit: Number(process.env.MAX_AGENT_LIGHT_CANDIDATES ?? 60),
  agentDeepMatchLimit: Number(process.env.MAX_AGENT_DEEP_MATCHES ?? 3),
  agentDailyActionLimit: Math.min(50, Number(process.env.MAX_AGENT_DAILY_ACTIONS ?? 50)),
  agentDailyOutreachTarget: Math.min(50, Math.max(3, Number(process.env.AGENT_DAILY_OUTREACH_TARGET ?? 20))),
};

export function formatPrice(cents = config.priceCents, currency = config.currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatAgentPrice(cents = config.agentMonthlyPriceCents, currency = config.currency) {
  return formatPrice(cents, currency);
}

export type AgentBillingInterval = "week" | "month";

export function stripeAgentPriceId(interval: AgentBillingInterval) {
  return interval === "week" ? config.stripeAgentWeeklyPriceId : config.stripeAgentMonthlyPriceId;
}

export function stripeAgentPaymentLinkUrl(interval: AgentBillingInterval) {
  return interval === "week" ? config.stripeAgentWeeklyPaymentLinkUrl : config.stripeAgentMonthlyPaymentLinkUrl;
}
