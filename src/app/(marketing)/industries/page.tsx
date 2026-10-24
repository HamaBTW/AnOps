import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowRight } from "@/shared/components/ui/brand-icons";
import { StatusBadge } from "@/shared/components/marketing/status-badge";
import { card, container, eyebrow, headingLg, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";
import { getApp } from "@/shared/config/catalog";
import { industries } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Industries",
  description: "How AnOps supports manufacturing, distribution and retail, professional services, and marketing teams.",
};

export default function IndustriesPage() {
  return (
    <>
      <section className={`${container} pb-8 pt-16 sm:pt-20`}>
        <p className={eyebrow}>Industries</p>
        <h1 className={`${headingXl} mt-3 max-w-3xl`}>Operations shaped by the way your business runs.</h1>
        <p className={`${lead} mt-5 max-w-2xl`}>
          Every industry has its own friction. Here is where operations usually lose time, and the apps designed to help.
        </p>
      </section>

      {industries.map((industry, index) => (
        <section
          key={industry.slug}
          id={industry.slug}
          aria-labelledby={`${industry.slug}-heading`}
          className={`${container} ${sectionY} scroll-reveal scroll-mt-24 border-t border-[var(--color-border-subtle)]`}
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div className="reveal">
              <p className={eyebrow}>{String(index + 1).padStart(2, "0")} · Industry</p>
              <h2 id={`${industry.slug}-heading`} className={`${headingLg} mt-3`}>
                {industry.name}
              </h2>
              <p className={`${lead} mt-4`}>{industry.summary}</p>
              <h3 className="mt-8 text-sm font-semibold text-[var(--color-text-primary)]">Common operational challenges</h3>
              <ul className="mt-3 space-y-2">
                {industry.challenges.map((challenge) => (
                  <li key={challenge} className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-secondary)]" />
                    {challenge}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${card} self-start p-6`}>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Recommended apps</p>
              <ul className="mt-4 divide-y divide-[var(--color-border-subtle)]">
                {industry.apps.map((slug) => {
                  const app = getApp(slug);
                  if (!app) return null;
                  return (
                    <li key={slug}>
                      <Link href={`/apps/${app.slug}`} className="group flex items-center justify-between gap-4 py-3.5">
                        <span>
                          <span className="block text-sm font-semibold text-[var(--color-text-primary)] group-hover:underline">{app.name}</span>
                          <span className="block text-xs text-[var(--color-text-secondary)]">{app.summary}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <StatusBadge status={app.status} />
                          <IconArrowRight size={14} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      ))}

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <h2 className={headingLg}>Working in another sector?</h2>
        <p className={`${lead} mt-4 max-w-2xl`}>
          AnOps is modular, so you can start with the apps that match your work. Tell us what you do and we will discuss the setup.
        </p>
        <Link href="/contact" className="mt-8 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
          Contact us
          <IconArrowRight size={14} />
        </Link>
      </section>
    </>
  );
}
