'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import {advanceDeckBatch,type DeckBatch} from '@/lib/quest/deck-completion';
import './deck-victory.css';
export function useDeckCompletion(){
 const batch=useRef<DeckBatch>({seen:[],batch:[]}),[completed,setCompleted]=useState(0);
 function finish(cardId:string,remainingIds:string[]){const result=advanceDeckBatch(batch.current,cardId,remainingIds);batch.current=result.state;if(result.completed)setCompleted(result.completed);}
 return {completed,finish,close:()=>setCompleted(0)};
}
const copy={en:{title:'Deck complete. Quest accomplished!',body:'You turned questions into understanding. Cards marked for review will return next visit.',count:'cards explored',demo:'Tutorial preview · no learning record saved',next:'Continue my adventure'},fr:{title:'Paquet terminé. Quête accomplie !',body:'Vous avez transformé des questions en compréhension. Les cartes à revoir reviendront à votre prochaine visite.',count:'cartes explorées',demo:'Démonstration · aucun progrès enregistré',next:'Continuer mon aventure'},zh:{title:'卡组通关，学习任务完成！',body:'又把几个问号变成了理解。标记还不熟的卡片，下次回来再巩固一次。',count:'张卡片已学习',demo:'引导演示 · 不写入学习记录',next:'继续我的冒险'}};
export default function DeckVictory({count=5,demo=false,onContinue}:{count?:number;demo?:boolean;onContinue?:()=>void}){
 const c=copy[useLocale()],ref=useRef<HTMLElement>(null);
 useEffect(()=>{if(!demo){ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}},[demo]);
 return <section ref={ref} tabIndex={-1} className={`deck-victory ${demo?'is-demo':''}`} aria-label={c.title}><div className="deck-victory-sparks" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--angle':`${i*15}deg`,'--delay':`${i%4*80}ms`} as CSSProperties}/>)}</div><div className="deck-victory-loot" aria-hidden="true"><span>✦</span><span>🎴</span><span>🏆</span></div><h3>{c.title}</h3><strong>{count} {c.count}</strong><p>{c.body}</p>{demo?<small>{c.demo}</small>:<button type="button" className="primary" onClick={onContinue}>{c.next} →</button>}</section>;
}
