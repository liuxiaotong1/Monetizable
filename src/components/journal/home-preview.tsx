'use client';
import {useEffect,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import type {Journal} from '@/lib/journal/core';
import {journalCopy} from './copy';
import Performance from './performance';
import './journal.css';
export default function JournalHomePreview(){const locale=useLocale(),c=journalCopy[locale],[journal,setJournal]=useState<Journal|null>(null),[signedIn,setSignedIn]=useState(false);useEffect(()=>{let active=true;fetch('/api/journal',{cache:'no-store'}).then(r=>{if(active)setSignedIn(r.ok);return r.ok?r.json():null;}).then(j=>{if(active&&j?.trades?.length)setJournal(j);}).catch(()=>{});return()=>{active=false;};},[]);return <section className="trading-journal"><header className="journal-heading"><div><small>🎮 TRADING DNA</small><h2>{c.title}</h2><p>{c.intro}</p></div><a className="primary" href={signedIn?"/?view=today#trading-journal":"/auth"}>{c.equip} →</a></header>{journal?<Performance journal={journal} c={c}/>:<><div className="journal-home-map">{c.stages.map((s,i)=><article key={s}><span>{['🛡️','⚔️','📥','🏆'][i]}</span><small>0{i+1}</small><h3>{s}</h3><p>{[c.rulesTitle,c.trading,c.importTitle,c.followed][i]}</p></article>)}</div><p>{c.empty}</p><div className="journal-metrics">{[c.win,c.pnl,c.pf,c.discipline].map(v=><div key={v}><small>{v}</small><strong>—</strong></div>)}</div></>}</section>}
