import type {AppLocale} from '@/lib/i18n/locale';
import {positioning} from '@/lib/marketing/positioning';
import './public-pages.css';

const links = {
  en: ['Trading discipline', 'Follow your plan', 'Plan checklist', 'How it works', 'Methodology', 'FAQ', 'About', 'Pricing'],
  fr: ['Discipline de trading', 'Suivre son plan', 'Checklist du plan', 'Fonctionnement', 'Méthode', 'FAQ', 'À propos', 'Tarifs'],
  zh: ['交易纪律', '坚持交易计划', '交易计划清单', '产品介绍', '方法说明', '常见问题', '关于我们', '价格'],
};
const paths = ['trading-discipline-app', 'follow-your-trading-plan', 'trading-plan-checklist', 'product', 'methodology', 'faq', 'about', 'pricing'];

/** A real, visible server-rendered section, independent of account/client bootstrap. */
export default function PublicOverview({locale}: {locale: AppLocale}) {
  const c = positioning[locale];
  return <section className="public-overview" aria-labelledby="product-definition">
    <small>MONETIZABLE · TRADING PRACTICE & DISCIPLINE</small>
    <h2 id="product-definition">{c.about}</h2>
    <p>{c.description}</p>
    <nav aria-label={locale === 'zh' ? '产品与交易练习指南' : locale === 'fr' ? 'Produit et guides pratiques' : 'Product and trading practice guides'}>
      {paths.map((path, i) => <a key={path} href={`/${path}`}>{links[locale][i]} →</a>)}
    </nav>
  </section>;
}
