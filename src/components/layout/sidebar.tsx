"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Wallet,
  Package,
  ShoppingCart,
  FileText,
  KanbanSquare,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "CRM", href: "/crm", icon: Users },
  { name: "Sales", href: "/sales", icon: ReceiptText },
  { name: "Finance", href: "/finance", icon: Wallet },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Purchasing", href: "/purchasing", icon: ShoppingCart },
  { name: "HR", href: "/hr", icon: Users },
  { name: "Projects", href: "/projects", icon: KanbanSquare },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Administration", href: "/admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[224px] flex-col bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)]">
      <div className="flex h-[72px] items-center px-6 border-b border-[var(--color-border-subtle)]">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/anops-horizontal-logo.svg"
            alt="AnOps"
            className="h-8"
          />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-control)] text-sm transition-colors",
                    isActive
                      ? "bg-[var(--color-action-primary)] text-[var(--color-action-on-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.7} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-[var(--color-border-subtle)] p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center">
            <span className="text-xs font-medium">AU</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">Operations</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
