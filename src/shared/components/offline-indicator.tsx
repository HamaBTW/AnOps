"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

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
  const [previouslyOffline, setPreviouslyOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setPreviouslyOffline(true);
    } else if (previouslyOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, previouslyOffline]);

  if (isOnline && !showRestored) return null;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className={`sticky top-0 z-[100] w-full px-4 py-2.5 shadow-md flex items-center justify-between transition-all duration-300 ${
        !isOnline
          ? "bg-amber-600 text-white font-medium text-sm border-b border-amber-700"
          : "bg-emerald-600 text-white font-medium text-sm border-b border-emerald-700"
      }`}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0 text-emerald-200" />
          )}
          <span className="text-xs sm:text-sm tracking-wide">
            {!isOnline ? (
              <>
                <strong className="font-semibold uppercase tracking-wider text-[11px] bg-amber-800/60 px-2 py-0.5 rounded mr-2">
                  Offline Mode
                </strong>
                You are currently offline. Working with locally cached data &amp; queueing actions.
              </>
            ) : (
              <>
                <strong className="font-semibold uppercase tracking-wider text-[11px] bg-emerald-800/60 px-2 py-0.5 rounded mr-2">
                  Connected
                </strong>
                Internet connection restored. Synchronizing updates...
              </>
            )}
          </span>
        </div>

        {!isOnline && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs bg-amber-800/80 hover:bg-amber-900 text-amber-100 px-3 py-1 rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Retry</span>
          </button>
        )}
      </div>
    </aside>
  );
}
