import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  const url = path instanceof URL ? path : new URL(path, import.meta.url);
  if (cache.has(url.pathname)) return cache.get(url.pathname);
  const source = readFileSync(url, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name.startsWith(".")) return load(new URL(name.endsWith(".ts") ? name : `${name}.ts`, url));
    if (name.startsWith("node:") || name === "crypto") return nodeRequire(name);
    throw new Error(`Unmocked dependency ${name}`);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  cache.set(url.pathname, module.exports);
  return module.exports;
}
const policy = load("../src/lib/newsletter/policy.ts");
const copy = load("../src/lib/newsletter/copy.ts");
const webhook = load("../src/lib/newsletter/webhook.ts");
const messages = load("../src/lib/newsletter/messages.ts");
const pages = load("../src/lib/newsletter/pages.ts");

const token = "a".repeat(43);
assert.equal(policy.parseDryRun(undefined), true);
assert.equal(policy.parseDryRun(true), true);
assert.equal(policy.parseDryRun(false), false);
assert.equal(policy.parseDryRun("false"), "invalid");
assert.equal(policy.bearerAuthorized("Bearer secret", "secret"), true);
assert.equal(policy.bearerAuthorized("Bearer other", "secret"), false);
assert.equal(policy.bearerAuthorized("Bearer secret", undefined), false);
assert.equal(policy.bearerAuthorized("Bearer ", ""), false);
assert.equal(policy.normalizeEmail(" Person@Example.com "), "person@example.com");
assert.equal(policy.normalizeEmail("a@b.co\nbcc:x"), null);
assert.equal(policy.fromDomain("Monetizable <news@getmonetizable.com>"), "getmonetizable.com");
assert.equal(JSON.stringify(policy.fromDomain("Monetizable <news@getmonetizable.com>")).includes("news@"), false);
assert.equal(policy.optInDecision(null), "confirm");
assert.equal(policy.optInDecision("unsubscribed"), "confirm");
assert.equal(policy.optInDecision("subscribed"), "already");
assert.equal(policy.optInDecision("bounced"), "blocked");
assert.equal(policy.optInDecision("complained"), "blocked");
assert.equal(policy.nextDeliveryStatus("subscribed", "bounced"), "bounced");
assert.equal(policy.nextDeliveryStatus("complained", "bounced"), "complained");
assert.equal(policy.nextDeliveryStatus("unsubscribed", "complained"), "complained");
assert.equal(policy.webhookEffect("email.bounced"), "bounced");
assert.equal(policy.webhookEffect("email.clicked"), null);

const invalid = policy.interpretDomains(400, { message: "API key is invalid", key: "re_secret" }, "getmonetizable.com");
assert.equal(invalid.key_valid, false);
assert.equal(invalid.from_domain, "getmonetizable.com");
assert.equal(JSON.stringify(invalid).includes("re_secret"), false);
const restricted = policy.interpretDomains(401, { name: "restricted_api_key", message: "This API key is restricted to only send emails", statusCode: 401 }, "getmonetizable.com");
assert.deepEqual(restricted, { key_valid: true, from_domain: "getmonetizable.com", domain_status: "forbidden" });
assert.equal(policy.interpretDomains(401, { name: "validation_error", message: "API key is invalid" }, "getmonetizable.com").key_valid, false);
assert.equal(policy.interpretDomains(401, null, "getmonetizable.com").key_valid, false);
assert.equal(policy.interpretDomains(403, { name: "restricted_api_key" }, "getmonetizable.com").key_valid, true);
const verified = policy.interpretDomains(200, { data: [{ name: "GetMonetizable.com", status: "verified" }] }, "getmonetizable.com");
assert.deepEqual(verified, { key_valid: true, from_domain: "getmonetizable.com", domain_status: "verified" });
const missing = policy.interpretDomains(200, { data: [{ name: "other.example", status: "verified" }] }, "getmonetizable.com");
assert.equal(missing.domain_status, "not_found");
assert.equal(policy.interpretDomains(503, {}, "getmonetizable.com").domain_status, "unchecked");
assert.deepEqual(policy.interpretDomains(403, { message: "restricted" }, "getmonetizable.com"), { key_valid: true, from_domain: "getmonetizable.com", domain_status: "forbidden" });

const content = { en: "English note", fr: "Note française", zh: "中文内容" };
const dry = policy.parseSendRequest({ campaign_id: "weekly-practice", subject: content, html: content, text: content, test_to: "person@example.com" });
assert.equal(dry.ok, true);
assert.equal(dry.value.dryRun, true);
assert.equal(dry.value.testTo, "person@example.com");
assert.equal(policy.parseSendRequest({ dry_run: "false", campaign_id: "weekly-practice" }).ok, false);
assert.equal(policy.parseSendRequest({ dry_run: false }).ok, false);
assert.equal(policy.parseSendRequest({ dry_run: false, test_to: ["a@b.co", "c@d.co"], subject: content, html: content, text: content }).ok, false);
const real = policy.parseSendRequest({ dry_run: false, slug: "weekly-practice", subject: content, html: content, text: content });
assert.equal(real.ok && real.value.dryRun, false);
const body = policy.publicSendBody({ dryRun: true, mode: "test", counts: policy.testLocaleCounts("fr"), postalConfigured: false });
assert.equal(JSON.stringify(body).includes("@"), false);
assert.equal(JSON.stringify(body).includes("person@example.com"), false);
assert.deepEqual(body.counts, { en: 0, fr: 1, zh: 0 });
assert.equal(policy.publicError("failed for a@b.co Bearer secret-value"), "failed for [redacted] Bearer [redacted]");

