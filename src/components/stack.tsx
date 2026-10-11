
import { Localized } from "@/components/localized";
export function Stack({ elements, className = "" }: { elements: string[]; className?: string }) {
  return <Localized><div className={`stack-mark ${className}`}>{elements.map((element, index) => <span key={`${element}-${index}`} className="contents">{index > 0 && <span className="times" aria-hidden="true">×</span>}<span className="stack-item">{element}</span></span>)}</div></Localized>;
}
