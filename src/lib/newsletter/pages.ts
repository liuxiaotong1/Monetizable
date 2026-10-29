import { escapeHtml, pageShell } from "./messages";
import type { NewsletterLocale } from "./policy";

const confirmCopy: Record<NewsletterLocale, { title: string; body: string; button: string; done: string; invalid: string }> = {
  en: {
    title: "Confirm the practice newsletter",
    body: "Confirm that you want the Monetizable practice newsletter. This step is separate from creating an account.",
    button: "Confirm my subscription",
    done: "You are subscribed. Future messages use this language, and each one includes an unsubscribe link.",
    invalid: "This confirmation link is no longer active.",
  },
  fr: {
    title: "Confirmer la lettre d’information",
    body: "Confirmez que vous souhaitez la lettre d’information pratique de Monetizable. Cette étape est distincte de la création du compte.",
    button: "Confirmer mon inscription",
    done: "Votre inscription est confirmée. Les prochains messages utilisent cette langue et contiennent un lien de désabonnement.",
    invalid: "Ce lien de confirmation n’est plus actif.",
  },
  zh: {
    title: "确认练习通讯",
    body: "请确认你希望接收 Monetizable 练习通讯。这一步与创建账户是分开的。",
    button: "确认订阅",
    done: "订阅已确认。之后的邮件会使用这个语言，并附有退订链接。",
    invalid: "这个确认链接已经失效。",
  },
};

const unsubscribeCopy: Record<NewsletterLocale, { title: string; body: string; button: string; done: string }> = {
  en: {
    title: "Unsubscribe",
    body: "This stops the Monetizable practice newsletter for this address.",
    button: "Unsubscribe",
    done: "This address will not receive the practice newsletter.",
  },
  fr: {
    title: "Se désabonner",
    body: "Cela arrête la lettre d’information pratique de Monetizable pour cette adresse.",
    button: "Se désabonner",
    done: "Cette adresse ne recevra plus la lettre d’information pratique.",
  },
  zh: {
    title: "退订",
    body: "这将停止向这个地址发送 Monetizable 练习通讯。",
    button: "退订",
    done: "这个地址不会再收到练习通讯。",
  },
};

function form(action: string, token: string, label: string): string {
  return `<form method="post" action="${escapeHtml(action)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit" style="margin:16px 0;padding:14px 22px;border:0;border-radius:14px;background:#f4e3ad;color:#493615;font-weight:700">${escapeHtml(label)}</button></form>`;
}

export function confirmPage(token: string, locale: NewsletterLocale): string {
  const copy = confirmCopy[locale];
  return pageShell(copy.title, `<p>${escapeHtml(copy.body)}</p>${form("/api/newsletter/confirm", token, copy.button)}`);
}

export function confirmResultPage(locale: NewsletterLocale, ok: boolean): string {
  const copy = confirmCopy[locale];
  return pageShell(copy.title, `<p>${escapeHtml(ok ? copy.done : copy.invalid)}</p>`);
}

export function unsubscribePage(token: string, locale: NewsletterLocale): string {
  const copy = unsubscribeCopy[locale];
  return pageShell(copy.title, `<p>${escapeHtml(copy.body)}</p>${form(`/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, token, copy.button)}`);
}

export function unsubscribeResultPage(locale: NewsletterLocale): string {
  const copy = unsubscribeCopy[locale];
  return pageShell(copy.title, `<p>${escapeHtml(copy.done)}</p>`);
}
