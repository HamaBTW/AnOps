"use client";

import { useState, useTransition } from "react";
import { confirmUnsubscribeAction } from "@/features/marketing/actions/unsubscribe.action";
import { Button } from "@/shared/components/ui/button";
import { FormMessage } from "@/shared/components/ui/form-message";

export function UnsubscribeConfirm({ token, companyName, channel }: { token: string; companyName: string; channel: "email" | "sms" }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = channel === "email" ? "email" : "SMS";

  if (done) return <FormMessage kind="success">{done}</FormMessage>;

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Stop receiving {label} marketing messages from <span className="font-semibold text-[var(--color-text-primary)]">{companyName}</span>. You can still receive messages about orders or accounts.
      </p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await confirmUnsubscribeAction(token);
            if (!result.ok) return setError(result.error.message);
            setDone(result.data.outcome === "already_unsubscribed" ? "You were already unsubscribed." : "You have been unsubscribed.");
          })
        }
      >
        {pending ? "Confirming…" : `Unsubscribe from ${label}`}
      </Button>
    </div>
  );
}
