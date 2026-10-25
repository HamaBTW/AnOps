"use client";

import { useEffect, useState } from "react";
import { IconChevronDown } from "@/shared/components/ui/brand-icons";

type Company = { id: string; name: string; role: string; status: string };

export function CompanySwitcher() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/companies/active", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to load workspaces.");
      return response.json() as Promise<{ companies: Company[]; activeCompanyId: string | null }>;
    }).then((data) => {
      if (!cancelled) { setCompanies(data.companies); setActiveId(data.activeCompanyId ?? ""); }
    }).catch(() => { if (!cancelled) setError("Workspaces unavailable"); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function select(companyId: string) {
    if (!companyId || companyId === activeId) return;
    setSwitching(true); setError("");
    const response = await fetch("/api/companies/active", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
    if (!response.ok) { setError("Company switch was not authorized."); setSwitching(false); return; }
    setActiveId(companyId);
    window.location.reload();
  }

  const active = companies.find((company) => company.id === activeId);
  return <div className="relative min-w-0 max-w-[230px]">
    <label className="sr-only" htmlFor="company-switcher">Active company</label>
    <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-[var(--color-text-secondary)]">Workspace</span>
        <select id="company-switcher" value={activeId} disabled={loading || switching || companies.length < 1} onChange={(event) => void select(event.target.value)} className="block h-7 w-full min-w-0 appearance-none truncate bg-transparent pr-4 text-sm font-semibold text-[var(--color-text-primary)] outline-none">
          {!active && <option value="">{loading ? "Loading…" : companies.length ? "Select company" : "No companies"}</option>}
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </span>
      <IconChevronDown size={14} className="pointer-events-none shrink-0 text-[var(--color-text-secondary)]" />
    </div>
    {error && <p role="alert" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-[var(--radius-control)] border border-[var(--color-status-error)]/30 bg-[var(--color-bg-surface)] p-2 text-xs text-[var(--color-status-error)]">{error}</p>}
  </div>;
}
