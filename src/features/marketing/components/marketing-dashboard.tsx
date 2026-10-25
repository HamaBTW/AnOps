"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Filter,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

type CampaignStatus = "Live" | "Scheduled" | "Draft";
type Campaign = { name: string; channel: "Email" | "SMS"; audience: string; status: CampaignStatus; sent: string; open: string; clicks: string };

const campaigns: Campaign[] = [
  { name: "October product drop", channel: "Email", audience: "Returning customers", status: "Live", sent: "2,480", open: "42.8%", clicks: "8.4%" },
  { name: "Weekend offer", channel: "SMS", audience: "VIP customers", status: "Scheduled", sent: "680", open: "—", clicks: "—" },
  { name: "Welcome series · 01", channel: "Email", audience: "New subscribers", status: "Draft", sent: "—", open: "—", clicks: "—" },
];

const posts = [
  { day: "18", month: "OCT", title: "Behind the scenes: our new collection", platform: "Instagram", time: "10:30", color: "#e9b949" },
  { day: "21", month: "OCT", title: "3 ways to simplify your workflow", platform: "LinkedIn", time: "09:00", color: "#5b83d8" },
  { day: "24", month: "OCT", title: "Your weekend starts here ✨", platform: "Instagram", time: "18:00", color: "#d479b0" },
];

const statusStyles: Record<CampaignStatus, string> = {
  Live: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]",
  Scheduled: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  Draft: "bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)]",
};

export function MarketingDashboard() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CampaignStatus | "All">("All");
  const filteredCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.name.toLowerCase().includes(query.toLowerCase()) && (activeFilter === "All" || campaign.status === activeFilter)),
    [activeFilter, query],
  );

  return (
    <div className="space-y-6 sm:space-y-8 reveal">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">Marketing & Socials</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-action-primary)]/20 px-2.5 py-1 text-xs font-bold text-[var(--color-text-primary)]"><Sparkles className="h-3 w-3" /> Growth workspace</span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Campaigns, content, and customer relationships in one calm workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"><CalendarDays className="h-4 w-4" /> Content calendar</button>
          <button type="button" className="flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 text-sm font-bold text-[var(--color-action-on-primary)] hover:bg-[var(--color-action-hover)]"><Plus className="h-4 w-4" /> New campaign</button>
        </div>
      </header>

      <nav aria-label="Marketing sections" className="flex gap-1 overflow-x-auto border-b border-[var(--color-border-subtle)] pb-1">
        {[{ label: "Overview", href: "/marketing" }, { label: "Contacts", href: "/marketing/contacts" }, { label: "Audiences", href: "/marketing/audiences" }, { label: "Campaigns", href: "/marketing/campaigns" }, { label: "Templates", href: "/marketing/templates" }, { label: "Social planner", href: "/marketing/social" }, { label: "AI Copywriter", href: "/marketing/ai-copywriter" }].map((item) => (
          <Link key={item.href} href={item.href} className={`min-h-10 shrink-0 rounded-t-[var(--radius-control)] px-3 py-2 text-sm font-semibold ${item.href === "/marketing" ? "border-b-2 border-[var(--color-action-primary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"}`}>{item.label}</Link>
        ))}
      </nav>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Marketing overview">
        {[{ label: "Active campaigns", value: "4", detail: "+1 this month", icon: Send }, { label: "Reach this month", value: "18.4k", detail: "+12.6% vs Sep", icon: Users }, { label: "Avg. open rate", value: "38.6%", detail: "+4.2% vs Sep", icon: Mail }, { label: "Qualified leads", value: "126", detail: "+18 this month", icon: ArrowUpRight }].map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
            <div className="flex items-center justify-between"><p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">{label}</p><Icon className="h-4 w-4 text-[var(--color-text-secondary)]" /></div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">{value}</p>
            <p className="mt-1 text-xs text-[var(--color-status-success)]">{detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><h2 className="text-lg font-bold text-[var(--color-text-primary)]">Campaign performance</h2><p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Track delivery and engagement at a glance.</p></div>
            <button type="button" className="flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"><Filter className="h-3.5 w-3.5" /> Filter <ChevronDown className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="relative min-w-0 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search campaigns" className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-transparent pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-border-control)]" /></div>
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Campaign status"><span className="sr-only">Campaign status</span>{(["All", "Live", "Scheduled", "Draft"] as const).map((status) => <button key={status} type="button" onClick={() => setActiveFilter(status)} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${activeFilter === status ? "bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"}`}>{status}</button>)}</div>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-y border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/45 text-xs text-[var(--color-text-secondary)]"><tr><th className="px-4 py-3 font-medium sm:px-5">Campaign</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Sent</th><th className="px-3 py-3 font-medium">Open rate</th><th className="px-3 py-3 font-medium">Clicks</th><th className="px-3 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-[var(--color-border-subtle)]">{filteredCampaigns.map((campaign) => <tr key={campaign.name} className="hover:bg-[var(--color-bg-subtle)]/40"><td className="px-4 py-4 sm:px-5"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${campaign.channel === "Email" ? "bg-[#e8f0ff] text-[#3865b7]" : "bg-[#fff0d9] text-[#a56a18]"}`}>{campaign.channel === "Email" ? <Mail className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}</span><div><p className="font-semibold text-[var(--color-text-primary)]">{campaign.name}</p><p className="text-xs text-[var(--color-text-secondary)]">{campaign.channel} · {campaign.audience}</p></div></div></td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[campaign.status]}`}>{campaign.status}</span></td><td className="px-3 py-4 numeric text-[var(--color-text-primary)]">{campaign.sent}</td><td className="px-3 py-4 numeric text-[var(--color-text-primary)]">{campaign.open}</td><td className="px-3 py-4 numeric text-[var(--color-text-primary)]">{campaign.clicks}</td><td className="px-3 py-4"><button type="button" aria-label={`More actions for ${campaign.name}`} className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
          {filteredCampaigns.length === 0 && <p className="p-8 text-center text-sm text-[var(--color-text-secondary)]">No campaigns match these filters.</p>}
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[var(--color-text-primary)]">Upcoming content</h2><p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Your next scheduled posts.</p></div><button type="button" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]" aria-label="Open content calendar"><ArrowUpRight className="h-4 w-4" /></button></div><div className="mt-5 space-y-3">{posts.map((post) => <div key={post.title} className="flex gap-3 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3"><div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]"><span className="text-base font-bold leading-none text-[var(--color-text-primary)]">{post.day}</span><span className="mt-1 text-[9px] font-bold tracking-wider text-[var(--color-text-secondary)]">{post.month}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{post.title}</p><div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: post.color }} />{post.platform} · {post.time}</div></div></div>)}</div><button type="button" className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"><Plus className="h-4 w-4" /> Plan a post</button></section>
      </div>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)]"><Sparkles className="h-5 w-5 text-[var(--color-action-on-primary)]" /></div><div><h2 className="text-lg font-bold text-[var(--color-text-primary)]">AI copy assistant</h2><p className="mt-0.5 max-w-2xl text-sm text-[var(--color-text-secondary)]">Generate channel-ready copy with your brand voice, audience, and campaign context.</p></div></div><button type="button" disabled className="flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-4 text-sm font-semibold text-[var(--color-text-secondary)]" title="AI provider connection required"><CircleAlert className="h-4 w-4" /> Connect AI provider</button></div></section>
    </div>
  );
}
