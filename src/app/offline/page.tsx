"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]">
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl tracking-[-0.03em]">You&apos;re offline</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Check your connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="h-12 px-5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-semibold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] min-h-[44px]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
