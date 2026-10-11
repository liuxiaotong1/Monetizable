"use client";
import { Localized } from "@/components/localized";


import { useEffect, useState } from "react";
import Link from "next/link";
import { SuperCharlieGuide } from "@/components/supercharlie-guide";

export function AgentActivation({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState("Activating SuperCharlie…");
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/subscription/activate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setEmail(data.email);
        setSignedIn(Boolean(data.signedIn));
        if (data.signedIn) {
          setMessage("SuperCharlie is active. Taking you to setup…");
          window.setTimeout(() => window.location.assign("/agent?setup=intent"), 700);
        } else {
          setMessage("SuperCharlie is active. Check your email to create your private account, or continue below.");
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Activation failed"));
  }, [sessionId]);
  return <Localized><div className="w-full max-w-3xl"><div className="card p-8 text-center md:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--gold-soft)] text-2xl">✓</div><h1 className="editorial-title mt-6 text-3xl md:text-5xl">Subscription received</h1><p className="mt-5 leading-7 text-black/60">{message}</p>{email && <p className="mt-2 text-sm font-bold">{email}</p>}{!signedIn ? <Link href="/auth?mode=signup&next=%2Fagent%3Fsetup%3Dintent" className="button mt-7">Create my account</Link> : null}</div><SuperCharlieGuide compact title="SuperCharlie is ready to guide the next move."/></div></Localized>;
}
