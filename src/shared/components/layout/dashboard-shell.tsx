"use client";

import { useEffect, useState } from "react";
import { useScrollLock } from "@/shared/hooks/use-scroll-lock";
import { Sidebar } from "@/shared/components/layout/sidebar";
import { Topbar } from "@/shared/components/layout/topbar";

import type { Company } from "@/features/company/types";

type ShellUser = {
  name: string;
  email: string;
};

export function DashboardShell({
  children,
  user,
  companies = [],
  activeCompanyId,
}: {
  children: React.ReactNode;
  user: ShellUser;
  companies?: Company[];
  activeCompanyId?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // While the mobile drawer is open, the page behind it must not scroll, and Escape closes it.
  useScrollLock(sidebarOpen);
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[var(--color-bg-canvas)] print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:block">
      <Sidebar
        user={user}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block">
        <Topbar
          className="print:hidden"
          onMenuClick={() => setSidebarOpen(true)}
          companies={companies}
          activeCompanyId={activeCompanyId}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain print:h-auto print:min-h-0 print:overflow-visible print:p-0 print:m-0 print:block">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 print:max-w-none print:w-full print:p-0 print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
