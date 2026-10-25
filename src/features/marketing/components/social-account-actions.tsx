import Link from "next/link";

export function SocialAccountActions() {
  return <div className="mb-4 flex flex-wrap gap-2"><Link href="/api/marketing/social-accounts/facebook/start" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 py-3 text-xs font-semibold">Connect Facebook Page</Link><Link href="/api/marketing/social-accounts/instagram/start" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 py-3 text-xs font-semibold">Connect Instagram Professional</Link></div>;
}
