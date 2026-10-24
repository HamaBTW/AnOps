import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowRight } from "@/shared/components/ui/brand-icons";
import { Faq } from "@/shared/components/marketing/faq";
import { card, container, eyebrow, headingLg, headingXl, lead, sectionY, btnPrimary } from "@/shared/components/marketing/styles";
import { faqItems, gettingStarted } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Help",
  description: "Get help with AnOps: contact us, frequently asked questions, getting started and documentation.",
};

const docTopics = ["Setting up your workspace", "Roles and access", "Working with records across apps", "Reviewing AI suggestions"];

export default function HelpPage() {
  return (
    <>
      <section className={`${container} pb-8 pt-16 sm:pt-20`}>
        <p className={eyebrow}>Help center</p>
        <h1 className={`${headingXl} mt-3 max-w-3xl`}>How can we help?</h1>
        <p className={`${lead} mt-5 max-w-2xl`}>Start with the basics, look up common questions, or reach out directly.</p>
        <Link href="/contact" className={`${btnPrimary} mt-8`}>
          Contact us
        </Link>
      </section>

      <section id="getting-started" className={`${container} ${sectionY} scroll-reveal scroll-mt-24 border-t border-[var(--color-border-subtle)]`} aria-labelledby="getting-started-heading">
        <p className={eyebrow}>Getting started</p>
        <h2 id="getting-started-heading" className={`${headingLg} mt-3`}>Three steps to your first conversation.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {gettingStarted.map((item, index) => (
            <li key={item.step}>
              <Link href={item.href} className={`${card} group flex h-full flex-col gap-3 p-6 lift hover:border-[var(--color-border-control)]`}>
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Step {index + 1}</span>
                <span className="text-lg font-semibold text-[var(--color-text-primary)]">{item.step}</span>
                <span className="text-sm text-[var(--color-text-secondary)]">{item.detail}</span>
                <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  Open
                  <IconArrowRight size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className={`${container} ${sectionY} scroll-reveal scroll-mt-24 border-t border-[var(--color-border-subtle)]`} aria-labelledby="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className={eyebrow}>FAQ</p>
            <h2 id="faq-heading" className={`${headingLg} mt-3`}>Frequently asked questions</h2>
          </div>
          <Faq items={faqItems} idPrefix="help-faq" />
        </div>
      </section>

      <section id="documentation" className={`${container} ${sectionY} scroll-reveal scroll-mt-24 border-t border-[var(--color-border-subtle)]`} aria-labelledby="docs-heading">
        <p className={eyebrow}>Documentation</p>
        <h2 id="docs-heading" className={`${headingLg} mt-3`}>Guides are being prepared.</h2>
        <p className={`${lead} mt-4 max-w-2xl`}>
          Detailed documentation is not published yet. These are the guides planned for release:
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {docTopics.map((topic) => (
            <li key={topic} className={`${card} flex items-center justify-between gap-3 px-5 py-4 text-sm text-[var(--color-text-primary)]`}>
              {topic}
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-neutral-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-status-neutral)]">
                To be published
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
