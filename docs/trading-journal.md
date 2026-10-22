# Trading journal v1

Four stages: Plan, Trade, Import, Review. Available under Trading DNA after a user equips a system. Homepage shows the workflow and, when signed in with imports, the user's own performance.

## CSV contract

- One row per **closed trade**, with stable trade ID, close date, instrument, realized P&L. Raw fills and open positions are not automatically paired.
- An account alias identifies the source. Reuse it every month. No account number or broker credentials required.
- Select statement month, delimiter, date order, decimal convention, P&L basis, currency and column mapping. Recognized headers are suggested; preview and confirmation remain mandatory.
- Net basis does not subtract fees again. Gross basis subtracts positive fee expenses. Empty optional fees mean zero. Currency defaults only when the field is absent/empty; different currencies never combine.
- Dates follow the export's calendar day, without timezone conversion. Session date initially defaults to the current New York calendar date.
- All rows must validate. Maximum 2 MB / 5,000 rows per import; 25,000 saved rows and 6 MB of journal JSON per account.
- Stable account alias + ID prevents double counting; identical rows are skipped, conflicting rows are rejected. Changed IDs or account aliases represent different records and are not inferred as duplicates.

## Metrics and review

Trade win rate = positive-net closed trades / all closed trades (including breakeven). Profit factor = positive net total / absolute negative net total; no losses => unavailable, not a fabricated infinite score. Expectancy = average net P&L. Prediction direction accuracy remains separate.

Strategy can be imported or assigned during review. Rule adherence is a user's checklist self-report, not verified by P&L. Rules are snapshotted when saving a plan and cannot change after that date's trades are imported. Records with only a date cannot establish that a plan preceded entry. Outcome metrics and rule adherence must not be presented as causal evidence or profit guarantees.

Finish My Day requires every imported trade on the date to have a review, or explicit confirmation of a no-trade day. Completed days are locked, with an explicit reopen action. Importing a new trade on a locked date requires reopening it.

Preparation assistance is a transparent template; summaries and improvement prompts are deterministic. No LLM or broker connection is claimed. Screenshots are privately stored compressed images (2 MB input, ~165 KB encoded image payload max).

## Persistence and safeguards

`/api/journal`: authenticated GET and same-origin authenticated POST. Key derives only from `currentUser().id`; client user IDs are ignored. Existing server-only `quest_shared_data` storage retains RLS denial of anon/authenticated direct access. No migration or changes to prediction history required. All mutations are validated, use a PostgreSQL transaction/advisory lock and optimistic revision, and respond private/no-store. No source CSV upload is persisted; only confirmed normalized records are saved.

Tests: `node tests/journal.mjs`, existing homepage, discipline and prediction DNA suites, TypeScript check. Browser verification uses synthetic records in an isolated localhost fixture, never a customer's live journal.
