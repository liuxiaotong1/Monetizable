'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import './in-view-reveal.css';
/** Observe each item separately so mobile stacks do not animate before they are visible. */
export default function InViewReveal({children,className='',index=0}:{children:ReactNode;className?:string;index?:number}){
 const ref=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el)return;if(!('IntersectionObserver' in window)){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{threshold:.15});observer.observe(el);return()=>observer.disconnect();},[]);
 return <div ref={ref} className={`in-view-reveal ${visible?'revealed':''} ${className}`} style={{'--reveal-delay':`${index*.16}s`} as CSSProperties}>{children}</div>;
}
