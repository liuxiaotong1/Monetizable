import {LocaleProvider} from '@/components/i18n/locale-provider';
import {requestLocale} from '@/lib/i18n/server-locale';
import {currentUser,isAdmin} from '@/lib/account/auth';
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./account.css";
import "./cream-arcade.css";
import AnalyticsTracker from "@/components/account/analytics";
const frenchMetadata: Metadata = {
  metadataBase: new URL("https://getmonetizable.com"),
  alternates: { canonical: "https://getmonetizable.com" },
  title: "Monetizable · Apprendre à investir en s’amusant",
  description:
    "Votre aventure d’investissement : formulez une prévision, comprenez les événements et progressez avec des cartes pédagogiques.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Monetizable",
  },
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/brand/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    shortcut: "/brand/favicon.ico",
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title: "Monetizable",
    description: "Investir devient plus ludique.",
    images: [
      {
        url: "/brand/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Monetizable Curious M — ivory and gold",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monetizable",
    images: ["/brand/social-preview.png"],
  },
  manifest: "/manifest.webmanifest",
};
export async function generateMetadata():Promise<Metadata>{
 const locale=await requestLocale(isAdmin(await currentUser()));
 if(locale==='en')return {...frenchMetadata,title:'Monetizable · Make investing an adventure',description:'Prepare your market view, understand major events and build investing knowledge with interactive cards.',openGraph:{...frenchMetadata.openGraph,description:'Make investing an adventure.'}};
 return frenchMetadata;
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff6e5",
  viewportFit: "cover",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale=await requestLocale(isAdmin(await currentUser()));
  return (
    <html lang={locale==='zh'?'zh-CN':locale}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <AnalyticsTracker />
      </body>
    </html>
  );
}
