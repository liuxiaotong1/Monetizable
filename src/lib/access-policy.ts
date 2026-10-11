// Temporary free access. Set NEXT_PUBLIC_PAYWALL_ENABLED=true and redeploy
// to restore the existing paid UI and server gates. Never changes billing data.
export const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

export function canViewFullReport(paid: boolean) {
  return !PAYWALL_ENABLED || paid;
}
