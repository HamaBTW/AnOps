"use client";

import { useEffect } from "react";

/**
 * Reliably locks page scroll when a modal is open.
 *
 * Strategy:
 * - Records current scroll position before locking
 * - Sets overflow:hidden on BOTH <html> and <body> (Next.js App Router
 *   can scroll on either element depending on the layout)
 * - Blocks wheel + touch-move events on document so nested scrollable
 *   regions inside the modal still work but the page underneath cannot scroll
 * - Restores everything exactly on unmount / when isLocked becomes false
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const html = document.documentElement;
    const body = document.body;

    // Capture before we touch anything
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    // Lock both <html> and <body>
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    // Block wheel scroll on the document (passive:false lets us call preventDefault)
    const preventScroll = (e: Event) => e.preventDefault();
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      // Restore styles
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;

      // Remove event blockers
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);

      // Jump back to original scroll position
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [isLocked]);
}
