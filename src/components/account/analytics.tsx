"use client";
import { Analytics } from "@vercel/analytics/next";
export default function AnalyticsTracker() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (
          url.pathname.startsWith("/auth/confirm") ||
          url.pathname.startsWith("/admin")
        )
          return null;
        return { ...event, url: url.origin + url.pathname };
      }}
    />
  );
}
