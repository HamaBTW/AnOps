import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/shared/components/pwa-register";

export const metadata: Metadata = {
  title: "AnOps | One platform. Every operation.",
  description: "An AI-native, modular business platform that centralizes data, supports analysis, and helps teams move work forward.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AnOps",
  },
  icons: {
    icon: "/anops-master-symbol.svg",
    apple: "/anops-master-symbol.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111f1d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className="h-full" suppressHydrationWarning>
      <body
        className="h-full antialiased bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]"
        style={{
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
