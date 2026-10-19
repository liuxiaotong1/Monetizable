"use client";
import {useCallback,useEffect,useRef,useState,type PointerEvent} from 'react';
type Action='master'|'review';
type Origin={x:number;y:number;id:number;axis?:'horizontal'|'vertical';lastX:number;lastAt:number;velocity:number};
/** Follow the pointer at frame rate, then finish the exit before changing the queue. */
export function useCardSwipe(enabled:boolean,classify:(action:Action)=>Promise<boolean|void>|boolean|void,identity?:string){
  const [element,setElement]=useState<HTMLElement|null>(null),[pending,setPending]=useState(false);
  const origin=useRef<Origin|null>(null),nodeRef=useRef<HTMLElement|null>(null),locked=useRef(false);
  const enabledRef=useRef(enabled),classifyRef=useRef(classify),raf=useRef<number|undefined>(undefined),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  enabledRef.current=enabled;classifyRef.current=classify;nodeRef.current=element;
  const paint=useCallback((x:number)=>{
    const node=nodeRef.current;if(!node)return;
    node.style.setProperty('--card-drag',`${x}px`);node.style.setProperty('--card-tilt',`${Math.max(-18,Math.min(18,x/28))}deg`);
    if(Math.abs(x)>28)node.dataset.swipeDirection=x>0?'master':'review';else delete node.dataset.swipeDirection;
  },[]);
  const clear=useCallback(()=>{origin.current=null;if(raf.current!==undefined)cancelAnimationFrame(raf.current);const node=nodeRef.current;if(node){node.dataset.swipePhase='idle';delete node.dataset.swipeDirection;paint(0);}},[paint]);
  useEffect(()=>{locked.current=false;setPending(false);clear();return()=>{if(raf.current!==undefined)cancelAnimationFrame(raf.current);if(timer.current)clearTimeout(timer.current);};},[identity,clear]);
  const swipe=useCallback((action:Action)=>{
    if(!enabledRef.current||locked.current||!nodeRef.current)return;
    locked.current=true;setPending(true);origin.current=null;
    if(raf.current!==undefined)cancelAnimationFrame(raf.current);
    const commit=classifyRef.current,node=nodeRef.current,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.dataset.swipePhase='exiting';node.dataset.swipeDirection=action;
    // Commit the current drag frame before animating off screen.
    void node.offsetWidth;
    paint((action==='master'?1:-1)*(window.innerWidth+node.getBoundingClientRect().width));
    timer.current=setTimeout(async()=>{
      node.dataset.swipePhase='saving';
      try{await commit(action);}catch{/* The existing command UI reports save failures; restore this card. */}finally{
        if(nodeRef.current===node){locked.current=false;setPending(false);clear();}
      }
    },reduced?0:380);
  },[clear,paint]);
  const begin=useCallback((x:number,y:number,id:number)=>{
    if(!enabledRef.current||locked.current)return false;
    origin.current={x,y,id,lastX:x,lastAt:performance.now(),velocity:0};return true;
  },[]);
  const move=useCallback((x:number,y:number)=>{
    const p=origin.current;if(!p||locked.current||!enabledRef.current)return false;
    const dx=x-p.x,dy=y-p.y;
    if(!p.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=10)p.axis=Math.abs(dx)>Math.abs(dy)*1.15?'horizontal':'vertical';
    if(p.axis!=='horizontal')return false;
    const now=performance.now();p.velocity=(x-p.lastX)/Math.max(1,now-p.lastAt);p.lastX=x;p.lastAt=now;
    if(raf.current!==undefined)cancelAnimationFrame(raf.current);
    raf.current=requestAnimationFrame(()=>{if(nodeRef.current)nodeRef.current.dataset.swipePhase='dragging';paint(dx);});return true;
  },[paint]);
  const finish=useCallback((x:number,y:number)=>{
    const p=origin.current;if(!p||locked.current)return;
    const dx=x-p.x,dy=y-p.y,threshold=Math.min(160,Math.max(90,(nodeRef.current?.clientWidth||400)*.23));
    const flick=performance.now()-p.lastAt<100&&Math.abs(p.velocity)>.65&&Math.abs(dx)>65;
    if(p.axis==='horizontal'&&Math.abs(dx)>Math.abs(dy)&&(Math.abs(dx)>=threshold||flick))swipe(dx>0?'master':'review');else clear();
  },[swipe,clear]);
  useEffect(()=>{
    if(!element)return;
    const interactive=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('button,a,input,select,textarea,summary');
    const start=(event:TouchEvent)=>{if(event.touches.length!==1||interactive(event.target)){if(!locked.current)clear();return;}const t=event.touches[0];begin(t.clientX,t.clientY,t.identifier);};
    const drag=(event:TouchEvent)=>{if(event.touches.length!==1){if(!locked.current)clear();return;}const t=Array.from(event.touches).find(t=>t.identifier===origin.current?.id);if(t&&move(t.clientX,t.clientY)&&event.cancelable)event.preventDefault();};
    const end=(event:TouchEvent)=>{const t=Array.from(event.changedTouches).find(t=>t.identifier===origin.current?.id);if(t)finish(t.clientX,t.clientY);};
    const cancel=()=>{if(!locked.current)clear();};
    element.addEventListener('touchstart',start,{passive:true});element.addEventListener('touchmove',drag,{passive:false});element.addEventListener('touchend',end);element.addEventListener('touchcancel',cancel);
    return()=>{element.removeEventListener('touchstart',start);element.removeEventListener('touchmove',drag);element.removeEventListener('touchend',end);element.removeEventListener('touchcancel',cancel);};
  },[element,begin,move,finish,clear]);
  return {pending,swipe,handlers:{ref:setElement,
    onPointerDown(event:PointerEvent<HTMLElement>){if(event.pointerType==='touch'||event.button!==0||(event.target as HTMLElement).closest('button,a,input,select,textarea,summary'))return;if(begin(event.clientX,event.clientY,event.pointerId)){event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();}},
    onPointerMove(event:PointerEvent<HTMLElement>){if(event.pointerType!=='touch')move(event.clientX,event.clientY);},
    onPointerUp(event:PointerEvent<HTMLElement>){if(event.pointerType!=='touch'&&origin.current?.id===event.pointerId)finish(event.clientX,event.clientY);},
    onPointerCancel(event:PointerEvent<HTMLElement>){if(event.pointerType!=='touch'&&!locked.current)clear();},
    onLostPointerCapture(event:PointerEvent<HTMLElement>){if(event.pointerType!=='touch'&&!locked.current)clear();},
  }};
}
