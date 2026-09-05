import type { MetadataRoute } from "next";
import { BLOG_URL, EDITORIAL_AUTHOR_URL, getAllPosts, MAIN_SITE_URL, postUrl } from "@/lib/blog";
import { getAllGuides, guideUrl } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const guides = getAllGuides();
  const latest = posts[0]?.modifiedAt ?? new Date().toISOString();
  return [
    { url: MAIN_SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${MAIN_SITE_URL}/product`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${MAIN_SITE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${MAIN_SITE_URL}/for-companies`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${MAIN_SITE_URL}/methodology`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${MAIN_SITE_URL}/editorial-policy`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${MAIN_SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${MAIN_SITE_URL}/faq`, lastModified: latest, changeFrequency: "monthly", priority: 0.9 },
    { url: `${MAIN_SITE_URL}/tools/skill-evidence-worksheet`, changeFrequency: "monthly", priority: 0.9 },
    { url: BLOG_URL, lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    { url: `${MAIN_SITE_URL}/guides`, lastModified: latest, changeFrequency: "monthly", priority: 0.9 },
    { url: EDITORIAL_AUTHOR_URL, changeFrequency: "monthly", priority: 0.6 },
    ...guides.map((guide) => ({
      url: guideUrl(guide),
      lastModified: guide.modifiedAt,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...posts.map((post) => ({
      url: postUrl(post),
      lastModified: post.modifiedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [`${MAIN_SITE_URL}${post.heroImage}`],
    })),
  ];
}
