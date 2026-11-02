'use client';
import {useEffect} from 'react';
import type {Session} from '@/lib/quest/types';
/** Wake at the actual exchange close, including early sessions and DST. */
export function useCloseRefresh(session:Session|undefined,refresh:()=>Promise<void>){
 const date=session?.date,closeAt=session?.closeAt,trading=session?.isTradingDay;
 useEffect(()=>{
  if(!trading||!closeAt)return;
  let active=true,running=false,timer=0;
  const close=Date.parse(closeAt),end=close+30*60_000;
  const check=async()=>{if(!active||document.hidden||running||Date.now()<close||Date.now()>end)return;running=true;try{await refresh();}finally{running=false;}};
  const start=()=>{void check();timer=window.setInterval(()=>void check(),15000);};
  const boundary=window.setTimeout(start,Math.max(0,close-Date.now()));
  document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);
  return()=>{active=false;clearTimeout(boundary);clearInterval(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check);};
 },[date,closeAt,trading,refresh]);
}
