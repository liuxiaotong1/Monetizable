'use client';
import dynamic from 'next/dynamic';
import {useLocale} from '@/components/i18n/locale-provider';
const QuestApp=dynamic(()=>import('./quest-app'),{ssr:false});
const EnglishQuest=dynamic(()=>import('./english-quest'),{ssr:false});
export default function WorkspaceEntry({signedIn}:{signedIn:boolean}){const locale=useLocale();return locale==='zh'?<QuestApp/>:<EnglishQuest signedIn={signedIn}/>;}
