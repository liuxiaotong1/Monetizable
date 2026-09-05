export type AnalyticsEvent =
  | "landing_view" | "upload_started" | "upload_completed"
  | "context_completed" | "analysis_completed" | "preview_viewed"
  | "paywall_clicked" | "checkout_started" | "purchase_completed"
  | "opportunity_clicked" | "subscription_checkout_started"
  | "hot_lead_opened" | "outreach_drafted" | "outreach_approved"
  | "email_client_opened" | "agent_application_started" | "agent_bulk_actions_approved"
  | "outreach_send_started";

export async function trackServer(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  const endpoint = process.env.ANALYTICS_ENDPOINT;
  if (!endpoint) return;
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
    });
  } catch {
    // Analytics must never block the product flow.
  }
}
