"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Filter,
  Mail,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  CheckCircle,
} from "lucide-react";
import type { MarketingAnalytics, MarketingCampaign, SocialPost } from "@/features/marketing/types";

type Props = {
  initialAnalytics: MarketingAnalytics;
  initialCampaigns: MarketingCampaign[];
  initialPosts: SocialPost[];
};

export function MarketingDashboard({ initialAnalytics, initialCampaigns, initialPosts }: Props) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const filteredCampaigns = useMemo(() => {
    return initialCampaigns.filter((campaign) => {
      const matchesSearch = campaign.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = activeFilter === "All" || campaign.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [initialCampaigns, query, activeFilter]);

  const upcomingPosts = useMemo(() => {
    return initialPosts.slice(0, 5);
  }, [initialPosts]);

  return (
    <div className="space-y-6 sm:space-y-8 reveal">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Marketing & Socials
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-action-primary)]/20 px-2.5 py-1 text-xs font-bold text-[var(--color-text-primary)]">
              <Sparkles className="h-3 w-3" /> Growth workspace
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Persisted campaigns, consent-governed contacts, and verified content in one calm workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/marketing/social"
            className="flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <CalendarDays className="h-4 w-4" /> Content calendar
          </Link>
          <Link
            href="/marketing/campaigns"
            className="flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"
          >
            <Plus className="h-4 w-4" /> New campaign
          </Link>
        </div>
      </header>

      <nav
        aria-label="Marketing sections"
        className="flex gap-1 overflow-x-auto border-b border-[var(--color-border-subtle)] pb-1"
      >
        {[
          { label: "Overview", href: "/marketing" },
          { label: "Contacts", href: "/marketing/contacts" },
          { label: "Audiences", href: "/marketing/audiences" },
          { label: "Campaigns", href: "/marketing/campaigns" },
          { label: "Templates", href: "/marketing/templates" },
          { label: "Social planner", href: "/marketing/social" },
          { label: "AI Copywriter", href: "/marketing/ai-copywriter" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`min-h-10 shrink-0 rounded-t-[var(--radius-control)] px-3 py-2 text-sm font-semibold ${
              item.href === "/marketing"
                ? "border-b-2 border-[var(--color-action-primary)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Real KPI Cards derived from database */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Marketing overview">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">Total Contacts</p>
            <Users className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
            {initialAnalytics.contacts.total}
          </p>
          <p className="mt-1 text-xs text-[var(--color-status-success)]">
            {initialAnalytics.contacts.active} active in workspace
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">Email Eligible</p>
            <Mail className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
            {initialAnalytics.audiences.totalEligibleEmail}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Granted consent</p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">Total Campaigns</p>
            <Send className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
            {initialAnalytics.campaigns.total}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {initialAnalytics.campaigns.byStatus.approved ?? 0} approved /{" "}
            {initialAnalytics.campaigns.byStatus.draft ?? 0} drafts
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">Social Accounts</p>
            <CheckCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
            {initialAnalytics.social.accountsConnected}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {initialPosts.length} posts scheduled/drafted
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        {/* Campaign performance */}
        <section className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Campaign overview</h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Real lifecycle state and recipient counts.
              </p>
            </div>
            <Link
              href="/marketing/campaigns"
              className="flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
            >
              <Filter className="h-3.5 w-3.5" /> All campaigns <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search campaigns"
                className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-border-control)]"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Campaign status">
              {["All", "draft", "pending_approval", "approved", "scheduled", "running", "completed"].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveFilter(status)}
                    className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold capitalize ${
                      activeFilter === status
                        ? "bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/45 text-xs text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Campaign</th>
                  <th className="px-3 py-3 font-medium">Channel</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Snapshot</th>
                  <th className="px-3 py-3 font-medium">Scheduled</th>
                  <th className="px-3 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[var(--color-bg-subtle)]/40">
                    <td className="px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${
                            camp.channel === "email" ? "bg-[#e8f0ff] text-[#3865b7]" : "bg-[#fff0d9] text-[#a56a18]"
                          }`}
                        >
                          {camp.channel === "email" ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <MessageSquareText className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <Link href={`/marketing/campaigns/${camp.id}`} className="font-semibold text-[var(--color-text-primary)] hover:underline">
                            {camp.name}
                          </Link>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {camp.subject || camp.body.slice(0, 50)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 uppercase text-xs text-[var(--color-text-secondary)]">{camp.channel}</td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-semibold capitalize">
                        {camp.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-[var(--color-text-secondary)]">
                      {camp.snapshot ? `${camp.snapshot.recipientCount} recipients` : "Pending approval"}
                    </td>
                    <td className="px-3 py-4 text-xs text-[var(--color-text-secondary)]">
                      {camp.scheduledAt ? new Date(camp.scheduledAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/marketing/campaigns/${camp.id}`}
                        className="text-xs font-semibold text-[var(--color-action-primary)] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCampaigns.length === 0 && (
            <p className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
              No campaigns found. Create your first campaign to get started.
            </p>
          )}
        </section>

        {/* Content calendar / upcoming posts */}
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Upcoming content</h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Scheduled social posts in this company.</p>
            </div>
            <Link
              href="/marketing/social"
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              aria-label="Open content calendar"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingPosts.map((post) => (
              <div
                key={post.id}
                className="flex gap-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3"
              >
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]">
                  <span className="text-xs font-bold uppercase">{post.platform.slice(0, 3)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{post.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span className="capitalize">{post.status.replace("_", " ")}</span> ·{" "}
                    {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "Unscheduled"}
                  </div>
                </div>
              </div>
            ))}
            {upcomingPosts.length === 0 && (
              <p className="p-4 text-center text-xs text-[var(--color-text-secondary)]">
                No social posts scheduled yet.
              </p>
            )}
          </div>

          <Link
            href="/marketing/social"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <Plus className="h-4 w-4" /> Plan a post
          </Link>
        </section>
      </div>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)]">
              <Sparkles className="h-5 w-5 text-[var(--color-action-on-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">AI copy assistant</h2>
              <p className="mt-0.5 max-w-2xl text-sm text-[var(--color-text-secondary)]">
                Generate channel-ready marketing drafts using your brand voice and target audience. All generations remain editable drafts until approved.
              </p>
            </div>
          </div>
          <Link
            href="/marketing/ai-copywriter"
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)]"
          >
            <Sparkles className="h-4 w-4" /> Open AI copywriter
          </Link>
        </div>
      </section>
    </div>
  );
}
