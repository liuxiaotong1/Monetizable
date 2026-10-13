# QQQ Quest — public edition

Production: https://getmonetizable.com

Next.js 16, React, TypeScript and Tailwind. Guests can explore without signing in. Public users receive the English experience; only the verified administrator account receives the Chinese experience.

## Data and privacy

Read-only server routes retrieve public market bars, scenarios, events, learning cards and reports from the existing private QQQ Quest data service. `QUEST_SOURCE_SITE_TOKEN` is a sensitive server-only Vercel environment variable; it must never use a NEXT_PUBLIC prefix. The upstream route exports only public material. Guest judgments, notes, settings, XP and learning history stay in browser storage. Signed-in users synchronize a separate account record to Postgres with optimistic revisions. Personal records are never exported by the shared market feed. Clearing guest browser storage removes that guest’s records.

The existing backend schedules continue updating the feed. The public server caches it for 60 seconds and keeps a clearly marked public snapshot if the connection fails. This edition offers in-app reminders, not server push subscriptions.

## Development

Run `npm ci`, `npm run dev`. Verify with `npm run typecheck`, `node tests/public-store.mjs`, `node tests/account-policy.mjs` and `npm run build`. Without a configured source token, development uses the public snapshot with a delayed-data indicator.

## Deployment

The existing Monetizable Vercel project and custom domain host this app. GitHub main is the production branch. Previous Monetizable application code remains recoverable in Git history and the archive tag created before replacement. Old application cron configuration has been removed. No old personal data or service credentials are bundled into this frontend.

## Accounts, operations and language

Email magic-link login uses the existing Supabase account project and Resend delivery. All administrator routes verify the Supabase user on the server, require a verified email and match only `liuxiaotong268@gmail.com`; client metadata cannot grant a role. Cookie refresh uses Next.js 16 Proxy. Auth-changing requests require same-origin POST. Email requests have database-backed rate limits. Account tables are RLS-enabled and inaccessible to anon/authenticated direct clients; only server code reads the current verified user record. Apply `supabase/migrations/20261011180000_quest_accounts.sql` before production (applied to the existing database on 2026-10-11). Database TLS validates the public Supabase root CA.

Server environments: POSTGRES_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, OPPORTUNITY_EMAIL_FROM and STRIPE_SECRET_KEY. Browser-safe Supabase variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Never expose the service role, Postgres, Resend, Stripe or source-service secrets to the browser.

Vercel Web Analytics is installed globally. Analytics excludes admin and confirmation pages and removes query parameters. `/admin` shows independent first-party UTC visitor/sign-up curves and links to the official Vercel Analytics dashboard; those counts deliberately do not claim to reproduce Vercel's deduplication. Stripe payments are read-only, scoped to the existing Stripe account's latest 100 charges including legacy Monetizable. No new Quest pricing or checkout product was configured.

The public experience uses 60 authored English concept cards and a data-driven daily QQQ exercise, rather than exposing Chinese source cards. Shared numeric event data is retained; English preparation prompts accompany scheduled report status. Existing full source report prose remains in the administrator's Chinese experience. The three-step tutorial can be reopened from the account bar. Brand proposals at `/brand-proposals` are original SVG concepts; availability is not verified and no rebrand is applied.

## Monetizable Plus (Quest)

Stripe hosted subscription Checkout offers 7 days free with a payment method collected upfront, then USD 19.90/month. Customer Portal allows cancellation at period end. Quest has a dedicated product/price and webhook endpoint; older Monetizable products and endpoints are not reused. Subscription access is based on verified webhook status and expiry, never the success URL or a browser record. Admin access bypasses quotas. Free accounts can claim one card each Paris calendar week, enforced atomically in Postgres; sign-in is required to track the weekly allowance. Investor style self-tests remain available.

Apply `supabase/migrations/20261013000000_quest_billing_feed.sql`. Billing setup is an authenticated admin POST to `/api/billing/setup`; provisioning stores its private signing secret in the server-only, RLS-protected `quest_shared_data` table. Production needs the existing `STRIPE_SECRET_KEY`. A temporary `QUEST_SETUP_TOKEN` can provision the requested integration once; remove it after setup. `QUEST_REPORT_TOKEN` authorizes original report ingestion and is server-only. No payment secrets belong in client code or Git.

Independent Yahoo regular-session candles are checked against the trading calendar and persisted to Postgres. Vercel Cron runs UTC slots covering Paris daylight-saving changes, with application checks for Paris 14:15 weekdays and Sunday 19:00. Reports generated after the US open are never labeled premarket. Original reports take precedence over automatic data preparation, retain their actual generation timestamp, and are ingested idempotently. The latter has no live news or cross-asset feed and is clearly marked partial. Knowledge-answer fields and premarket prose are withheld by server endpoints for free visitors; already-unlocked cards remain in the visitor’s own record.

After the open, prediction entry targets the next trading date. Early preparation can use an older completed candle and is labeled provisional; the direction result uses the actual previous-session close when it becomes available. Original scenario and judgment snapshots remain unchanged.
