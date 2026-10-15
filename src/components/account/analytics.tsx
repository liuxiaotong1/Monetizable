"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { Analytics } from "@vercel/analytics/next";
export default function AnalyticsTracker() {
  return <LocalizeTree>{(
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
  )}</LocalizeTree>;
}
