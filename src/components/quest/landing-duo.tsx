'use client';
import {useLocale} from '@/components/i18n/locale-provider';
import InViewReveal from './in-view-reveal';
import './landing-duo.css';

const copy={
 en:{title:'Meet your quest companions',astra:'Astra',charlie:'Charlie',example:'Example · demo data',accuracy:'Monthly accuracy',sample:'3 / 5 verified calls',boss:'Market Boss',battle:'Predict · battle',streak:'Learning streak',days:'days',},
 fr:{title:'Vos partenaires de quête',astra:'Astra',charlie:'Charlie',example:'Exemple · données fictives',accuracy:'Précision du mois',sample:'3 / 5 prévisions',boss:'Boss du marché',battle:'Prévoir · combattre',streak:'Série quotidienne',days:'jours',},
 zh:{title:'你的冒险双搭档',astra:'星澜',charlie:'查理',example:'示例 · 演示数据',accuracy:'月度命中率',sample:'3 / 5 次已核实',boss:'市场 Boss',battle:'预判 · 战斗',streak:'连续打卡',days:'天',}
};
export default function LandingDuo(){
 const locale=useLocale(),c=copy[locale];
 return <section className="landing-duo" aria-label={c.title} translate="no">
  <div className="duo-backdrop" aria-hidden="true"><span/><span/></div>
  <div className="duo-models">
   <div className="duo-posters"><img src="/heroes/astra-portrait.webp" alt={c.astra} width={640} height={960} fetchPriority="high" decoding="async"/><img src="/heroes/supercharlie-portrait.webp" alt={c.charlie} width={640} height={960} fetchPriority="high" decoding="async"/></div>
  </div>
  <div className="duo-proof" aria-label={c.example}>
   <InViewReveal index={0} className="duo-orbit duo-orbit-score"><a className="duo-circle duo-score" href="#first-prediction"><span className="duo-circle-inner"><strong>60<small>%</small></strong><span>{c.accuracy}</span><small>{c.sample}</small></span></a></InViewReveal>
   <InViewReveal index={1} className="duo-orbit duo-orbit-boss"><a className="duo-circle duo-boss" href="#landing-event-demo"><span className="duo-circle-inner"><img src="/homepage/battle-action.png" alt="" width={570} height={340} loading="lazy"/><strong>{c.boss}</strong><small>{c.battle}</small></span></a></InViewReveal>
   <InViewReveal index={2} className="duo-orbit duo-orbit-streak"><a className="duo-circle duo-streak" href="#landing-knowledge-demo"><span className="duo-circle-inner"><strong>3<small> {c.days}</small></strong><span>{c.streak}</span><small aria-hidden="true">✦ ✦ ✦</small></span></a></InViewReveal>
  </div>
  <div className="duo-names" aria-hidden="true"><span>✦ {c.astra}</span><span>✦ {c.charlie}</span></div>
  <div className="duo-caption"><span>{c.example}</span></div>
 </section>;
}
