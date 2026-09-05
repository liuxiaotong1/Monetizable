import type { ReactNode } from "react";
import { BlogFooter, BlogHeader } from "@/components/blog-shell";

export function InfoPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <BlogHeader />
      <article className="shell py-14 md:py-20">
        <header className="mx-auto max-w-3xl">
          <div className="eyebrow text-[var(--gold-deep)]">{eyebrow}</div>
          <h1 className="editorial-title mt-4 text-4xl leading-tight md:text-6xl">{title}</h1>
          <p className="mt-6 text-lg leading-8 text-black/65">{description}</p>
        </header>
        <div className="blog-prose mx-auto mt-12 max-w-3xl">{children}</div>
      </article>
      <BlogFooter />
    </main>
  );
}
