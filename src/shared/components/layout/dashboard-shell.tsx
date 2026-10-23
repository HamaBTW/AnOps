"use client";

import { useState } from "react";
import { Sidebar } from "@/shared/components/layout/sidebar";
import { Topbar } from "@/shared/components/layout/topbar";

type ShellUser = {
  name: string;
  email: string;
};

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--color-bg-canvas)]">
      <Sidebar
        user={user}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
