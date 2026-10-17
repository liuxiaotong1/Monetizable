'use client';
import {useEffect,useState} from 'react';
import {useBilling} from '@/components/account/billing-access';
import {readBrowserRecord} from '@/lib/quest/browser-store';
import {predictionResult} from '@/lib/quest/event-prediction';
import HeroOutcome from './hero-outcome';
import type {MarketEvent,EventKind} from '@/lib/quest/types';
import './boss-victory.css';
export function BossVictory({demo=false,onClose,result='win'}:{demo?:boolean;onClose?:()=>void;kind?:EventKind;result?:'win'|'loss'}){
 return <HeroOutcome result={result} demo={demo} onClose={onClose}/>;
}
export default function ConfirmedBossVictory({events}:{events:MarketEvent[]}){
 const {access}=useBilling(),[id,setId]=useState<string>();
 useEffect(()=>{const check=()=>{try{const wins=(readBrowserRecord().eventPredictions||[]).filter(p=>{const event=events.find(e=>e.id===p.eventId);return event&&predictionResult(p,event)?.matched!==undefined;});const next=wins.find(p=>!localStorage.getItem(`boss-victory:${p.eventId}:${p.savedAt}`));setId(next?`${next.eventId}:${next.savedAt}`:undefined);}catch{}};check();window.addEventListener('quest-progress',check);return()=>window.removeEventListener('quest-progress',check);},[events,access.signedIn]);
 if(!id)return null;
 const event=events.find(e=>id.startsWith(e.id+':'));const prediction=(readBrowserRecord().eventPredictions||[]).find(p=>event?.id===p.eventId);const result=event&&prediction&&predictionResult(prediction,event)?.matched===false?'loss':'win';
 return <BossVictory result={result} kind={events.find(e=>id.startsWith(e.id+":"))?.kind} onClose={()=>{try{localStorage.setItem(`boss-victory:${id}`,'seen');}catch{}setId(undefined);}}/>;
}
