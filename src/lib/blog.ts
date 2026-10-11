import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Locale } from "@/lib/i18n";

export type BlogPost = {
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  canonical: string;
  publishedAt: string;
  modifiedAt: string;
  author: string;
  wordCount: number;
  heroImage: string;
  heroAlt?: string;
  sourceHeroImage: string;
  contentHtml: string;
  seoKeywords?: string[];
  sources: Array<{ title: string; publisher: string; url: string }>;
  importedAt: string;
  source: string;
};

// Canonical search URLs must never follow a Preview or local runtime origin.
// Runtime callbacks and navigation may use environment variables elsewhere.
export const MAIN_SITE_URL = "https://getmonetizable.com";
export const LEGACY_BLOG_ORIGIN = "https://blog.getmonetizable.com";
export const BLOG_URL = `${MAIN_SITE_URL}/blog`;
export const BLOG_FEED_URL = `${MAIN_SITE_URL}/feed.xml`;
export const EDITORIAL_AUTHOR_NAME = "Monetizable Research Team";
export const EDITORIAL_AUTHOR_URL = `${MAIN_SITE_URL}/authors/monetizable-research-team`;

const postsDirectory = path.join(process.cwd(), "content", "posts");

function readPost(fileName: string, locale: Locale = "en"): BlogPost {
  const directory = locale === "fr" ? path.join(process.cwd(), "content", "posts-fr") : postsDirectory;
  return JSON.parse(readFileSync(path.join(directory, fileName), "utf8")) as BlogPost;
}

export const getAllPosts = cache((locale: Locale = "en") =>
  (existsSync(postsDirectory) ? readdirSync(postsDirectory) : [])
    .filter((fileName) => fileName.endsWith(".json"))
    .map(file => readPost(file, locale))
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
);

export const getPost = cache((slug: string, locale: Locale = "en") => getAllPosts(locale).find((post) => post.slug === slug));

export function postUrl(post: Pick<BlogPost, "slug">) {
  return `${MAIN_SITE_URL}/post/${post.slug}`;
}

export function formatPostDate(value: string, locale: Locale = "en") {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}
