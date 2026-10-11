
import { Localized } from "@/components/localized";
import Link from "next/link";

// Search is remote freelance/project-only. Saved facts and approval are kept
// server-side; changing direction does not require editing a preferences form.
export function AgentControls() {
  return <Localized><div className="mt-8 flex flex-wrap items-center gap-5"><Link href="/agent?setup=intent" className="button gold-surface w-full justify-center sm:w-auto">Change direction ↗</Link><Link href="/account/billing" className="text-sm font-bold underline underline-offset-4">Manage / cancel subscription</Link></div></Localized>;
}
