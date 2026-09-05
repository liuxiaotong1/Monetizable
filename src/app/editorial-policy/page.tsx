import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { MAIN_SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Editorial and Research Policy",
  description: "How Monetizable selects topics, uses automation, verifies claims, cites sources, corrects errors, and updates market-sensitive content.",
  alternates: { canonical: `${MAIN_SITE_URL}/editorial-policy` },
};

export default function EditorialPolicyPage() {
  return <InfoPage eyebrow="Editorial policy" title="Useful first, inspectable second, optimized third." description="Search visibility is an outcome of useful research—not the reason to publish a page. Every article must help a professional make a better decision without hiding uncertainty.">
    <h2>Topic selection</h2>
    <p>We cover skill combinations, skills-first careers, career pivots, independent work, market-demand validation, and the practical use of professional evidence. We do not publish unrelated trending topics simply to attract traffic.</p>
    <h2>Automation and human responsibility</h2>
    <p>Automation may assist research, outlines, drafting, formatting, and quality checks. It does not remove editorial responsibility. Published pages must add original analysis, verified examples, product evidence, or a useful framework beyond a generic AI summary. When a migrated or automated draft is retained, the article carries an editorial note.</p>
    <h2>Sources</h2>
    <p>Quantitative and time-sensitive claims should link to primary research, official data, or the closest inspectable source available. Sources must actually support the nearby claim. We avoid invented citations, circular references, and statistics whose methodology cannot be located.</p>
    <h2>Updates and corrections</h2>
    <p>Meaningful revisions receive a visible modified date. Dates are not changed merely to make content appear fresh. If a material claim becomes unsupported, it is corrected, qualified, or removed. Market-sensitive guides are reviewed on a recurring schedule.</p>
    <h2>Commercial independence</h2>
    <p>Articles may link to Monetizable because it is the product behind this publication. A product link does not convert a hypothesis into evidence. Sponsored relationships or affiliate compensation, if introduced, must be disclosed where the recommendation appears.</p>
    <h2>Quality gate</h2>
    <p>A publishable article needs a clear reader question, a direct answer, unique value, inspectable sources, descriptive headings, relevant internal links, and an honest limitations section. Pages that only repeat existing web content are held as drafts rather than published.</p>
  </InfoPage>;
}
