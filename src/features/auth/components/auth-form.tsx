"use client";

import Link from "next/link";

export function AuthCard({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-canvas)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <img src="/anops-horizontal-logo.svg" alt="AnOps" className="h-8" />
          </Link>
          <h1 className="text-2xl font-bold tracking-[-0.03em]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-[var(--shadow-raised)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full h-12 px-3 rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] text-sm focus:outline-none focus:ring-[3px] focus:ring-[var(--color-focus-ring)] focus:ring-offset-[2px] focus:ring-offset-[var(--color-bg-surface)]"
      />
    </div>
  );
}

export function Button({ children, variant = "primary", type = "button", className = "" }: { children: React.ReactNode; variant?: "primary" | "secondary" | "tertiary"; type?: "button" | "submit"; className?: string }) {
  const base = "h-12 px-5 rounded-[var(--radius-control)] text-sm font-semibold transition-colors focus-visible:outline-[3px] focus-visible:outline-[var(--color-focus-ring)] focus-visible:outline-offset-2";
  const styles = {
    primary: "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]",
    secondary: "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-control)] hover:bg-[var(--color-bg-subtle)]",
    tertiary: "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]",
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}
