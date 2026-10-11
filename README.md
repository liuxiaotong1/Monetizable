# QQQ Quest — public edition

Production: https://getmonetizable.com

Next.js 16, React, TypeScript and Tailwind. Public visitors do not sign in.

## Data and privacy

Read-only server routes retrieve public market bars, scenarios, events, learning cards and reports from the existing private QQQ Quest data service. `QUEST_SOURCE_SITE_TOKEN` is a sensitive server-only Vercel environment variable; it must never use a NEXT_PUBLIC prefix. The upstream route exports only public material. Personal judgments, notes, settings, XP and learning history stay in each visitor’s local browser storage and are never sent to the shared backend. Clearing browser data removes that browser’s records; there is no cross-device sync.

The existing backend schedules continue updating the feed. The public server caches it for 60 seconds and keeps a clearly marked public snapshot if the connection fails. This edition offers in-app reminders, not server push subscriptions.

## Development

Run `npm ci`, `npm run dev`. Verify with `npm run typecheck`, `node tests/public-store.mjs` and `npm run build`. Without a configured source token, development uses the public snapshot with a delayed-data indicator.

## Deployment

The existing Monetizable Vercel project and custom domain host this app. GitHub main is the production branch. Previous Monetizable application code remains recoverable in Git history and the archive tag created before replacement. Old application cron configuration has been removed. No old personal data or service credentials are bundled into this frontend.
