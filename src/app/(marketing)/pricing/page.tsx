import Link from "next/link";
import type { Metadata } from "next";
import { IconCheck } from "@/shared/components/ui/brand-icons";
import { Faq } from "@/shared/components/marketing/faq";
import { btnPrimary, btnSecondary, card, container, eyebrow, headingLg, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";
import { comparisonRows, faqItems, plans } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare AnOps plans: One App (Free), Standard (all apps) and Custom (multi-company and advanced AI). Pricing to be announced.",
};

export default function PricingPage() {
  return (
    <>
      <section className={`${container} pb-8 pt-16 sm:pt-20`}>
        <p className={eyebrow}>Pricing</p>
        <h1 className={`${headingXl} mt-3 max-w-3xl`}>Start with one app. Scale to every operation.</h1>
        <p className={`${lead} mt-5 max-w-2xl`}>
          Three plans, one platform. Standard pricing is to be announced, and Custom plans are quoted after a conversation.
        </p>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal`} aria-label="Plans">
        <ul className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={`${card} reveal flex flex-col p-7 ${plan.highlight ? "border-[var(--color-border-control)] shadow-[0_12px_40px_-14px_rgba(17,31,29,0.22)] lg:-my-3" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{plan.name}</h2>
                {plan.highlight && (
                  <span className="rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--color-action-on-primary)]">
                    Most complete
                  </span>
                )}
              </div>
              <p className="mt-5 text-2xl font-semibold text-[var(--color-text-primary)]">{plan.price}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{plan.priceNote}</p>
              <p className="mt-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[var(--color-text-primary)]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
                      <IconCheck size={11} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link href={plan.cta.href} className={plan.highlight ? btnPrimary : btnSecondary}>
                  {plan.cta.label}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${container} ${sectionY} border-t border-[var(--color-border-subtle)]`} aria-labelledby="compare-heading">
        <h2 id="compare-heading" className={headingLg}>
          Compare plans
        </h2>
        <div className="mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Feature comparison of the One App, Standard and Custom plans</caption>
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th scope="col" className="px-5 py-4 font-semibold text-[var(--color-text-primary)]">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th key={plan.name} scope="col" className="px-5 py-4 font-semibold text-[var(--color-text-primary)]">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <th scope="row" className="px-5 py-4 font-medium text-[var(--color-text-primary)]">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={`${row.label}-${plans[index].name}`} className="px-5 py-4 text-[var(--color-text-secondary)]">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          AI features are in progress. Planned capabilities are labeled as planned and are not yet available.
        </p>
      </section>

      <section className={`${container} ${sectionY} border-t border-[var(--color-border-subtle)]`} aria-labelledby="pricing-faq-heading">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="pricing-faq-heading" className={headingLg}>
              Pricing questions
            </h2>
            <p className={`${lead} mt-4`}>
              Still unsure? <Link href="/contact" className="font-semibold text-[var(--color-text-primary)] underline underline-offset-4">Contact us</Link>.
            </p>
          </div>
          <Faq items={faqItems} idPrefix="pricing-faq" />
        </div>
      </section>
    </>
  );
}
