import { DocumentLocale } from "@/components/site/document-locale";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./account.css";
import "./cream-arcade.css";
import "./pwa.css";
import { positioning } from '@/lib/marketing/positioning';
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
const { title, description } = positioning.en;
export const metadata: Metadata = {
  ...frenchMetadata,
  title,
  description,
  applicationName: "Monetizable",
  openGraph: { ...frenchMetadata.openGraph, title, description, siteName: "Monetizable", url: "https://getmonetizable.com", type: "website" },
  twitter: { ...frenchMetadata.twitter, title, description },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff6e5",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <DocumentLocale>{children}</DocumentLocale>
      </body>
    </html>
  );
}
