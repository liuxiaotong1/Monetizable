"use client";
import {useCallback,useEffect,useState} from 'react';
import {Sparkles,RefreshCw,Target,Lightbulb} from 'lucide-react';
import {useLocale} from '@/components/i18n/locale-provider';
import type {Review} from '@/lib/quest/types';
import styles from './ai-prediction-review.module.css';
type Report={reflection:string;evidence:string;practice:string;generatedAt:string;verified:{returnPct:number;actualDirection:string;matched:boolean;close:number;previousClose:number}};
const copy={
 zh:{title:'今日 AI 判断复盘',sub:'基于封存判断与已核实的 QQQ 收盘数据',loading:'正在整理今天的判断与证据…',retry:'重新生成复盘',reflection:'判断回看',evidence:'收盘证据',practice:'下一交易日练习',error:'暂时无法生成复盘，稍后可再试。',login:'登录后即可查看个人判断复盘。',pending:'完整收盘数据核实后，这里会生成今日复盘。',matched:'方向命中',missed:'方向未命中',disclaimer:'复盘帮助整理记录与证据，不代表交易建议。'},
 en:{title:'Today’s AI decision debrief',sub:'Built from your sealed call and the verified QQQ close',loading:'Reviewing today’s call and evidence…',retry:'Try the review again',reflection:'Decision reflection',evidence:'Closing evidence',practice:'Next-session practice',error:'The review could not be generated right now. Try again shortly.',login:'Sign in to view your personal decision review.',pending:'Today’s review will appear when the complete closing data is verified.',matched:'Direction matched',missed:'Direction differed',disclaimer:'This review organizes your record and evidence; it is not trading advice.'},
 fr:{title:'Bilan IA de la décision du jour',sub:'À partir de votre prévision scellée et de la clôture QQQ vérifiée',loading:'Analyse de votre décision et des éléments…',retry:'Réessayer le bilan',reflection:'Retour sur la décision',evidence:'Éléments de clôture',practice:'Exercice pour la prochaine séance',error:'Le bilan ne peut pas être généré maintenant. Réessayez bientôt.',login:'Connectez-vous pour voir votre bilan personnel.',pending:'Le bilan du jour apparaîtra après vérification des données complètes de clôture.',matched:'Direction concordante',missed:'Direction différente',disclaimer:'Ce bilan organise vos notes et les faits ; il ne constitue pas un conseil de trading.'}
};
export default function AIPredictionReview({review,threshold,forecastCreatedAt}:{review:Review;threshold:number;forecastCreatedAt?:string}){
 const locale=useLocale(),c=copy[locale],eligible=!!review.judgmentSnapshot?.eligible;
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const generate=useCallback(async()=>{
  if(!review.judgmentSnapshot||!eligible)return;setLoading(true);setError('');
  try{const response=await fetch('/api/prediction-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale,date:review.date,direction:review.judgmentSnapshot.direction,confidence:review.judgmentSnapshot.confidence,reason:review.judgmentSnapshot.reason,lockedAt:review.judgmentSnapshot.lockedAt,threshold,forecastCreatedAt})});
   const data=await response.json();if(!response.ok){if(data.error==='PENDING'){setError(c.pending);return;}if(data.error==='AUTH'){setError(c.login);return;}throw Error(data.error||'AI_UNAVAILABLE');}setReport(data as Report);
  }catch{setError(c.error);}finally{setLoading(false);}
 },[review,eligible,locale,threshold,forecastCreatedAt,c]);
 useEffect(()=>{if(eligible)void generate();},[eligible,generate]);
 if(!eligible)return null;
 return <section className={styles.panel} aria-live="polite" aria-busy={loading}>
  <header className={styles.header}><span className={styles.icon}><Sparkles size={19}/></span><div><span className={styles.eyebrow}>DAILY REVIEW</span><h2>{c.title}</h2><p>{c.sub}</p></div></header>
  {!report?<div className={styles.state}>{loading?<><span className={styles.spinner}/><p>{c.loading}</p></>:<><p>{error||c.error}</p>{error!==c.login&&<button type="button" className={styles.retry} onClick={()=>void generate()} disabled={loading}><RefreshCw size={15}/>{c.retry}</button>}</>}</div>:<>
  <div className={styles.verdict}><strong>{report.verified.matched?c.matched:c.missed}</strong><span>{report.verified.returnPct>0?'+':''}{report.verified.returnPct.toFixed(2)}% · {'
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
+report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
+report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
+report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
 + report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
+report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
+report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
+report.verified.close.toFixed(2)} close</span></div>
  <div className={styles.sections}><article><h3><Sparkles size={15}/>{c.reflection}</h3><p>{report.reflection}</p></article><article><h3><Target size={15}/>{c.evidence}</h3><p>{report.evidence}</p></article><article><h3><Lightbulb size={15}/>{c.practice}</h3><p>{report.practice}</p></article></div>
  <small className={styles.disclaimer}>{c.disclaimer}</small></>}
 </section>;
}
