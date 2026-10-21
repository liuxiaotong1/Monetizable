'use client';
import {useId,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocale} from '@/components/i18n/locale-provider';
import {translateString} from '@/lib/i18n/translate';
import {glossaryTerms} from '@/lib/quest/learning-depth';
import {cleanCardText} from '@/lib/quest/learning-copy';
const termMatchers=glossaryTerms.map(term=>({term,regex:new RegExp('^(?:'+term.pattern+')$','i')}));
const matcher=new RegExp('('+glossaryTerms.map(t=>t.pattern).join('|')+')','gi');
function InlineTerm({text,definition}:{text:string;definition:string}){
 const id=useId(),[position,setPosition]=useState<{left:number;top:number;above:boolean}>();
 function show(node:HTMLElement){const box=node.getBoundingClientRect();setPosition({left:Math.max(12,Math.min(box.left,window.innerWidth-272)),top:box.top>170?box.top-8:box.bottom+8,above:box.top>170});}
 return <span className="inline-card-term" data-term tabIndex={0} aria-describedby={position?id:undefined} onMouseEnter={e=>show(e.currentTarget)} onMouseLeave={()=>setPosition(undefined)} onFocus={e=>show(e.currentTarget)} onBlur={()=>setPosition(undefined)} onClick={e=>{e.currentTarget.focus();show(e.currentTarget);}} onKeyDown={e=>{if(e.key==='Escape')setPosition(undefined);}}>{text}{position&&createPortal(<span className="card-term-tooltip" id={id} role="tooltip" style={{left:position.left,top:position.top,transform:position.above?'translateY(-100%)':undefined}}>{definition}</span>,document.body)}</span>;
}
export default function CardText({children}:{children:string}){
 const locale=useLocale(),parts=cleanCardText(children).split(matcher);
 return <>{parts.map((part,i)=>{const term=termMatchers.find(t=>t.regex.test(part))?.term;if(!term)return part;const definition=locale==='zh'?term.zh:locale==='fr'?('fr' in term?String(term.fr):translateString(term.en,'fr')):term.en;return <InlineTerm key={i} text={part} definition={definition}/>;})}</>;
}
