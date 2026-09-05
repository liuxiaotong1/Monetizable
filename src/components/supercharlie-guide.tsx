import { SuperCharlieCompanion } from "@/components/supercharlie-companion";

export function SuperCharlieGuide({
  title = "Meet SuperCharlie",
  body = "SuperCharlie packages what you do best, scans the market for relevant opportunities, and helps you reach the right people—or reaches out directly when you authorize it.",
  compact = false,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
}) {
  return (
    <>
      <aside className={`${compact ? "mt-8" : "mt-10"} border-l-2 border-[var(--gold)] py-1 pl-5`} aria-label="SuperCharlie guide">
        <div className="eyebrow text-[var(--gold-deep)]">Your market and opportunity guide</div>
        <h2 className="editorial-title mt-2 text-2xl md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl leading-7 text-black/62">{body}</p>
      </aside>
      <SuperCharlieCompanion message={title} />
    </>
  );
}
