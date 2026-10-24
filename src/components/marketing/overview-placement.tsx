'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Keep the definition in the server response, then place it in the landing flow
 * once account bootstrap has mounted that flow. Navigation must not duplicate it. */
export default function OverviewPlacement({children}: {children: ReactNode}) {
  const [{slot, placed}, setPlacement] = useState<{slot: HTMLElement | null; placed: boolean}>({slot: null, placed: false});
  useEffect(() => {
    const locate = () => {
      const next = document.getElementById('landing-overview-slot');
      setPlacement(current => current.slot === next ? current : {slot: next, placed: current.placed || !!next});
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, {childList: true, subtree: true});
    return () => observer.disconnect();
  }, []);
  return slot ? createPortal(children, slot) : placed ? null : children;
}
