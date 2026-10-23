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
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-canvas)]">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-8 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
