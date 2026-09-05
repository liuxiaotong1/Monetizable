export interface MailboxHealth {
  connectedAt: string;
  sentLast72Hours: number;
  sentLast7Days: number;
  hardBouncesLast7Days: number;
  providerLimitErrors: number;
  paused: boolean;
}

export function adaptiveDailyLimit(health: MailboxHealth) {
  if (health.paused || health.providerLimitErrors >= 2) return 0;
  const bounceRate = health.sentLast7Days ? health.hardBouncesLast7Days / health.sentLast7Days : 0;
  if (bounceRate >= 0.1) return 0;
  if (bounceRate >= 0.05) return 10;
  const ageMs = Date.now() - new Date(health.connectedAt).getTime();
  if (ageMs >= 7 * 86_400_000 && health.sentLast7Days >= 75 && bounceRate < 0.02) return 50;
  if (ageMs >= 72 * 3_600_000 && health.sentLast72Hours >= 20 && bounceRate < 0.03) return 25;
  return 20;
}

export function withinDailyBudget(sentToday: number, health: MailboxHealth, hardCap = 50) {
  return sentToday < Math.min(hardCap, adaptiveDailyLimit(health));
}
