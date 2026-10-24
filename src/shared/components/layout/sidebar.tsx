"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconGrid,
  IconUsers,
  IconReceipt,
  IconWallet,
  IconPackage,
  IconShoppingCart,
  IconBarChart,
  IconDocument,
  IconNotification,
  IconSettings,
  IconChevronDown,
  IconLogOut,
  IconUser,
  IconHelpCircle,
  IconClose,
  IconProfileCard,
  IconBuilding,
} from "@/shared/components/ui/brand-icons";
import { cn } from "@/shared/lib/utils";
import { logoutAction } from "@/features/auth/actions/auth.action";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: IconGrid },
  { name: "Company", href: "/company", icon: IconBuilding },
  { name: "HR & Payroll", href: "/hr", icon: IconProfileCard },
  { name: "CRM", href: "/crm", icon: IconUsers },
  { name: "Sales", href: "/sales", icon: IconReceipt },
  { name: "Finance", href: "/finance", icon: IconWallet },
  { name: "Inventory", href: "/inventory", icon: IconPackage },
  { name: "Purchasing", href: "/purchasing", icon: IconShoppingCart },
  { name: "Projects", href: "/projects", icon: IconBarChart },
  { name: "Documents", href: "/documents", icon: IconDocument },
  { name: "Notifications", href: "/notifications", icon: IconNotification },
  { name: "Administration", href: "/admin", icon: IconSettings },
];

type SidebarUser = {
  name: string;
  email: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar({
  className,
  user,
  mobileOpen = false,
  onMobileClose,
}: {
  className?: string;
  user: SidebarUser;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [mobileOpen]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[280px] flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[240px] lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}
    >
      <div className="flex h-[72px] items-center justify-between px-4 sm:px-5">
        <Link href="/dashboard" className="flex items-center" onClick={onMobileClose}>
          {/* Light mode: dark logo; Dark mode: white logo */}
          <img
            src="/brand-kit/01-brand-identity/logos/anops-logo-horizontal-dark.svg"
            alt="AnOps"
            className="h-7 block dark:hidden"
          />
          <img
            src="/brand-kit/01-brand-identity/logos/anops-logo-horizontal-white.svg"
            alt="AnOps"
            className="h-7 hidden dark:block"
          />
        </Link>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
            aria-label="Close menu"
          >
            <IconClose size={14} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2.5 py-2">
        <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Navigation
        </div>
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2.5 min-h-[44px] text-sm transition-colors",
                    active
                      ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <item.icon
                    size={16}
                    className={cn(
                      "shrink-0",
                      active
                        ? "text-[var(--color-action-on-primary)]"
                        : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-[var(--color-border-subtle)] p-2">
        <button
          onClick={() => setOpen(!open)}
          className="group flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2.5 min-h-[44px] text-left hover:bg-[var(--color-bg-subtle)]"
        >
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--color-bg-subtle)] to-[var(--color-border-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-primary)]">
              {initials(user.name)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-[var(--color-bg-surface)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{user.name}</p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.email}</p>
          </div>
          <IconChevronDown
            size={14}
            className={cn(
              "text-[var(--color-text-secondary)] transition-transform shrink-0",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="mt-1 space-y-0.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-1 shadow-[0_10px_40px_-10px_rgba(17,31,29,0.25)]">
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 min-h-[44px] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]">
              <IconProfileCard size={16} className="text-[var(--color-text-secondary)]" />
              Profile
            </button>
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 min-h-[44px] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]">
              <IconSettings size={16} className="text-[var(--color-text-secondary)]" />
              Settings
            </button>
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 min-h-[44px] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]">
              <IconHelpCircle size={16} className="text-[var(--color-text-secondary)]" />
              Help
            </button>
            <div className="my-1 h-px bg-[var(--color-border-subtle)]" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 min-h-[44px] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <IconLogOut size={16} className="text-[var(--color-text-secondary)]" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
