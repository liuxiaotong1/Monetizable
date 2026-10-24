# Trading practice search rollout

## Approved product language

Use `src/lib/marketing/positioning.ts` as the shared public description. Describe what Monetizable does. Keep legal and measurement limitations in their appropriate notices.

## First release — 24 October 2026

- Visible server-rendered homepage definition and navigable links, outside the client-only account loading gate.
- Three initial intent pages: trading discipline app, following a trading plan, trading plan checklist.
- Public product, about, methodology and FAQ pages replace the retired career narrative at those URLs.
- Canonical metadata, social metadata, WebApplication/Organization and page/breadcrumb structured data.
- Sitemap lists current public pages only; robots allows public crawling and excludes API/admin paths.
- Public IndexNow ownership key and a submission script that verifies production pages/canonicals before notifying.
- `node tests/search-foundation.mjs` validates rendered content and metadata. Cloud build remains the full TypeScript/Next verification.

## Remaining stages

1. Verify GSC and Bing ownership/index status using the existing accounts, submit the sitemap and inspect new URLs. A submitted URL is not a measured search impression.
2. Establish AI/referral attribution and first quest → saved plan → review → seven-day active use → trial/paid events. Exclude admin/internal traffic; never retroactively relabel unverified historic sessions.
3. Build the interactive checklist and discipline self-review tools. The current checklist is a readable template; it must not be promoted as a newly shipped interactive tool.
4. Research revenge trading, gamified journaling and journal-vs-discipline comparison pages, with primary sources and feature verification before publication.
5. Prepare product demos and channel-specific educational distribution. Record verified public URLs for anything actually published; community rules and required platform confirmations still apply.
6. Build an opt-in research protocol before publishing any aggregated behavioural benchmark. No user count, performance lift, AI citation or paid outcome may be inferred from this deployment.

## Measurement baseline

The deployment and HTTP checks establish publication and crawlable output only. Search impressions, rankings, AI citations, referrals, activation, retention and paid outcomes require independently verified reports. Report unavailable until measured.
