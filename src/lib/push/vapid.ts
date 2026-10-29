import "server-only";

export function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || process.env.WEB_PUSH_VAPID_SUBJECT || "https://getmonetizable.com";
  return { publicKey, privateKey, subject };
}

export function cronAuthorized(request: Request) {
  const supplied = request.headers.get("authorization") || "";
  const secrets = [process.env.CRON_SECRET, process.env.QUEST_REPORT_TOKEN, process.env.QUEST_DATA_CRON_SECRET].filter(Boolean);
  return secrets.some((secret) => supplied === `Bearer ${secret}`);
}
