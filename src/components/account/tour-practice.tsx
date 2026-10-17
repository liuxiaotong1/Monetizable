'use client';
import {useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import {BossVictory} from '@/components/quest/boss-victory';
import DeckVictory from '@/components/quest/deck-victory';
import YelanBattle from '@/components/quest/yelan-battle';
import './tour-practice.css';
export default function TourPractice({step}:{step:number}){
 const locale=useLocale(),t=(en:string,zh:string,fr:string)=>({en,zh,fr}[locale]);
 const [pick,setPick]=useState<number|null>(null),[done,setDone]=useState(false),[reason,setReason]=useState('');
 return <div className="tour-practice"><small>{t('TRY HERE · practice only, nothing saved','在这里试一下 · 仅练习，不保存','ESSAYEZ ICI · démonstration, rien n’est enregistré')}</small>
 {done ? <>{step===0?<YelanBattle active date=""/>:step===1?<BossVictory demo/>:<DeckVictory demo/>}<button className="tour-retry" onClick={()=>{setPick(null);setDone(false);setReason('');}}>{t('Try again','再试一次','Réessayer')}</button></> : step===2 ? <>
 <p className="tour-instruction">☝ {pick===null?t('Tap an answer to flip the card.','点击一个答案，卡片翻面。','Touchez une réponse pour retourner la carte.'):t('Now tap a swipe button below.','再点下方按钮，试一次左右滑动。','Puis touchez une flèche ci-dessous.')}</p>
 <div className={`tour-mini-card ${pick!==null?'is-revealed':''}`}>
 {pick===null?<><strong>{t('What does diversification mean?','分散投资是什么意思？','Que signifie diversifier ?')}</strong>{[t('Spread exposure across different assets','分散到不同资产','Répartir entre plusieurs actifs'),t('Put everything in one stock','全部投入一只股票','Tout placer sur une seule action')].map((label,i)=><button key={i} onClick={()=>setPick(i)}>{label}</button>)}</>:<><strong>{pick===0?t('Correct!','答对了！','Bonne réponse !'):t('Let’s unpack it','一起看看原因','Voyons pourquoi')}</strong><p>{t('Different assets reduce dependence on one investment. Diversification does not remove every risk.','不同资产能减少对单一投资的依赖，但不能消除所有风险。','Plusieurs actifs réduisent la dépendance à un seul placement, sans supprimer tous les risques.')}</p><button onClick={()=>setPick(null)}>{t('↶ See question','↶ 回看题目','↶ Revoir la question')}</button></>}
 </div>
 {pick!==null&&<div className="tour-practice-options"><button onClick={()=>setDone(true)}>← {t('Review','下次复习','À revoir')}</button><button onClick={()=>setDone(true)}>{t('Understood','已学会','Compris')} →</button></div>}
 </>:<>
 <p className="tour-instruction">☝ {step===0?t('Tap a direction, then enter one reason.','点击方向，再写一句理由。','Touchez une direction, puis écrivez une raison.'):t('Example only: consensus is 3%. Tap your prediction.','示例：市场预期为 3%。点击你的预测。','Exemple fictif : consensus à 3 %. Touchez votre prévision.')}</p>
 <div className="tour-practice-options">{(step===0?[t('↗ Up','↗ 偏多','↗ Hausse'),t('↔ Sideways','↔ 震荡','↔ Range'),t('↘ Down','↘ 偏空','↘ Baisse')]:[t('↓ Below 3%','↓ 低于 3%','↓ Sous 3 %'),t('＝ 3%','＝ 3%','＝ 3 %'),t('↑ Above 3%','↑ 高于 3%','↑ Plus de 3 %')]).map((label,i)=><button key={i} aria-pressed={pick===i} onClick={()=>setPick(i)}>{label}</button>)}</div>
 {step===0&&<label>{t('One reason','一句理由','Une raison')}<input value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('Example: support held','例如：守住了支撑','Ex. : le support tient')}/></label>}
 <button className="primary" disabled={pick===null||(step===0&&!reason.trim())} onClick={()=>setDone(true)}>{t('Lock demo · preview a win','演示封存 · 预览胜利','Valider la démo · voir une victoire')}</button>
 <p className="tour-practice-note">{t('Here we simulate a correct result. In the app, victory requires verified market data.','这里模拟预测正确；真实任务必须等待行情或官方结果核实。','Ici, nous simulons une bonne prévision. Dans l’application, la victoire attend les données vérifiées.')}</p>
 </>}
 </div>;
}
