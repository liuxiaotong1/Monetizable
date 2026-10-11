import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { metadataBase:new URL("https://getmonetizable.com"), alternates:{canonical:"https://getmonetizable.com"}, title: "QQQ Quest · 把判断变成经验", description: "免费公开的交易学习冒险：准备、复盘与每天一点新知识。", appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "QQQ Quest" }, icons: { icon: "/icon.svg", apple: "/icon-192.png" }, manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c101b", viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="zh-CN"><body>{children}</body></html>; }
