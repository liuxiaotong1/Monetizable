import type {AppLocale} from '@/lib/i18n/locale';
import {positioning} from '@/lib/marketing/positioning';
import './public-pages.css';
import './overview.css';

const content = {
  zh: {tag: '🎮 把交易纪律，变成每天愿意打开的冒险', lead: '从一个判断开始，把每一次复盘变成下一关的装备。', start: '开始我的第一关', links: ['Blog · 文章与产品资料', '查看套餐'], steps: [
    ['🧭', '每日冒险：先立下你的判断', '看看 QQQ 与经济日历，选择上涨、震荡或下跌。写下依据，在盘前封存；收盘核实后，再回来看看自己的判断。', '观察 → 预判 → 核实'],
    ['🐉', '事件 Boss：让重大消息有迹可循', '财报、通胀、就业数据，都可以成为你的挑战。比较市场预期与实际公布结果，判断核实命中后，解锁伙伴打败 Boss 的胜利画面。', '读懂预期，迎战变化'],
    ['🎴', '知识卡：给判断补一件装备', '用一道有趣的问题热身，再翻面理解背后的逻辑。不知道也可以直接看讲解；每天完成 5 张，把市场知识一点点装进背包。', '答一题，多懂一点'],
    ['🧬', 'Trading DNA：发现自己的交易习惯', '上传交易 CSV，查看胜率、盈亏与交易表现；结合每日预判和你选择记录的规则，复盘判断与执行，找到下一步值得练习的地方。', '记录 → 复盘 → 升级'],
  ]},
  en: {tag: '🎮 Turn trading discipline into a daily adventure', lead: 'Start with one call. Turn each review into equipment for your next quest.', start: 'Start my first quest', links: ['Blog & resources', 'Explore plans'], steps: [
    ['🧭', 'Daily quest: make your call', 'Check QQQ and the economic calendar. Choose up, sideways or down, add your reasoning and seal it before the open. Return after the verified close to review your judgment.', 'Observe → predict → verify'],
    ['🐉', 'Event Boss: face the next big release', 'Earnings, inflation and jobs data become challenges. Compare consensus with the actual release. A verified correct call unlocks your partner’s Boss victory scene.', 'Read expectations. Face the change.'],
    ['🎴', 'Knowledge cards: equip your judgment', 'Start with an interesting question, then flip for the reasoning. Choose “I don’t know” to go straight to the explanation. Complete five cards a day and build your market knowledge.', 'One question. One new insight.'],
    ['🧬', 'Trading DNA: discover your habits', 'Upload a trading CSV to explore win rate, P&L and trade performance. Review your daily calls and the rules you choose to record to find a useful focus for your next practice session.', 'Record → review → level up'],
  ]},
  fr: {tag: '🎮 La discipline de trading devient une aventure quotidienne', lead: 'Un premier avis, puis un bilan : chaque étape vous équipe pour la suivante.', start: 'Commencer ma première quête', links: ['Blog et ressources', 'Voir les offres'], steps: [
    ['🧭', 'Quête du jour : prenez position', 'Observez QQQ et le calendrier économique. Choisissez hausse, stabilité ou baisse, notez vos raisons et scellez votre avis avant l’ouverture. Revenez après la clôture vérifiée pour le comparer au résultat.', 'Observer → prévoir → vérifier'],
    ['🐉', 'Boss événementiel : relevez le défi', 'Résultats, inflation et emploi deviennent des défis. Comparez le consensus aux chiffres publiés. Une prévision juste et vérifiée débloque la victoire de votre partenaire contre le Boss.', 'Comprendre les attentes et le changement'],
    ['🎴', 'Cartes : équipez votre jugement', 'Une question pour éveiller votre curiosité, puis une explication au verso. « Je ne sais pas » ouvre directement la réponse. Cinq cartes par jour pour enrichir votre connaissance des marchés.', 'Une question, une nouvelle idée'],
    ['🧬', 'ADN de trading : repérez vos habitudes', 'Importez un CSV de transactions pour explorer taux de réussite, résultat et performances. Analysez vos prévisions quotidiennes et les règles que vous choisissez de consigner pour orienter votre prochain entraînement.', 'Noter → analyser → progresser'],
  ]},
};
const paths = ['blog', 'pricing'];

/** A real, visible server-rendered section, independent of account/client bootstrap. */
export default function PublicOverview({locale}: {locale: AppLocale}) {
  const c = positioning[locale], copy = content[locale];
  return <section className="public-overview quest-overview" aria-labelledby="product-definition">
    <small className="overview-tag">{copy.tag}</small>
    <h2 id="product-definition">{c.about}</h2>
    <p className="overview-lead">{copy.lead}</p>
    <p className="overview-definition">{c.description}</p>
    <div className="overview-quests">{copy.steps.map(([icon, title, description, reward], i) => <article key={title}>
      <header><span className="overview-icon" aria-hidden="true">{icon}</span><small>0{i + 1}</small><h3>{title}</h3></header>
      <p>{description}</p><strong className="overview-reward">✦ {reward}</strong>
    </article>)}</div>
    <nav aria-label={locale === 'zh' ? '产品与交易练习指南' : locale === 'fr' ? 'Produit et guides pratiques' : 'Product and trading practice guides'}>
      <a className="overview-start" href="#first-prediction">{copy.start} →</a>
      {paths.map((path, i) => <a key={path} href={`/${path}`}>{copy.links[i]} →</a>)}
    </nav>
  </section>;
}
