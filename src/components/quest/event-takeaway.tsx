import type { MarketEvent } from "@/lib/quest/types";
import { eventTakeaway } from "@/lib/quest/event-presentation";

export default function EventTakeaway({ event, locale }: { event: MarketEvent; locale: "zh" | "en" }) {
  const takeaway = eventTakeaway(event, locale);
  if (!takeaway) return null;
  return <aside className={`event-takeaway ${takeaway.tone}`} aria-label={locale === "zh" ? "公布后解读" : "Release interpretation"}>
    <span className="event-direction" aria-hidden="true">{takeaway.arrow}</span>
    <div><strong>{takeaway.title}</strong><p>{takeaway.detail}</p></div>
  </aside>;
}
