"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [hasDismissed, setHasDismissed] = useState(false);
  const [previouslyOffline, setPreviouslyOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setPreviouslyOffline(true);
      setHasDismissed(false);
    } else if (previouslyOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, previouslyOffline]);

  if (isOnline && !showRestored) return null;
  if (!isOnline && hasDismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-lg text-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
        !isOnline
          ? "bg-[var(--color-bg-surface,#181a1b)] border-amber-500/40 text-amber-200"
          : "bg-[var(--color-bg-surface,#181a1b)] border-emerald-500/40 text-emerald-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            !isOnline ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
          }`}
        />
        <span className="font-medium">
          {!isOnline
            ? "Offline Mode — Browsing cached pages (Read-only)"
            : "Connection restored — Online"}
        </span>
      </div>

      {!isOnline && (
        <button
          type="button"
          onClick={() => setHasDismissed(true)}
          className="text-xs text-[var(--color-text-secondary)] hover:text-white px-1.5 py-0.5 rounded ml-2"
          aria-label="Dismiss offline banner"
        >
          ✕
        </button>
      )}
    </div>
  );
}
