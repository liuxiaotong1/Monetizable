export async function sendAccountSetupEmail(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OPPORTUNITY_EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Account email delivery is not configured");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getmonetizable.com";
  const setupUrl = new URL("/auth", appUrl);
  setupUrl.searchParams.set("mode", "signup");
  setupUrl.searchParams.set("next", "/agent?setup=intent");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Create your Monetizable account",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111"><h1>SuperCharlie is ready</h1><p>Create your private Monetizable account. SuperCharlie will help package what you do best, scan the market, and prepare outreach drafts for your approval.</p><p><a href="${setupUrl.toString()}" style="display:inline-block;background:#d8a52f;color:#111;padding:14px 22px;border-radius:999px;font-weight:700;text-decoration:none">Start with SuperCharlie</a></p><p style="color:#666;font-size:14px">Use the same email address you used at checkout.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Account email delivery failed (${response.status})`);
}

export async function sendSignupConfirmationEmail(email: string, tokenHash: string, next = "/agent") {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OPPORTUNITY_EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Account email delivery is not configured");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getmonetizable.com";
  const confirmUrl = new URL("/auth/callback", appUrl);
  confirmUrl.searchParams.set("token_hash", tokenHash);
  confirmUrl.searchParams.set("type", "signup");
  confirmUrl.searchParams.set("next", next);
  const logoUrl = new URL("/monetizable-mark-email.png", appUrl).toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Confirm your Monetizable account",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111;background:#faf8f2;padding:32px;border-radius:24px"><img src="${logoUrl}" width="60" height="60" alt="Monetizable" style="display:block"><h1 style="margin:22px 0 8px;font-size:30px">Confirm your Monetizable account</h1><p style="font-size:16px;line-height:1.6;color:#555">Confirm your email to keep your analysis, opportunities and SuperCharlie outreach private.</p><p style="margin:28px 0"><a href="${confirmUrl.toString()}" style="display:inline-block;background:#e4b13b;color:#111;padding:14px 24px;border-radius:999px;font-weight:700;text-decoration:none">Confirm email</a></p><p style="color:#777;font-size:13px;line-height:1.5">If you did not create a Monetizable account, you can ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Confirmation email delivery failed (${response.status})`);
}
