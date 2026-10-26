"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Feedback = { kind: "error" | "success"; text: string } | null;

/**
 * Holds one inline result message. Success messages clear themselves after a few seconds. The timer is
 * cleared on unmount, so no state update reaches an unmounted component.
 */
export function useActionFeedback() {
  const [message, setMessage] = useState<Feedback>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(null);
  }, []);

  const success = useCallback((text: string) => {
    setMessage({ kind: "success", text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  const error = useCallback((text: string) => setMessage({ kind: "error", text }), []);

  return { message, clear, success, error };
}
