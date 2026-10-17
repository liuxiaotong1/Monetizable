'use client';
import {useLocale} from '@/components/i18n/locale-provider';
import {bossIdentities} from '@/lib/quest/boss-identity';
import type {EventKind} from '@/lib/quest/types';
import type {CSSProperties} from 'react';
import './boss-avatar.css';
export default function BossAvatar({kind='CPI',named=false}:{kind?:EventKind;named?:boolean}){
 const locale=useLocale(),boss=bossIdentities[kind];
 return <span className="boss-avatar-wrap"><span className="boss-avatar" role="img" aria-label={boss[locale]} style={{'--boss-tint':boss.color} as CSSProperties}>{boss.icon==='medusa'?<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#617651" strokeWidth="9" strokeLinecap="round"><path d="M29 54Q7 35 23 20T36 38M37 32Q32 7 47 15T49 34M57 35Q53 5 72 18T72 43M76 51Q96 33 85 24M23 62Q8 70 18 82M78 62Q94 70 82 83"/></g><path d="M27 38Q50 20 74 38L70 68Q50 94 31 68Z" fill="#c5cf8b" stroke="#384b36" strokeWidth="3"/><path d="M33 51L44 54M56 54L68 50" stroke="#384b36" strokeWidth="4"/><path d="M44 69Q51 73 57 68" fill="none" stroke="#384b36" strokeWidth="3"/><path d="M41 32L50 19L60 32" fill="#b58e42"/></svg>:<span aria-hidden="true">{boss.icon}</span>}<i aria-hidden="true">✦</i></span>{named&&<strong className="boss-avatar-name">{boss[locale]}</strong>}</span>;
}
