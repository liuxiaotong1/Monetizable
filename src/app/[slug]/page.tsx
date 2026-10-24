import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {answerPages, findAnswerPage, CONTENT_UPDATED} from '@/lib/marketing/pages';
import {SITE_URL} from '@/lib/marketing/positioning';
import '@/components/marketing/public-pages.css';

type Props = {params: Promise<{slug: string}>};
export function generateStaticParams() { return answerPages.map(({slug}) => ({slug})); }
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const page = findAnswerPage((await params).slug);
  if (!page) notFound();
  const title = `${page.title} | Monetizable`, url = `${SITE_URL}/${page.slug}`;
  return {title, description: page.description, alternates: {canonical: url}, robots: {index: true, follow: true}, openGraph: {title, description: page.description, url, siteName: 'Monetizable', locale: 'en_US', type: 'website', images: ['/brand/social-preview.png']}, twitter: {card: 'summary_large_image', title, description: page.description, images: ['/brand/social-preview.png']}};
}
export default async function AnswerPage({params}: Props) {
  const page = findAnswerPage((await params).slug);
  if (!page) notFound();
  const url = `${SITE_URL}/${page.slug}`;
  const schema = {'@context': 'https://schema.org', '@graph': [
    {'@type': page.kind === 'guide' ? 'Article' : 'WebPage', '@id': `${url}#page`, url, headline: page.title, name: page.title, description: page.description, inLanguage: 'en', datePublished: CONTENT_UPDATED, dateModified: CONTENT_UPDATED, author: {'@type': 'Organization', name: 'Monetizable', url: `${SITE_URL}/about`}, publisher: {'@id': `${SITE_URL}/#organization`}, about: {'@id': `${SITE_URL}/#application`}},
    {'@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Monetizable', item: SITE_URL}, {'@type': 'ListItem', position: 2, name: page.title, item: url}]},
  ]};
  return <main className="answer-page" lang="en">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema).replace(/</g, '\\u003c')}}/>
    <nav className="answer-nav" aria-label="Main navigation"><a href="/">Monetizable</a><a href="/product">Product</a><a href="/trading-discipline-app">Trading discipline</a><a href="/faq">FAQ</a><a href="/pricing">Pricing</a></nav>
    <article>
      <small>MONETIZABLE · {page.kind === 'guide' ? 'PRACTICE GUIDE' : 'PRODUCT & METHOD'}</small>
      <h1>{page.title}</h1>
      <small>By <a href="/about">Monetizable</a> · Updated <time dateTime={CONTENT_UPDATED}>24 October 2026</time> · Based on the current product workflow</small>
      <p className="answer-summary">{page.answer}</p>
      {page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.steps && <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol>}</section>)}
      <a className="answer-cta" href={`/?welcome=1&entry=${page.slug}#first-prediction`}>{page.cta} →</a>
    </article>
    <footer><h2>Continue practising</h2><nav className="answer-related" aria-label="Related guides">{page.related.map(slug => {const related = findAnswerPage(slug); return related ? <a key={slug} href={`/${slug}`}>{related.title}</a> : null;})}</nav><p className="answer-note">Learning and reflection, not investment advice. Trading involves risk. Your records and practice outcomes should be interpreted in context.</p><a href="/privacy">Privacy</a></footer>
  </main>;
}