const secretBytes = randomBytes(24);
const secret = `whsec_${secretBytes.toString("base64")}`;
const payload = JSON.stringify({ type: "email.bounced", data: { email_id: "msg", to: ["a@b.co"] } });
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", secretBytes).update(`msg_1.${timestamp}.${payload}`).digest("base64");
assert.equal(webhook.verifyWebhookSignature(payload, { id: "msg_1", timestamp, signature: `v1,${signature}` }, secret), true);
assert.equal(webhook.verifyWebhookSignature(payload, { id: "msg_1", timestamp, signature: `v1,${signature}tamper` }, secret), false);
assert.equal(webhook.verifyWebhookSignature(payload, { id: "msg_1", timestamp: "1", signature: `v1,${signature}` }, secret), false);
assert.equal(webhook.webhookSecretBytes("short"), null);

const confirmToken = "c".repeat(43);
for (const locale of ["en", "fr", "zh"]) {
  const message = messages.confirmationMessage(locale, confirmToken, token);
  assert.ok(message.html.includes(messages.SENDER_IDENTITY));
  assert.ok(message.html.includes(messages.POSTAL_PLACEHOLDER));
  assert.ok(message.html.includes("https://getmonetizable.com"));
  assert.ok(message.html.includes(messages.PUBLIC_CONTACT));
  assert.ok(message.text.includes(messages.SENDER_IDENTITY));
  assert.equal(message.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(message.headers["List-Unsubscribe"].includes(token));
  assert.equal(message.headers["List-Unsubscribe"].includes(confirmToken), false);
  assert.ok(message.html.includes(`/api/newsletter/confirm?token=${confirmToken}`));
  assert.ok(message.html.includes(`/api/newsletter/unsubscribe?token=${token}`));
  const page = pages.confirmPage(token, locale);
  assert.equal(page.includes("<form"), true);
  assert.equal(page.includes("type=\"submit\""), true);
  assert.equal(page.includes("<script"), false);
}
const configured = messages.postalLine("10 Market Street, Paris");
assert.equal(configured.configured, true);
assert.equal(messages.postalLine("  ").configured, false);
assert.equal(messages.footerText("en", messages.POSTAL_PLACEHOLDER, token).includes("Serina, fondatrice"), true);
assert.ok(copy.consentCopy.en.includes("unsubscribe"));
assert.equal(copy.CONSENT_TEXT_VERSION, "2026-10-29");

const files = {
  email: readFileSync(new URL("../src/app/api/auth/email/route.ts", import.meta.url), "utf8"),
  confirm: readFileSync(new URL("../src/app/api/auth/confirm/route.ts", import.meta.url), "utf8"),
  send: readFileSync(new URL("../src/app/api/newsletter/send/route.ts", import.meta.url), "utf8"),
  status: readFileSync(new URL("../src/app/api/newsletter/status/route.ts", import.meta.url), "utf8"),
  hook: readFileSync(new URL("../src/app/api/newsletter/webhook/route.ts", import.meta.url), "utf8"),
  request: readFileSync(new URL("../src/app/api/newsletter/request/route.ts", import.meta.url), "utf8"),
  migration: readFileSync(new URL("../supabase/migrations/20261029210000_newsletter.sql", import.meta.url), "utf8"),
  workflows: readFileSync(new URL("../.github/workflows/web-push.yml", import.meta.url), "utf8"),
};
assert.equal(files.email.includes("newsletter"), false);
assert.ok(files.confirm.includes("attachNewsletterAccount"));
assert.equal(files.confirm.includes("requestOptIn"), false);
assert.equal(files.confirm.includes("status = 'subscribed'"), false);
assert.ok(files.send.includes("NEWSLETTER_SEND_TOKEN"));
assert.equal(files.send.includes("CRON_SECRET"), false);
assert.equal(files.send.includes("QUEST_REPORT_TOKEN"), false);
assert.equal(files.send.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.ok(files.status.includes("providerHealth"));
assert.equal(files.status.includes("https://api.resend.com/domains"), false);
assert.ok(readFileSync(new URL("../src/lib/newsletter/health.ts", import.meta.url), "utf8").includes("https://api.resend.com/domains"));
assert.ok(files.hook.includes("RESEND_WEBHOOK_SECRET"));
assert.ok(files.hook.includes("if (!secret)"));
assert.ok(files.hook.includes("applied: false"));
assert.ok(files.request.includes("body.optIn !== true"));
assert.ok(files.migration.includes("UNIQUE (campaign_id, subscriber_id)"));
assert.ok(files.migration.includes("ENABLE ROW LEVEL SECURITY"));
assert.ok(files.migration.includes("auth.uid()"));
assert.ok(files.migration.includes("REVOKE ALL"));
assert.equal(files.workflows.includes("newsletter"), false);
assert.equal(JSON.stringify(JSON.parse(readFileSync(new URL("../src/lib/i18n/fr.json", import.meta.url), "utf8"))).includes("Optional practice newsletter"), true);

console.log("Newsletter consent, dry-run default, webhook signature, headers and locale counts passed.");
