"use client";

import { FormEvent, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Copy, Plus, RefreshCw, Send, X } from "lucide-react";
import { socialPostSchema } from "@/features/marketing/schemas/social.schema";
import { validateMarketingInput } from "@/features/marketing/lib/client-validation";

type Post = {
  id: string;
  content: string;
  platform: string;
  accountId?: string;
  mediaUrl?: string;
  status: string;
  scheduledAt?: string | Date;
  providerPostId?: string;
  safeError?: string;
};

type Account = { _id: string; platform: string; displayName: string; connectionStatus: string; scopes?: string[] };
type Attempt = { attemptNumber: number; outcome: string; safeError?: string; startedAt: string };

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]";

const statusLabel = (value: string) => value.replaceAll("_", " ");

export function SocialPlanner({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [platform, setPlatform] = useState<"facebook" | "instagram">("facebook");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/marketing/social-accounts")
      .then(async (response) => {
        if (response.ok) setAccounts((await response.json()) as Account[]);
      })
      .catch(() => setError("Connected account data is unavailable."))
      .finally(() => setLoading(false));
  }, []);

  const connected = accounts.filter(
    (account) => account.platform === platform && account.connectionStatus === "connected"
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const rawScheduledAt = String(form.get("scheduledAt") ?? "");
    const scheduledDate = rawScheduledAt ? new Date(rawScheduledAt) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      setError("Choose a valid future publish date and time.");
      setBusy(false);
      return;
    }
    const validation = validateMarketingInput(socialPostSchema, {
      platform, accountId: form.get("accountId") || undefined, content: form.get("content"),
      mediaUrl: form.get("mediaUrl") || undefined,
      scheduledAt: scheduledDate.toISOString(),
    });
    if ("error" in validation) { setError(validation.error); setBusy(false); return; }
    const response = await fetch("/api/marketing/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = (await response.json()) as Post & { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to save post.");
    } else {
      setPosts((items) => [data, ...items]);
      setOpen(false);
    }
    setBusy(false);
  }

  async function action(id: string, actionName: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/marketing/social/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    if (!response.ok) {
      setError("That action is no longer available for this post.");
    } else if (actionName === "duplicate") {
      const copy = (await response.json()) as Post;
      setPosts((items) => [copy, ...items]);
    } else {
      const next =
        actionName === "submit"
          ? "pending_approval"
          : actionName === "approve"
          ? "approved"
          : actionName === "retry"
          ? "scheduled"
          : actionName;
      setPosts((items) =>
        items.map((post) => (post.id === id ? { ...post, status: next, safeError: undefined } : post))
      );
    }
    setBusy(false);
  }

  async function showAttempts(id: string) {
    if (attempts[id]) return;
    const response = await fetch(`/api/marketing/social/${id}/attempts`);
    if (response.ok) {
      const history = (await response.json()) as Attempt[];
      setAttempts((items) => ({ ...items, [id]: history }));
    }
  }

  return (
    <div className="reveal space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Marketing & Socials
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Social Planner
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Schedule Facebook text posts and Instagram Professional image posts with verifiable publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
        >
          <Plus className="h-4 w-4" /> New post
        </button>
      </header>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 text-sm sm:p-5">
        <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
          <CheckCircle2 className="h-4 w-4 text-[var(--color-action-primary)]" /> Channel Connectivity
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {loading
            ? "Checking connected social accounts…"
            : connected.length
            ? `${connected.length} active ${platform === "instagram" ? "Instagram Professional account" : "Facebook Page"}${
                connected.length === 1 ? "" : "s"
              } connected and authorized.`
            : `${platform === "instagram" ? "Instagram requires a verified Business or Creator account." : "No active Facebook Page connected."} Use the Connect actions above to authorize via Meta OAuth.`}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--color-status-error)]/30 bg-[var(--color-status-error)]/10 p-3 text-sm text-[var(--color-status-error)]">
          {error}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase">
                <span className="rounded bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[var(--color-text-primary)]">
                  {post.platform}
                </span>
                <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 capitalize text-[var(--color-text-secondary)]">
                  {statusLabel(post.status)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-text-primary)] leading-relaxed">
                {post.content}
              </p>
              {post.mediaUrl && (
                <p className="mt-2 truncate text-xs text-[var(--color-text-secondary)]">Media: {post.mediaUrl}</p>
              )}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <Calendar className="h-3.5 w-3.5" />
                {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "No schedule"}
              </div>
              {post.providerPostId && (
                <p className="mt-1.5 break-all text-xs text-[var(--color-text-secondary)]">
                  Meta ID: <span className="font-mono">{post.providerPostId}</span>
                </p>
              )}
              {post.safeError && (
                <p className="mt-2 rounded bg-[var(--color-status-error)]/10 p-2 text-xs text-[var(--color-status-error)]">
                  {post.safeError}
                </p>
              )}
              {["published", "failed", "manual_review"].includes(post.status) && (
                <button
                  type="button"
                  onClick={() => void showAttempts(post.id)}
                  className="mt-2 text-xs font-semibold text-[var(--color-action-primary)] underline"
                >
                  {attempts[post.id] ? "Attempt log updated" : "View attempt log"}
                </button>
              )}
              {attempts[post.id]?.map((attempt) => (
                <p
                  key={attempt.attemptNumber}
                  className="mt-1.5 rounded border border-[var(--color-border-subtle)] p-2 text-xs text-[var(--color-text-secondary)]"
                >
                  #{attempt.attemptNumber}: {statusLabel(attempt.outcome)} ·{" "}
                  {new Date(attempt.startedAt).toLocaleTimeString()}
                  {attempt.safeError && ` · ${attempt.safeError}`}
                </p>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3">
              {post.status === "draft" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action(post.id, "submit")}
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                >
                  Submit
                </button>
              )}
              {post.status === "pending_approval" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action(post.id, "approve")}
                  className="min-h-9 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-3 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              {post.status === "approved" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action(post.id, "schedule")}
                  className="min-h-9 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-3 text-xs font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
                >
                  Schedule
                </button>
              )}
              {["pending_approval", "approved", "scheduled"].includes(post.status) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action(post.id, "cancel")}
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              {post.status === "failed" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action(post.id, "retry")}
                  className="min-h-9 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-action-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void action(post.id, "duplicate")}
                aria-label="Duplicate post"
                className="ml-auto flex min-h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <form
            onSubmit={(event) => void create(event)}
            noValidate
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl sm:rounded-[var(--radius-card)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">New social post</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[var(--color-text-primary)]">
              Platform
              <select
                name="platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value as "facebook" | "instagram")}
                className={`${field} mt-1.5`}
              >
                <option value="facebook">Facebook Page · Text post</option>
                <option value="instagram">Instagram Professional · Image post</option>
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Target account
              <select name="accountId" className={`${field} mt-1.5`}>
                <option value="">Select an account</option>
                {connected.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.displayName}
                  </option>
                ))}
              </select>
            </label>

            {platform === "instagram" && (
              <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
                Public HTTPS JPEG image URL
                <input
                  name="mediaUrl"
                  type="url"
                  placeholder="https://images.example.com/post-photo.jpg"
                  className={`${field} mt-1.5`}
                />
              </label>
            )}

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              {platform === "instagram" ? "Caption" : "Content"}
              <textarea
                name="content"
                rows={6}
                maxLength={2200}
                placeholder="Write your update..."
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent p-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-control)]"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
              Scheduled publish time
              <input name="scheduledAt" type="datetime-local" className={`${field} mt-1.5`} />
            </label>

            <button
              type="submit"
              disabled={busy || connected.length === 0}
              className="mt-5 min-h-11 w-full rounded-[var(--radius-control)] bg-[var(--color-action-primary)] text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)] disabled:opacity-50"
            >
              {connected.length === 0 ? "Account connection required" : "Save and schedule"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
