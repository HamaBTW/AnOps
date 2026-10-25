"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Users,
  Settings,
  Shield,
  Plus,
  Check,
  Briefcase,
  Layers,
  Copy,
  CheckCheck,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Company, CompanyMember, CompanyRole } from "@/features/company/types";
import {
  updateCompanyAction,
  addCompanyMemberAction,
  updateCompanyMemberRoleAction,
  removeCompanyMemberAction,
  switchCompanyAction,
} from "@/features/company/actions/company.action";
import { CreateCompanyModal } from "@/features/company/components/create-company-modal";
import { useRouter } from "next/navigation";

type CompanyManagementClientProps = {
  currentCompany: Company;
  userRole: CompanyRole;
  currentUserId: string;
  initialMembers: CompanyMember[];
  userCompanies: Company[];
  stats: {
    membersCount: number;
    employeesCount: number;
    departmentsCount: number;
    jobTitlesCount: number;
  };
};

const INDUSTRIES = [
  "Information Technology",
  "Software & SaaS",
  "Manufacturing & Production",
  "Retail & E-commerce",
  "Finance & Accounting",
  "Healthcare & Pharma",
  "Consulting & Professional Services",
  "Education & Training",
  "Construction & Real Estate",
  "Other",
];

const CURRENCIES = [
  { code: "TND", label: "TND — Tunisian Dinar" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
];

export function CompanyManagementClient({
  currentCompany,
  userRole,
  currentUserId,
  initialMembers,
  userCompanies,
  stats,
}: CompanyManagementClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "members" | "organizations">("general");

  // General Settings state
  const [name, setName] = useState(currentCompany.name);
  const [industry, setIndustry] = useState(currentCompany.industry || INDUSTRIES[0]);
  const [currency, setCurrency] = useState(currentCompany.currency || "TND");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<CompanyMember[]>(initialMembers);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "employee">("employee");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [tempPasswordAlert, setTempPasswordAlert] = useState<{ email: string; pass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Create Organization modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await updateCompanyAction(currentCompany.id, {
        name,
        industry,
        currency,
      });

      if (res.error) {
        setSaveError(res.error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    startTransition(async () => {
      const res = await addCompanyMemberAction(currentCompany.id, {
        email: inviteEmail,
        fullName: inviteName || undefined,
        role: inviteRole,
      });

      if (res.error) {
        setInviteError(res.error);
      } else if (res.data) {
        setMembers((prev) => [...prev, res.data!.member]);
        if (res.data.tempPassword) {
          setTempPasswordAlert({ email: inviteEmail, pass: res.data.tempPassword });
        }
        setInviteEmail("");
        setInviteName("");
        setInviteRole("employee");
        setAddModalOpen(false);
      }
    });
  };

  const handleRoleChange = (memberId: string, newRole: "admin" | "manager" | "employee") => {
    startTransition(async () => {
      const res = await updateCompanyMemberRoleAction(currentCompany.id, memberId, { role: newRole });
      if (res.data) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? res.data! : m)));
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleRemoveMember = (member: CompanyMember) => {
    if (!confirm(`Are you sure you want to remove ${member.userName || member.userEmail} from this company?`)) {
      return;
    }

    startTransition(async () => {
      const res = await removeCompanyMemberAction(currentCompany.id, member.id);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleSwitchCompany = (targetId: string) => {
    startTransition(async () => {
      const res = await switchCompanyAction(targetId);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const copyTempPassword = () => {
    if (!tempPasswordAlert) return;
    navigator.clipboard.writeText(tempPasswordAlert.pass);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const roleBadgeColor: Record<CompanyRole, string> = {
    owner: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    admin: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    manager: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    employee: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-action-primary)]/25 text-[var(--color-text-primary)]">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                  {currentCompany.name}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    roleBadgeColor[userRole]
                  }`}
                >
                  {userRole}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Organization Slug: <code className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">{currentCompany.slug}</code> • Currency: <strong>{currentCompany.currency}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Organization
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-t border-[var(--color-border-subtle)] pt-6">
          <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
              <Users className="h-4 w-4 text-[var(--color-text-primary)]" />
              Team Members
            </div>
            <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">{stats.membersCount}</p>
          </div>

          <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              Staff Directory
            </div>
            <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">{stats.employeesCount}</p>
          </div>

          <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
              <Layers className="h-4 w-4 text-blue-500" />
              Departments
            </div>
            <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">{stats.departmentsCount}</p>
          </div>

          <div className="rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]/50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
              <Shield className="h-4 w-4 text-purple-500" />
              Job Titles
            </div>
            <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">{stats.jobTitlesCount}</p>
          </div>
        </div>
      </div>

      {/* Temp Password Banner (shown after auto-provisioning a member) */}
      {tempPasswordAlert && (
        <div className="rounded-[var(--radius-card)] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">New Account Provisioned for {tempPasswordAlert.email}</p>
                <p className="mt-1 text-xs opacity-90">
                  Since this user did not have an existing AnOps account, we generated a temporary password. Copy and securely share it with them:
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <code className="rounded bg-amber-500/20 px-3 py-1 font-mono text-sm font-bold tracking-wider">
                    {tempPasswordAlert.pass}
                  </code>
                  <button
                    type="button"
                    onClick={copyTempPassword}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-amber-600 px-3 py-1 text-xs font-semibold text-[var(--color-action-on-primary)] hover:bg-amber-700 transition-colors"
                  >
                    {copiedPass ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedPass ? "Copied" : "Copy Password"}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTempPasswordAlert(null)}
              className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-[var(--color-action-on-primary)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-[var(--color-border-subtle)] px-1 pb-2 sm:gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "general"}
          onClick={() => setActiveTab("general")}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
            activeTab === "general"
              ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Settings className="h-4 w-4" />
          General Settings
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "members"}
          onClick={() => setActiveTab("members")}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
            activeTab === "members"
              ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Users className="h-4 w-4" />
          Team & Members ({members.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "organizations"}
          onClick={() => setActiveTab("organizations")}
          className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
            activeTab === "organizations"
              ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Building2 className="h-4 w-4" />
          My Organizations ({userCompanies.length})
        </button>
      </div>

      {/* TAB 1: General Settings */}
      {activeTab === "general" && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Company Details</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Update organization identification, primary industry, and baseline currency.
            </p>

            <form onSubmit={handleUpdateCompany} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwnerOrAdmin || isPending}
                  required
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    disabled={!isOwnerOrAdmin || isPending}
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-60"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                    Base Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!isOwnerOrAdmin || isPending}
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-60"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                  Tenant Unique Slug (Read-only)
                </label>
                <input
                  type="text"
                  value={currentCompany.slug}
                  disabled
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)] opacity-75 font-mono cursor-not-allowed"
                />
              </div>

              {saveError && (
                <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  Company details updated successfully.
                </div>
              )}

              {isOwnerOrAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-action-on-primary)] shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      "Save Company Settings"
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Members Management */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Company Members</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Manage team members, roles, and administrative privileges for this organization.
              </p>
            </div>

            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-action-on-primary)] shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            )}
          </div>

          {/* Mobile: one card per member. Table below is shown from md upward. */}
          <ul className="space-y-3 md:hidden" aria-label="Team members">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const isOwner = member.role === "owner";
              return (
                <li key={member.id} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--color-text-primary)]">
                        {member.userName || "Team Member"} {isSelf && <span className="text-xs font-normal text-[var(--color-text-secondary)]">(You)</span>}
                      </div>
                      <div className="truncate text-xs text-[var(--color-text-secondary)]">{member.userEmail}</div>
                    </div>
                    {isOwnerOrAdmin && !isOwner && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={isPending}
                        aria-label={`Remove ${member.userName || "member"} from company`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {isOwnerOrAdmin && !isOwner && !isSelf ? (
                      <select
                        aria-label={`Role for ${member.userName || "member"}`}
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as "admin" | "manager" | "employee")}
                        disabled={isPending}
                        className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3 text-sm font-semibold capitalize text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${roleBadgeColor[member.role]}`}>
                        {member.role}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {member.status}
                    </span>
                    <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
                      Joined {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/40 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">User</th>
                    <th className="px-6 py-3.5 font-semibold">Role</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold">Joined</th>
                    {isOwnerOrAdmin && <th className="px-6 py-3.5 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {members.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const isOwner = member.role === "owner";

                    return (
                      <tr key={member.id} className="hover:bg-[var(--color-bg-subtle)]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[var(--color-text-primary)]">
                            {member.userName || "Team Member"} {isSelf && <span className="text-xs text-[var(--color-text-primary)] font-normal">(You)</span>}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">{member.userEmail}</div>
                        </td>

                        <td className="px-6 py-4">
                          {isOwnerOrAdmin && !isOwner && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as "admin" | "manager" | "employee")}
                              disabled={isPending}
                              className="rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-focus-ring)]"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="employee">Employee</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                roleBadgeColor[member.role]
                              }`}
                            >
                              {member.role}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {member.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">
                          {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                        </td>

                        {isOwnerOrAdmin && (
                          <td className="px-6 py-4 text-right">
                            {!isOwner && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                disabled={isPending}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Remove member from company"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: My Organizations */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Your Organizations</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Switch between different companies you manage or belong to.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-action-on-primary)] shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userCompanies.map((comp) => {
              const isActive = comp.id === currentCompany.id;

              return (
                <div
                  key={comp.id}
                  className={`relative rounded-[var(--radius-card)] border p-5 shadow-sm transition-all ${
                    isActive
                      ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)]/10"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-control)]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] ${
                          isActive
                            ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]"
                            : "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--color-text-primary)]">{comp.name}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)] font-mono">{comp.slug}</p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-action-primary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-action-on-primary)]">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-xs text-[var(--color-text-secondary)]">
                    <span>Currency: {comp.currency}</span>
                    <span>Industry: {comp.industry || "General"}</span>
                  </div>

                  <div className="mt-4">
                    {isActive ? (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] cursor-default"
                      >
                        Currently Active
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchCompany(comp.id)}
                        disabled={isPending}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-surface)] py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                      >
                        Switch to this company
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-xl sm:p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Add Team Member</h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Add an existing user or auto-provision an account to this organization.
            </p>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Company Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "manager" | "employee")}
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border-control)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                >
                  <option value="employee">Employee (Standard Access)</option>
                  <option value="manager">Manager (Leave & Team Approvals)</option>
                  <option value="admin">Admin (Full HR & Settings Access)</option>
                </select>
              </div>

              {inviteError && (
                <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {inviteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-[var(--radius-control)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-action-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-action-on-primary)] shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Company Modal */}
      <CreateCompanyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
