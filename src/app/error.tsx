"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center p-6"><div className="card max-w-lg p-8 text-center"><div className="eyebrow text-[var(--gold-deep)]">Something went wrong</div><h1 className="display mt-4 text-4xl">The market check didn’t finish cleanly.</h1><p className="mt-4 text-black/60">Your payment and CV are not changed by retrying this page.</p><button className="button mt-6" onClick={reset}>Try again</button></div></main>;
}

