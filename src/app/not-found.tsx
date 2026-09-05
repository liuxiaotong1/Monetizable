import { Header } from "@/components/brand";
import Link from "next/link";
export default function NotFound() { return <main><Header/><div className="shell card mt-16 max-w-xl p-8"><div className="eyebrow text-[var(--gold-deep)]">404</div><h1 className="display mt-4 text-4xl">This map is no longer here.</h1><p className="mt-4 text-black/60">It may have expired or been deleted.</p><Link className="button mt-6" href="/">Start a new analysis</Link></div></main>; }
