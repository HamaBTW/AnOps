"use client";

import { createContext, useContext } from "react";
import type { ErrorLike } from "@/shared/lib/action-error-copy";

export type ThreadRequest = {
  command: string;
  step: "start" | "select" | "submit";
  args?: Record<string, string | number | boolean>;
  values?: Record<string, string | number | boolean>;
  /** Shown as the person's own message in the thread. */
  label: string;
};

export type ThreadResult = { ok: true } | { ok: false; error: ErrorLike & { details?: Record<string, string> } };

/** Lets a table row, a card button or a form send a guided step back to the server. The thread appends the answer. */
export type ThreadActions = { run: (request: ThreadRequest) => Promise<ThreadResult>; busy: boolean };

const Ctx = createContext<ThreadActions | null>(null);

export const ThreadActionsProvider = Ctx.Provider;

export function useThreadActions(): ThreadActions {
  return useContext(Ctx) ?? { run: async () => ({ ok: false, error: { message: "This action is not available here." } }), busy: false };
}
