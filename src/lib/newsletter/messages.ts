import { CONSENT_TEXT_VERSION } from "./copy";
import type { NewsletterLocale } from "./policy";

const APP_URL = "https://getmonetizable.com";

export const SENDER_IDENTITY = "Serina, fondatrice de Monetizable / founder of Monetizable";
export const PUBLIC_CONTACT = "contact@getmonetizable.com";
export const POSTAL_PLACEHOLDER = "[NEWSLETTER_POSTAL_ADDRESS]";

export { consentCopy } from "./copy";

const unsubscribeLabel: Record<NewsletterLocale, string> = {
  en: "Unsubscribe",
  fr: "Se désabonner",
  zh: "退订",
};

const languageName: Record<NewsletterLocale, string> = {
  en: "English",
  fr: "français",
  zh: "中文",
};

export function postalLine(envValue: string | undefined): { configured: boolean; line: string } {
  const value = envValue?.replace(/[\r\n]+/g, " ").trim() ?? "";
  if (!value) return { configured: false, line: POSTAL_PLACEHOLDER };
  return { configured: true, line: value.slice(0, 300) };
}

export function unsubscribeUrl(token: string): string {
  return `${APP_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function confirmUrl(token: string): string {
  return `${APP_URL}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

export function listUnsubscribeHeaders(token: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(token)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

export function footerText(locale: NewsletterLocale, postal: string, token: string): string {
  return [
    "",
    "--",
    SENDER_IDENTITY,
    APP_URL,
    PUBLIC_CONTACT,
    postal,
    `${unsubscribeLabel[locale]}: ${unsubscribeUrl(token)}`,
    "",
  ].join("\n");
}

export function footerHtml(locale: NewsletterLocale, postal: string, token: string): string {
  const url = escapeHtml(unsubscribeUrl(token));
  return `<hr style="border:0;border-top:1px solid #eadcba;margin:28px 0"><p style="font-size:13px;line-height:1.5;color:#746b58">${escapeHtml(SENDER_IDENTITY)}<br><a href="${APP_URL}">getmonetizable.com</a><br>${escapeHtml(PUBLIC_CONTACT)}<br>${escapeHtml(postal)}</p><p style="font-size:13px"><a href="${url}">${escapeHtml(unsubscribeLabel[locale])}</a></p>`;
}

export function withFooter(locale: NewsletterLocale, html: string, text: string, token: string, postal = postalLine(process.env.NEWSLETTER_POSTAL_ADDRESS).line) {
  return {
    html: `${html}${footerHtml(locale, postal, token)}`,
    text: `${text}${footerText(locale, postal, token)}`,
    headers: listUnsubscribeHeaders(token),
  };
}

const confirmCopy: Record<NewsletterLocale, { subject: string; html: string; text: string }> = {
  en: {
    subject: "Confirm your Monetizable practice newsletter",
    html: `<p>Confirm that you want the Monetizable practice newsletter in English.</p><p>Creating or verifying an account does not subscribe you. This email is the confirmation step.</p><p><a href="{{url}}">Confirm my subscription</a></p><p>If you did not ask for this, you can ignore this email.</p>`,
    text: "Confirm that you want the Monetizable practice newsletter in English.\n\nCreating or verifying an account does not subscribe you. Open this link to confirm:\n{{url}}\n\nIf you did not ask for this, ignore this email.\n",
  },
  fr: {
    subject: "Confirmez la lettre d’information Monetizable",
    html: `<p>Confirmez que vous souhaitez recevoir la lettre d’information pratique de Monetizable en français.</p><p>Créer ou vérifier un compte ne vous inscrit pas. Cet e-mail est l’étape de confirmation.</p><p><a href="{{url}}">Confirmer mon inscription</a></p><p>Si vous n’avez pas fait cette demande, ignorez cet e-mail.</p>`,
    text: "Confirmez que vous souhaitez recevoir la lettre d’information pratique de Monetizable en français.\n\nCréer ou vérifier un compte ne vous inscrit pas. Ouvrez ce lien pour confirmer :\n{{url}}\n\nSi vous n’avez pas fait cette demande, ignorez cet e-mail.\n",
  },
  zh: {
    subject: "确认订阅 Monetizable 练习通讯",
    html: `<p>请确认你希望用中文接收 Monetizable 练习通讯。</p><p>创建账户或验证邮箱不会自动订阅。这封邮件是确认步骤。</p><p><a href="{{url}}">确认订阅</a></p><p>如果这不是你的请求，忽略这封邮件即可。</p>`,
    text: "请确认你希望用中文接收 Monetizable 练习通讯。\n\n创建账户或验证邮箱不会自动订阅。打开此链接确认：\n{{url}}\n\n如果这不是你的请求，忽略这封邮件即可。\n",
  },
};

export function confirmationMessage(locale: NewsletterLocale, confirmToken: string, unsubscribeToken: string) {
  const copy = confirmCopy[locale];
  const url = confirmUrl(confirmToken);
  const body = withFooter(locale, copy.html.replaceAll("{{url}}", escapeHtml(url)), copy.text.replaceAll("{{url}}", url), unsubscribeToken);
  return { subject: copy.subject, ...body, version: CONSENT_TEXT_VERSION, language: languageName[locale] };
}

export function pageShell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#fff6e5;color:#25251f;font-family:Georgia,serif"><main style="max-width:560px;margin:48px auto;padding:32px;background:#fffdf7;border-radius:20px"><p style="letter-spacing:.14em;font-size:12px">MONETIZABLE</p><h1 style="font-size:28px;line-height:1.3">${escapeHtml(title)}</h1>${body}<p style="color:#746b58;font-size:14px">${escapeHtml(SENDER_IDENTITY)}<br>${escapeHtml(PUBLIC_CONTACT)}</p></main></body></html>`;
}
