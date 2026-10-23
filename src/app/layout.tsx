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
  var RECOVERY_KEY = "anops:last-recovery";
  var HIDDEN_KEY = "anops:hidden-at";
  var ATTEMPTS_KEY = "anops:recovery-attempts";

  function hydrated() {
    return document.documentElement.dataset.hydrated === "true";
  }

  function shouldRecover(reason) {
    if (hydrated()) return false;
    var now = Date.now();
    var last = Number(sessionStorage.getItem(RECOVERY_KEY) || "0");
    if (now - last < 1500) return false;
    var attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) || "0");
    if (attempts >= 2) return false;
    sessionStorage.setItem(RECOVERY_KEY, String(now));
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts + 1));
    try { console.warn("[anops:dev-recovery] white screen detected, reloading (" + reason + ")"); } catch (e) {}
    return true;
  }

  function recover(reason) {
    if (shouldRecover(reason)) {
      location.reload();
    }
  }

  window.addEventListener("pagehide", function (e) {
    try { sessionStorage.setItem(HIDDEN_KEY, String(Date.now())); } catch (err) {}
    if (e.persisted) {
      try { sessionStorage.setItem("anops:bfcache", "1"); } catch (err) {}
    }
  });

  window.addEventListener("pageshow", function (e) {
    try { sessionStorage.removeItem(ATTEMPTS_KEY); } catch (err) {}
    var nav = performance.getEntriesByType("navigation")[0] || {};
    var navType = nav.type || "";
    var bfcache = false;
    try { bfcache = sessionStorage.getItem("anops:bfcache") === "1"; sessionStorage.removeItem("anops:bfcache"); } catch (err) {}
    var hiddenAt = Number(sessionStorage.getItem(HIDDEN_KEY) || "0");
    var wasHiddenRecently = hiddenAt && Date.now() - hiddenAt < 10000;

    if (e.persisted || bfcache || navType === "back_forward" || navType === "reload") {
      if (!hydrated()) {
        setTimeout(function () { recover("bfcache/pageshow"); }, 150);
        return;
      }
    }

    if (wasHiddenRecently && !hydrated()) {
      setTimeout(function () { recover("return-from-app"); }, 200);
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      try { sessionStorage.setItem(HIDDEN_KEY, String(Date.now())); } catch (err) {}
      return;
    }

    if (document.visibilityState === "visible") {
      setTimeout(function () {
        if (!hydrated()) recover("visibility-visible");
      }, 200);
      setTimeout(function () {
        if (!hydrated()) recover("visibility-visible-late");
      }, 800);
    }
  });

  window.addEventListener("focus", function () {
    setTimeout(function () {
      if (!hydrated()) recover("focus");
    }, 150);
  });

  window.addEventListener("load", function () {
    setTimeout(function () {
      if (!hydrated()) recover("onload-check");
    }, 1000);
  });
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('anops:theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
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
