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
