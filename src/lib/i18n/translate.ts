import catalog from './fr.json';
import chineseCatalog from './zh.json';
import type {AppLocale} from './locale';
const messages=catalog as Record<string,string>;
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
const patterns=Object.entries(messages).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>{
 const slots:number[]=[];const escaped=key.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?(slots.push(Number(part.slice(1,-1))),'(.*?)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
 return {regex:new RegExp('^'+escaped+'$'),slots,value};
});
export function translateString(text:string,locale:AppLocale='fr',depth=0):string{
 if(!text.trim()||locale==='en')return text;const key=normalize(text);
 if(locale==='zh'){const translated=(chineseCatalog as Record<string,string>)[key];return translated?text.match(/^\s*/)?.[0]+translated+(text.match(/\s*$/)?.[0]||''):text;}
 let translated=messages[key];
 if(!translated)for(const p of patterns){const match=key.match(p.regex);if(match){translated=p.value.replace(/\{(\d+)\}/g,(_,slot)=>{const index=p.slots.indexOf(Number(slot));return index<0?'':depth<3?translateString(match[index+1],locale,depth+1):match[index+1];});break;}}
 if(!translated&&depth<3){const parts=key.split(/( · |(?<=[.!?])\s+)/);if(parts.length>1){const result=parts.map(part=>part.trim()?translateString(part,locale,depth+1):part).join('');if(result!==key)translated=result;}}
 if(!translated)return text;return text.match(/^\s*/)?.[0]+translated+(text.match(/\s*$/)?.[0]||'');
}
export function frenchCopy<T>(value:T):T{if(typeof value==='string')return translateString(value) as T;if(Array.isArray(value))return value.map(frenchCopy) as T;if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['id','conceptId','url','sourceUrl','kind','category','tags','generatedAt','asOf'].includes(key)?item:frenchCopy(item)])) as T;return value;}
