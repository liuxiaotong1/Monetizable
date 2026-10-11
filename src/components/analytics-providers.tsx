"use client";
import { Localized } from "@/components/localized";


import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import { Clarity } from "@/components/clarity";

const analyticsOptOutCookie = "monetizable_analytics_opt_out=1";

function hasAnalyticsOptOutCookie() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === analyticsOptOutCookie);
}

export function AnalyticsProviders({ gaId }: { gaId?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!hasAnalyticsOptOutCookie());
  }, []);

  if (!enabled) return null;

  return (
    <Localized><>
      <Clarity />
      <Analytics />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </></Localized>
  );
}
