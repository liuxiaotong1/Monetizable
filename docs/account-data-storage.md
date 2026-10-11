# Account data and free allowances

Production project: `ofzongclkbvnarkeoqgo` (Supabase).

Admin: https://supabase.com/dashboard/project/ofzongclkbvnarkeoqgo

| Data | Where to inspect |
| --- | --- |
| Email, account ID and authentication | Authentication → Users (passwords are not readable) |
| Original PDF/DOCX | Storage → private `candidate-cvs` bucket |
| LinkedIn URL, pasted text, upload status, consent and retention date | Table Editor → `profile_submissions` |
| Structured profile and capabilities | `candidate_profiles` |
| Analysis-to-profile and original-file mapping | `candidate_scans` |
| Complete saved report | `analyses`, joined by `candidate_scans.analysis_id` |
| Capacity Graph versions | `capacity_graphs` |
| Chosen direction and setup state | `agent_onboarding` |
| Confirmed facts/preferences | `application_profiles` |
| Usage and direction-change counts | `account_usage_events` |
| Stripe subscription status | `agent_subscriptions` |

Filter by the account's `user_id`; use `candidate_profile_id` and `analysis_id` to follow linked records. Source inputs are saved before AI analysis. An unfinished guest upload is claimed only using its private recovery cookie, or at verified signup/password login/Google sign-in—not by matching public CV content. Never assign historical unlinked profiles to an arbitrary account.

Owned reports remain readable within their consented profile retention period rather than disappearing after 24 hours. Current consent is up to 24 months. This is not a promise of permanent storage: account/profile deletion remains supported, and past missing files cannot be reconstructed. New source and usage tables are service-role-only with RLS; never expose the service key to a browser.

Each account gets two successful analyses. Concurrent analyses reserve a slot; failed attempts release it; duplicate request IDs do not double-charge. Existing saved analyses count toward the allowance. First direction selection is free; two subsequent distinct capability-set changes are free. Reordering the same set does not count. Beyond either limit, an active Stripe subscription is required. Existing saved reports remain accessible. New Checkout sessions have no trial. Existing subscription contracts are not canceled or altered.

The allowances count explicit profile analyses and direction changes, not background market scans or page views. Email outreach still requires user approval.
