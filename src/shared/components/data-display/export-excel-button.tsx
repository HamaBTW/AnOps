"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { errorMessageFrom, fileNameFromDisposition, saveBlob } from "@/shared/lib/download";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "done"; message: string } | { kind: "error"; message: string };

/**
 * Downloads a server-generated Excel workbook for the current filters. The button is disabled while
 * the request is in flight, and a ref blocks a second click that lands before React re-renders.
 * The success message appears only after the file has been received and handed to the browser.
 */
export function ExportExcelButton({ href, label = "Export Excel", ariaLabel }: { href: string; label?: string; ariaLabel?: string }) {
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
        setStatus({ kind: "error", message: await errorMessageFrom(response) });
        return;
      }
      const blob = await response.blob();
      const fileName = fileNameFromDisposition(response.headers.get("Content-Disposition")) ?? "export.xlsx";
      const rows = Number(response.headers.get("X-Export-Row-Count") ?? "0");
      saveBlob(blob, fileName);
      setStatus({
        kind: "done",
        message: rows === 0 ? "Downloaded. No records match these filters." : `Downloaded ${fileName} with ${rows.toLocaleString("en-US")} rows.`,
      });
    } catch {
      setStatus({ kind: "error", message: "The export could not be generated. Check your connection and try again." });
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
      <p role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">
        {status.kind === "done" ? status.message : null}
      </p>
      {status.kind === "error" && (
        <p role="alert" className="text-xs text-[var(--color-status-error)]">
          {status.message}
        </p>
      )}
    </div>
  );
}
