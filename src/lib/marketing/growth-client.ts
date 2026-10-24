'use client';
let queue:Promise<unknown>=Promise.resolve();
export function internalBrowser(){
  try{return new URLSearchParams(location.search).get('internal')==='1'||document.cookie.split(';').some(c=>c.trim()==='quest-analytics-internal=1')||localStorage.getItem('monetizable-analytics-opt-out')==='1';}catch{return true;}
}
export function sendGrowth(event='visit',internal=false){
  if(typeof window==='undefined')return Promise.resolve();
  try{if(!internal&&!internalBrowser()&&localStorage.getItem('monetizable-analytics-consent')!=='granted')return Promise.resolve();}catch{return Promise.resolve();}
  let referrerHost='';try{referrerHost=new URL(document.referrer).hostname;}catch{}
  const input={event,path:location.pathname,referrerHost,utmSource:new URLSearchParams(location.search).get('utm_source'),internal:internal||internalBrowser(),consent:'granted'};
  // Preserve ordering so the first capture sets the HTTP-only identity before a click is logged.
  queue=queue.catch(()=>{}).then(()=>fetch('/api/growth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),credentials:'same-origin',keepalive:true,signal:AbortSignal.timeout(1500)}).catch(()=>{}));
  return queue;
}
