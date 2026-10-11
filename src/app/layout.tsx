import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./account.css";
import AnalyticsTracker from "@/components/account/analytics";
export const metadata: Metadata = {
  metadataBase: new URL("https://getmonetizable.com"),
  alternates: { canonical: "https://getmonetizable.com" },
  title: "Monetizable · Make investing a little more playful",
  description:
    "Your daily investing adventure: make a call, understand market events, and level up with bite-size learning.",
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
    description: "Investing. A little more playful.",
    images: [
      {
        url: "/brand/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Monetizable blue-violet bull controller logo",
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
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c101b",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
