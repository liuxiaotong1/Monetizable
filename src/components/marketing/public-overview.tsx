import type {AppLocale} from '@/lib/i18n/locale';
import {positioning} from '@/lib/marketing/positioning';
import './public-pages.css';

const links = {
  en: ['Blog & resources', 'Pricing'],
  fr: ['Blog et ressources', 'Tarifs'],
  zh: ['Blog · 文章与产品资料', '价格'],
};
const paths = ['blog', 'pricing'];

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
