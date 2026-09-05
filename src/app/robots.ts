import type { MetadataRoute } from "next";
import { MAIN_SITE_URL } from "@/lib/blog";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/api/", "/preview/", "/success/"];
  return {
    rules: [
      {
        userAgent: ["Googlebot", "bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User", "Applebot"],
        allow: "/",
        disallow: privatePaths,
      },
      { userAgent: "*", allow: "/", disallow: privatePaths },
    ],
    sitemap: `${MAIN_SITE_URL}/sitemap.xml`,
    host: MAIN_SITE_URL,
  };
}
