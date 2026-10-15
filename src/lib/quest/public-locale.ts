import 'server-only';
import {englishState} from './english-server';
import {frenchCopy} from '@/lib/i18n/translate';
import type {AppLocale} from '@/lib/i18n/locale';
import type {QuestState} from './types';
export function localizedPublicState(input:QuestState,locale:AppLocale){if(locale==='zh')return structuredClone(input);const state=englishState(input);if(locale==='fr')state.cards=state.cards.map(card=>{const result=frenchCopy(card);result.sources=result.sources.map(source=>({...source,title:/\p{Script=Han}/u.test(source.title)?new URL(source.url).hostname:source.title}));return result;});return state;}
