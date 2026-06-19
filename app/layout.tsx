import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
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
const APP_DESC = "あなただけのパートナーオーブ。Orbaはあなたを深く知り、迷ったとき道を照らすパーソナルパートナーです。";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Orba | あなただけのパートナーオーブ",
  description: APP_DESC,
  manifest: "/manifest.json",
  applicationName: "Orba",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
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
    title: "Orba | あなただけのパートナーオーブ",
    description: APP_DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Orba" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orba | あなただけのパートナーオーブ",
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
    </html>
  );
}

