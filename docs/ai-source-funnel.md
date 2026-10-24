# AI source → practice → registration → paid

## Scope

First-party source attribution and funnel records use the existing service-only `quest_shared_data` store. The authenticated administrator report reads `/api/growth`; anonymous callers receive 403. Existing subscription prices, entitlement rules, trial lengths and payment-method settings are unchanged.

## Consent and exclusion

Optional analytics begins after Allow analytics. Essential only skips attribution tracking; Analytics settings supports withdrawal. A first-party HTTP-only visitor identifier lasts up to 90 days. Source records retain first observed touch and a 30-day last-evidenced-touch window. The implementation stores recognised source category, known public pathname and timestamps; full referrer URLs, account tokens, queries/prompts, trading records and free-text notes are excluded from the growth payload.

Admin accounts, test-account email domain and the `?internal=1` marker are excluded. Open the site once with `?internal=1` on a testing browser to persist the internal marker; the legacy visit route also checks the marker on the first request. Historical aggregate statistics cannot be retroactively cleaned reliably. No IP address is stored in growth records; the existing abuse limiter uses a one-way hash separately.

Google/Bing search referrals are separate from identifiable ChatGPT, Perplexity, Claude, Copilot and Gemini hosts. An allowlisted `utm_source` is labelled UTM evidence rather than referrer evidence. Missing referrer is `direct_unknown`, not inferred AI traffic. Referral attribution is not evidence of an AI citation or impression.

## Events and evidence

| Event | Evidence |
| --- | --- |
| visit | Consented browser capture; unique visitor/day/public path |
| try_start | Trusted user click on free practice or a direction choice; automatic demo state changes are excluded |
| practice_completed | A valid learning answer accepted by the server |
| signup_start | Browser opens the registration/sign-in entry; not proof of registration |
| signup_verified | Verified account created after the observed acquisition touch (15-minute clock/first-capture tolerance); once per user. Delayed email confirmation preserves its original acquisition context. |
| checkout_started | Server successfully creates or reuses a Checkout Session URL; once per session |
| checkout_completed | Stripe-signed checkout completion webhook |
| trial_started | Completed checkout with a trialing subscription; separate from payment |
| paid | First positive `invoice.paid` for a newly tracked checkout, with matching customer/subscription and verified environment; once per user |

The webhook uses the existing Stripe signature and environment checks, and persists growth events inside the existing event-ledger transaction. Replayed webhooks and repeated checkout links are deduplicated. Historic subscriptions without a tracked acquisition context are not counted as new acquisition conversions. Paid counts measure first observed gross payment conversions, not net revenue after later refunds. Reporting counts distinct people by first observed source over 30 days; anonymous visitors and signed-in accounts can differ across devices, so the table is not a strict cohort conversion-rate report.

Attribution is best-effort: ad blockers, denied consent, missing referrers and links opened on another device can leave gaps. Analytics failures do not reject successful sign-in or Checkout URL creation. No real charge or test subscription is necessary to validate the implementation.

## Verification

- `node tests/growth-attribution.mjs`: source classification, host spoofing, consent, registration, actual practice, checkout/trial/paid, invoice amount, customer match, idempotency and internal exclusion.
- `node tests/search-foundation.mjs`: public page regression checks.
- After deploy, verify unauthenticated `/api/growth` is 403 and the authenticated admin report is readable.
- Synthetic browser verification uses `?internal=1` and must not appear as an acquired user or a paid conversion.
