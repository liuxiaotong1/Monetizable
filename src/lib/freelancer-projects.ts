import type { MarketSearchProvider, RawResult } from "@/lib/search";
import { isRemoteOnlyOpportunity } from "@/lib/remote-only";

type Project = {
  id?: number; title?: string; seo_url?: string; description?: string;
  status?: string; frontend_project_status?: string; local?: boolean;
  deleted?: boolean; nonpublic?: boolean; hireme?: boolean;
  time_submitted?: number; submitdate?: number; type?: string;
  budget?: { minimum?: number; maximum?: number }; currency?: { code?: string };
};

// Public active-project search documented by Freelancer's official SDK:
// github.com/freelancer/freelancer-sdk-python (search_projects).
// Read-only: applicants follow the canonical project link and submit themselves.
export function freelancerProjectResult(project: Project): RawResult | null {
  if (!project.id || !project.title || !project.description || !project.seo_url) return null;
  if (project.status !== "active" || project.frontend_project_status !== "open" || project.local !== false || project.deleted || project.nonpublic || project.hireme) return null;
  if (!/^[a-zA-Z0-9_/-]+$/.test(project.seo_url)) return null;
  const posted = (project.time_submitted ?? project.submitdate ?? 0) * 1000;
  if (!posted || posted > Date.now() + 86400_000 || Date.now() - posted > 45 * 86400_000) return null;
  // Some clients incorrectly mark fieldwork as non-local. Text wins over metadata.
  if (/field[- ](?:work|research)|physically based|visit (?:local |the )?(?:markets|stores|factories)|on[- ](?:site|ground)|in[- ]person/i.test(project.description)) return null;
  const budget = project.budget?.minimum != null && project.budget?.maximum != null
    ? `${project.currency?.code ?? ""} ${project.budget.minimum}–${project.budget.maximum} ${project.type === "hourly" ? "per hour" : "per project"}` : "";
  const result: RawResult = {
    title: project.title, url: `https://www.freelancer.com/projects/${project.seo_url}`,
    source: "Freelancer", publishedDate: new Date(posted).toISOString(),
    employmentType: "freelance", description: project.description,
    content: `Remote freelance project · ${budget} · ${project.description}`,
  };
  return isRemoteOnlyOpportunity(result) ? result : null;
}

export class FreelancerProjectsProvider implements MarketSearchProvider {
  async search(query: string): Promise<RawResult[]> {
    // Keep the outcome phrase: reducing all language themes to one language
    // silently returned the same first 200 projects for every buyer problem.
    const cleaned = query.replace(/\([^)]*\)/g, " ").replace(/\b(?:remote|worldwide|freelance|contract|consultant|needed|vendor|buyer|project|OR|AND)\b/gi, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    const rows = new Map<string, RawResult>();
    const language = cleaned.match(/\b(?:Mandarin|Chinese|French|Spanish|German|English|Italian|Portuguese|Japanese|Korean|Arabic|Cantonese|Dutch|Thai)\b/i)?.[0];
    // Keep a separate language retrieval lane as well: OR-search relevance
    // can otherwise bury the rarer language behind generic marketing results.
    for (const searchTerm of [...new Set([cleaned,...(language ? [language] : [])])]) {
    for (let page = 0; page < 2; page++) {
      const params = new URLSearchParams({ query: searchTerm, limit: "100", offset: String(page * 100), full_description: "true" });
      const response = await fetch(`https://www.freelancer.com/api/projects/0.1/projects/active/?${params}`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) { if (page) break; throw new Error(`Freelancer search failed (${response.status})`); }
      const data = await response.json();
      if (data.status !== "success" || !Array.isArray(data.result?.projects)) throw new Error("Invalid Freelancer search response");
      const projects: Project[] = data.result.projects;
      const before = rows.size;
      for (const project of projects) { const row = freelancerProjectResult(project); if (row) rows.set(row.url, row); }
      if (projects.length < 100 || (page > 0 && rows.size === before)) break;
    }
    }
    return [...rows.values()];
  }
}
