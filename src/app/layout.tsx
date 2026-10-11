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
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
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
