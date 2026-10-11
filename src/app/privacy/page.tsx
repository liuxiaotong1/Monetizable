import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { MAIN_SITE_URL } from "@/lib/blog";

const metadata: Metadata = {
  title: "Privacy Summary",
  description: "How Monetizable handles CV files, public profile evidence, generated analysis results, retention, deletion, payments, and analytics.",
  alternates: { canonical: `${MAIN_SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return <Localized><InfoPage eyebrow="Privacy" title="Professional evidence is used to answer the user—not to build a public profile." description="This operational summary explains the product's current data flow in plain language. It should be reviewed alongside any formal legal terms introduced before wider commercial launch.">
    <h2>Inputs</h2>
    <p>Users may provide a CV, pasted experience, or a public LinkedIn member URL. The system does not use LinkedIn OAuth or authenticated scraping. Public-profile evidence is limited to information available without signing in or to indexed public snippets.</p>
    <h2>File handling</h2>
    <p>Before analysis, the user must actively select the save option. The original CV is then stored in a private, non-public bucket together with the structured candidate profile for up to 24 months. Extracted CV text is not persisted as a separate record.</p>
    <h2>Generated results</h2>
    <p>The generated analysis and minimal matching context may be stored so the preview and paid report can be retrieved. Results expire after 24 hours by default and can be deleted immediately from the report flow.</p>
    <h2>Candidate skill profile</h2>
    <p>With the user’s required affirmative selection before analysis, Monetizable stores the original CV and a structured profile containing up to eight prioritized skills, language and location constraints, skill combinations, adjacent roles, and potential destination markets to improve future opportunity matching and aggregated market intelligence. The CV is private and is not exposed through a public URL. These records are retained for no more than 24 months, can be refreshed by a later scan, and are deleted together when the user deletes the linked analysis from the report. After the report expires, deletion can be requested at liuxiaotong268@gmail.com.</p>
    <p>SuperCharlie subscribers also have a private Capacity Graph, subscription status, opportunity matches, execution history, and outreach records. Continuous application or outreach happens only after explicit, revocable authorization. Unknown eligibility, identity, education, work-authorization, or experience facts pause execution rather than being inferred.</p>
    <p>If you connect Gmail, access tokens are encrypted. We only process replies in threads created by SuperCharlie, and we store the reply classification and Gmail identifiers rather than the email body. Disconnecting Gmail revokes future access.</p>
    <p>Deleting profile data and canceling a Stripe subscription are separate actions. Billing can be managed through Stripe’s customer portal; deleting stored profile data can be requested from the private Agent area or by contacting us.</p>
    <h2>Payments and analytics</h2>
    <p>Payment completion is handled through Stripe. Product analytics measure funnel actions such as starting an analysis or opening an opportunity. During the current browser session, Monetizable keeps only the discovery source and channel so a later funnel action can be attributed to sources such as Google, Bing, ChatGPT, or Perplexity. When someone moves from the Blog to the main product, those two non-personal values may be carried in standard UTM parameters. Microsoft Clarity, when configured, masks session recordings and does not receive analysis identifiers as custom tags.</p>
    <h2>Public content</h2>
    <p>User CVs, pasted experience, individual analysis results, and optional candidate profiles are not published as blog content or made publicly searchable. Aggregated product insights must remove identifying information before research use.</p>
  </InfoPage></Localized>;
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
