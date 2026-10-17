'use client';
import {useSyncExternalStore} from 'react';
export type HeroId='supercharlie'|'female';
const key='monetizable-hero';
function read():HeroId{try{return localStorage.getItem(key)==='female'?'female':'supercharlie'}catch{return 'supercharlie'}}
function subscribe(fn:()=>void){addEventListener('monetizable-hero-change',fn);addEventListener('storage',fn);return()=>{removeEventListener('monetizable-hero-change',fn);removeEventListener('storage',fn)}}
export function chooseHero(hero:HeroId){localStorage.setItem(key,hero);dispatchEvent(new Event('monetizable-hero-change'))}
export function useHero(){return useSyncExternalStore(subscribe,read,():HeroId=>'supercharlie')}
