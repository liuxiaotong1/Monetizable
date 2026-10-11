"use client";
import { useEffect, useRef, type RefObject } from "react";
export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean, close: () => void) {
 const closeRef=useRef(close);closeRef.current=close;
 useEffect(()=>{if(!active||!ref.current)return;const container=ref.current,previous=document.activeElement as HTMLElement|null;const focusables=()=>Array.from(container.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);focusables()[0]?.focus();const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();closeRef.current();}if(e.key!=="Tab")return;const all=focusables(),first=all[0],last=all.at(-1);if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};container.addEventListener("keydown",key);return()=>{container.removeEventListener("keydown",key);if(previous?.isConnected)previous.focus();};},[active,ref]);
}
