'use client';
import {useSyncExternalStore} from 'react';
export type HeroId='supercharlie'|'female';
const key='monetizable-hero';
function read():HeroId{try{return localStorage.getItem(key)==='female'?'female':'supercharlie'}catch{return 'supercharlie'}}
function subscribe(fn:()=>void){addEventListener('monetizable-hero-change',fn);addEventListener('storage',fn);return()=>{removeEventListener('monetizable-hero-change',fn);removeEventListener('storage',fn)}}
export function chooseHero(hero:HeroId){localStorage.setItem(key,hero);dispatchEvent(new Event('monetizable-hero-change'))}
export function useHero(){return useSyncExternalStore(subscribe,read,():HeroId=>'supercharlie')}

function hasHero(){try{const value=localStorage.getItem(key);return value==='female'||value==='supercharlie'}catch{return false}}
export function useHasHero(){return useSyncExternalStore(subscribe,hasHero,()=>false)}

let tourActive=false;
export function setTourActive(active:boolean){if(tourActive!==active){tourActive=active;dispatchEvent(new Event('monetizable-tour-change'))}}
function subscribeTour(fn:()=>void){addEventListener('monetizable-tour-change',fn);return()=>removeEventListener('monetizable-tour-change',fn)}
export function useTourActive(){return useSyncExternalStore(subscribeTour,()=>tourActive,()=>false)}
