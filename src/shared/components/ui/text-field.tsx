"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, hint, id, className, ...props }, ref) {
    const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
    const describedBy = error
      ? `${inputId}-error`
      : hint
      ? `${inputId}-hint`
      : undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-[var(--color-text-primary)]">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "w-full h-12 px-3 rounded-[var(--radius-control)] border bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] min-h-[44px]",
            "focus:outline-none focus:ring-[3px] focus:ring-offset-[2px] focus:ring-offset-[var(--color-bg-surface)]",
            error
              ? "border-[#c0392b] focus:ring-[#c0392b]/30"
              : "border-[var(--color-border-control)] focus:ring-[var(--color-focus-ring)]",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-[#c0392b]">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--color-text-secondary)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
