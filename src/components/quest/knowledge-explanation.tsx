import {LocalizeTree,useLocale} from '@/components/i18n/locale-provider';
import type {LearningCard} from '@/lib/quest/types';
import {detailedLesson,cardTerms,termLabel} from '@/lib/quest/learning-depth';
import './knowledge-explanation.css';
export default function KnowledgeExplanation({card,locale='en'}:{card:LearningCard;locale?:'en'|'zh'}){
  const activeLocale=useLocale();
  const zh=locale==='zh',lesson=detailedLesson(card),copy=lesson?.[locale],terms=cardTerms(card);
  if(!copy&&!terms.length)return null;
  return <LocalizeTree>{<section className="knowledge-depth" aria-label={zh?'零基础知识拆解':'Concept walkthrough'}>
    {copy&&<><h3>📖 {zh?'先补背景，再理解答案':'The background behind the answer'}</h3><p className="knowledge-depth-intro">{copy.intro}</p><ol className="knowledge-steps">{copy.steps.map((step,i)=><li key={i}><h4>{step.title}</h4><p>{step.text}</p></li>)}</ol><div className="knowledge-worked"><h4>🧩 {zh?'一步步算 / 想一遍':'Work through an example'}</h4><p>{copy.example}</p>{lesson?.payoff&&<div className="knowledge-payoff"><table><caption>{zh?'假设 100 / 95 Put 价差 · 一组乘数 100 · 到期、未计费用':'Hypothetical 100 / 95 put spread · 100 multiplier · expiration, before fees'}</caption><thead><tr><th scope="col">{zh?'到期股价':'Stock price'}</th><th scope="col">{zh?'组合价值':'Spread value'}</th><th scope="col">{zh?'扣成本后盈亏':'Net P/L'}</th></tr></thead><tbody>{lesson.payoff.map(row=><tr key={row.price}><th scope="row">${row.price}</th><td>${row.long+row.short}</td><td className={row.net<0?'loss':row.net>0?'gain':''}>{row.net>0?'+':row.net<0?'−':''}${Math.abs(row.net)}</td></tr>)}</tbody></table></div>}</div><div className="knowledge-pitfall"><h4>🔎 {zh?'最容易误解的地方':'The common trap'}</h4><p>{copy.pitfall}</p></div><div className="knowledge-depth-sources">{lesson.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div></>}
    {!!terms.length&&<details className="knowledge-glossary"><summary>🔤 {zh?`术语不认识？逐个解释（${terms.length}）`:`Unfamiliar terms? Plain-language definitions (${terms.length})`}</summary><dl>{terms.map(term=><div key={term.name}><dt>{termLabel(term.name,activeLocale)}</dt><dd>{zh?term.zh:term.en}</dd></div>)}</dl></details>}
  </section>}</LocalizeTree>;
}
