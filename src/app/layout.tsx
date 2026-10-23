import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { PwaRegister } from "@/shared/components/pwa-register";
import { HydrationMarker } from "@/shared/components/hydration-marker";

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

const devRecoveryShim = `(function () {
  var KEY = "anops:last-recovery";
  function shouldRecover() {
    if (document.documentElement.dataset.hydrated === "true") return false;
    var last = Number(sessionStorage.getItem(KEY) || "0");
    if (Date.now() - last < 2000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
    return true;
  }
  function recover() {
    if (shouldRecover()) location.reload();
  }
  window.addEventListener("pageshow", function (e) {
    var nav = performance.getEntriesByType("navigation")[0] || {};
    if (e.persisted || nav.type === "back_forward") recover();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      setTimeout(recover, 250);
    }
  });
})();`;

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
        {process.env.NODE_ENV === "development" && (
          <Script id="anops-dev-recovery" strategy="beforeInteractive">
            {devRecoveryShim}
          </Script>
        )}
        <HydrationMarker />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
