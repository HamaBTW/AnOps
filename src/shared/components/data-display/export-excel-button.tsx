"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle, RotateCw } from "lucide-react";
import { useToast } from "@/shared/components/ui/toast";
import { Button } from "@/shared/components/ui/button";
import { errorMessageFrom, fileNameFromDisposition, saveBlob } from "@/shared/lib/download";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "done" } | { kind: "error"; message: string };

/**
 * Downloads a server-generated Excel workbook for the current filters. The button is disabled while
 * the request is in flight, and a ref blocks a second click that lands before React re-renders.
 * Success is announced (toast) only after the file has been received and handed to the browser.
 */
export function ExportExcelButton({ href, label = "Export Excel", ariaLabel }: { href: string; label?: string; ariaLabel?: string }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inFlight = useRef(false);
  const loading = status.kind === "loading";

  async function download() {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus({ kind: "loading" });
    try {
      const response = await fetch(href, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const message = await errorMessageFrom(response);
        setStatus({ kind: "error", message });
        toast.error("Export failed", message);
        return;
      }
      const blob = await response.blob();
      const fileName = fileNameFromDisposition(response.headers.get("Content-Disposition")) ?? "export.xlsx";
      const rows = Number(response.headers.get("X-Export-Row-Count") ?? "0");
      saveBlob(blob, fileName);
      setStatus({ kind: "done" });
      if (rows === 0) toast.info("Export downloaded", "The file is empty because no records match these filters.");
      else toast.success("Export downloaded", `${fileName} with ${rows.toLocaleString("en-US")} rows was saved.`);
    } catch {
      const message = "The export could not be generated. Check your connection and try again.";
      setStatus({ kind: "error", message });
      toast.error("Export failed", message);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" onClick={download} disabled={loading} aria-busy={loading} aria-label={ariaLabel} className="w-full sm:w-auto">
        {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
        {loading ? "Preparing Excel…" : label}
      </Button>
      {status.kind === "error" && (
        <div role="alert" className="flex max-w-xs flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-status-error)]">
          <span>{status.message}</span>
          <button type="button" onClick={download} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]">
            <RotateCw aria-hidden className="size-3" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
