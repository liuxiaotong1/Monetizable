import type { Metadata } from "next";
import { AnalyticsProviders } from "@/components/analytics-providers";
import { DiscoveryBridge } from "@/components/discovery-bridge";
import { getRequestLocale } from "@/lib/request-locale";
import "./globals.css";

// Search metadata always identifies the production entity, including on Preview deployments.
const appUrl = "https://getmonetizable.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "Monetizable — Package Your Expertise and Reach Buyers", template: "%s | Monetizable" },
  description: "Turn proven experience into a sellable offer, validate who will buy it, and continuously reach relevant decision makers.",
  alternates: { canonical: appUrl },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260903-2", type: "image/x-icon", sizes: "32x32" },
      { url: "/icon.svg?v=20260903-2", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/favicon.ico?v=20260903-2",
    apple: "/monetizable-mark-email.png?v=20260903-2",
  },
  openGraph: { title: "Package what you know into an offer buyers want", description: "Evidence-led offer packaging, buyer targeting, and continuous personalized outreach.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Monetizable offer packaging and opportunity outreach" }] },
  twitter: { card: "summary_large_image", title: "Monetizable", description: "Package your expertise, find the right buyers, and keep reaching them.", images: ["/og.png"] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const locale = await getRequestLocale();
  return <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning><body>{children}<DiscoveryBridge /><AnalyticsProviders gaId={gaId} /></body></html>;
}
