"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Users,
  ReceiptText,
  Wallet,
  Package,
  ShoppingCart,
  FolderKanban,
  FileText,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { logoutAction } from "@/features/auth/actions/auth.action";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutGrid },
  { name: "CRM", href: "/crm", icon: Users },
  { name: "Sales", href: "/sales", icon: ReceiptText },
  { name: "Finance", href: "/finance", icon: Wallet },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Purchasing", href: "/purchasing", icon: ShoppingCart },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Administration", href: "/admin", icon: Settings },
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
}: {
  className?: string;
  user: SidebarUser;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen w-[240px] flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]",
        className
      )}
    >
      <div className="flex h-[72px] items-center px-5">
        <Link href="/" className="flex items-center">
          <img src="/anops-horizontal-logo.svg" alt="AnOps" className="h-7" />
        </Link>
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
                  className={cn(
                    "group flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-[var(--color-action-on-primary)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
                    )}
                    strokeWidth={1.8}
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
          className="group flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left hover:bg-[var(--color-bg-subtle)]"
        >
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--color-bg-subtle)] to-[var(--color-border-subtle)] flex items-center justify-center text-xs font-semibold">
              {initials(user.name)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-[var(--color-bg-surface)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.email}</p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--color-text-secondary)] transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="mt-1 space-y-0.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-1 shadow-[0_10px_40px_-10px_rgba(17,31,29,0.25)]">
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm hover:bg-[var(--color-bg-subtle)]">
              <User className="h-4 w-4" />
              Profile
            </button>
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm hover:bg-[var(--color-bg-subtle)]">
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm hover:bg-[var(--color-bg-subtle)]">
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
            <div className="my-1 h-px bg-[var(--color-border-subtle)]" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
