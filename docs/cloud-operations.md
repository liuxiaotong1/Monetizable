# Monetizable unattended operation

Production: https://getmonetizable.com, Vercel project `monetizable` in
`liuxiaotong1s-projects`. Supabase project `ofzongclkbvnarkeoqgo`.

| Work | Cloud owner | Cadence / record |
| --- | --- | --- |
| QQQ completed daily bars | Supabase pg_cron → Vercel `/api/refresh` | Every 5 minutes, all days. Source TTL 15 minutes with immediate close-boundary retry. |
| Calendar, actual/prior/consensus, histories, news/sentiment | Same refresh | Independent source caches/retry clocks. Official release failures retain prior verified values. |
| New factual learning cards | Same refresh | Derived from verified releases, stored under `learning:YYYY-MM-DD`. Static concept cards are curated rather than falsely dated as new. |
| Closed prediction results | Same refresh | First verified result under private `review:<user-id>:<judgment-id>`. Original judgments are never edited. |
| Data-only report fallback | Same refresh | Weekdays after Paris 14:15 and before the actual US open; Sunday after Paris 19:00. |
| Cross-asset report + Telegram | GitHub Actions `market-reports.yml` | Both UTC offsets cover Europe/Paris DST. Script gates publication using Paris time and the actual US session. Repeated triggers retry safe failures. |

The GitHub runner needs no checkout from this Mac, no local `.env`, no Codex
desktop, and no ChatGPT conversation. Its five secrets are encrypted GitHub
Actions repository secrets, not committed files. Public market data is sent to
the existing website and the already configured Telegram recipient.

## Verification and limits

- Compare `cron.job_run_details` with `net._http_response`: enqueue success alone
  does not prove HTTP success. `/api/refresh` returns 503 on incomplete execution.
- `quest_shared_data` contains `refresh-health`, `cloud-report-health`, and
  `delivery:telegram:<kind>:<date>`. All remain service-role-only under RLS.
- Telegram success records the message ID. An ambiguous send timeout is marked
  `uncertain` and does not automatically resend a possible duplicate.
- GitHub Actions can queue late. 14:15 / 19:00 are planned start times, not a
  guaranteed publication second. Daily work never publishes after the US open.
- Reports explicitly mark unavailable/old quotes. They use deterministic
  conditional explanations and retrieved headlines; no unconfigured AI service
  or paywalled full article is claimed. They do not replace broker quotes.
- A Mac shutdown cannot stop these cloud jobs. Provider outages, quotas, source
  failures and a paused Supabase project can still affect availability.
- The Codex local automation was paused after the 15 October cloud report and
  Telegram delivery were verified. Historical reports remain available.
- Web Push is not an active subscription service. Browser service-worker support
  alone does not constitute push delivery. Existing website notices remain in-app.

Run `node --test tests/cloud-report.test.mjs` for Paris DST, holiday/open-window
guards and missing/stale-quote handling. `workflow_dispatch` with `check_only`
verifies configuration without sending a notification.
