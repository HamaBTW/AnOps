import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: "AnOps | One platform. Every operation.",
  description: "An AI-native, modular business platform that centralizes data, supports analysis, and helps teams move work forward.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
