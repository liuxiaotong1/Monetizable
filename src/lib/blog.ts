import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

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

function readPost(fileName: string): BlogPost {
  return JSON.parse(readFileSync(path.join(postsDirectory, fileName), "utf8")) as BlogPost;
}

export const getAllPosts = cache(() =>
  (existsSync(postsDirectory) ? readdirSync(postsDirectory) : [])
    .filter((fileName) => fileName.endsWith(".json"))
    .map(readPost)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
);

export const getPost = cache((slug: string) => getAllPosts().find((post) => post.slug === slug));

export function postUrl(post: Pick<BlogPost, "slug">) {
  return `${MAIN_SITE_URL}/post/${post.slug}`;
}

export function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}
