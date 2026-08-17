import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho, Cormorant_Garamond } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import "./brand.css";
import "./service-redesign.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

// 見出し用の明朝（温かく上質な神秘感）
const shippori = Shippori_Mincho({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// ワードマーク用のラテン・セリフ
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://orba.life";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-9Z2S2XGR5S";
const APP_DESC = "複数の知恵と、あなた自身の言葉をひとつに。Orbaは、迷いの中に静かな輪郭をつくるパーソナルパートナーです。";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Orba（オーバ）｜8つの知恵から、あなたを読み解く",
  description: APP_DESC,
  manifest: "/manifest.json",
  applicationName: "Orba",
  icons: {
    icon: [{ url: "/brand/orba-icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orba",
  },
  openGraph: {
    type: "website",
    siteName: "Orba",
    title: "Orba（オーバ）｜8つの知恵から、あなたを読み解く",
    description: APP_DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Orba" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orba（オーバ）｜8つの知恵から、あなたを読み解く",
    description: APP_DESC,
    images: ["/og.png"],
  },
};

export const viewport = {
  themeColor: "#0a0820",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${shippori.variable} ${cormorant.variable} antialiased selection:bg-amber-300/20 selection:text-white`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
      <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
    </html>
  );
}
