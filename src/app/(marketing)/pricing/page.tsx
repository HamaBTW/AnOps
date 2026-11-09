import Link from "next/link";
import type { Metadata } from "next";
import { Faq } from "@/shared/components/marketing/faq";
import { btnPrimary, btnSecondary, container } from "@/shared/components/marketing/styles";
import { AnimatedIcon } from "@/shared/components/portal/animated-icon";
import { PlanFinder } from "@/shared/components/portal/plan-finder";
import { CtaBand, PageHero, SectionHeading, delay } from "@/shared/components/portal/sections";
import { IconCheck } from "@/shared/components/ui/brand-icons";
import { comparisonRows, plans, pricingFaq } from "@/shared/config/site";
import { cn } from "@/shared/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "AnOps plans: Free (one company, one app), Standard (one company, all apps), Pro (multiple companies), Ultra (advanced AI) and Custom.",
};

const icons: Record<string, string> = {
  oneops: "wired-lineal-501-coupon-free-morph-rotate.webp",
  custom: "wired-lineal-12-layers-hover-slide.webp",
  allops: "wired-lineal-3510-flow-chart-hover-pinch.webp",
  maxops: "wired-lineal-256x256-ai-chip-hover-pinch.webp",
};

export default function PricingPage() {
  const tiers = plans;

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Unlimited users. Pay for applications, not people."
        lead="Start with one application free forever, try up to three for 15 days, then pick the plan that fits. Every plan includes unlimited users."
      />

      <section className={`${container} py-14 sm:py-20`} aria-label="Plans">
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((plan, index) => (
            <li
              key={plan.id}
              data-reveal
              style={delay(index, 70)}
              className={cn(
                "group relative flex flex-col rounded-[20px] border p-6",
                plan.highlight
                  ? "border-[var(--color-text-primary)] bg-[var(--color-bg-surface)] shadow-[0_30px_60px_-40px_rgba(17,31,29,0.6)]"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-action-primary)] px-3 py-1 text-xs font-semibold text-[#111F1D]">{plan.highlight}</span>
              )}
              <div className="flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{plan.name}</h2>
                <AnimatedIcon icon={icons[plan.id]} size={44} />
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{plan.audience}</p>
              <p className="mt-6 font-[family-name:var(--font-heading)] text-[26px] leading-tight font-semibold tracking-[-0.035em] text-[var(--color-text-primary)]">{plan.price}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{plan.priceNote}</p>
              <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-[10px] bg-[var(--color-bg-subtle)] p-3">
                  <dt className="text-xs text-[var(--color-text-secondary)]">Users</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--color-text-primary)]">Unlimited</dd>
                </div>
                <div className="rounded-[10px] bg-[var(--color-bg-subtle)] p-3">
                  <dt className="text-xs text-[var(--color-text-secondary)]">Applications</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--color-text-primary)]">{plan.applications}</dd>
                </div>
              </dl>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-[var(--color-text-primary)]">
                    <IconCheck size={12} className="mt-1 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link href={plan.cta.href} className={cn(plan.highlight || plan.id === "oneops" ? btnPrimary : btnSecondary, "w-full")}>
                  {plan.cta.label}
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
          Prices per organization, unlimited users, excluding applicable taxes. Annual billing: two months free. Need something specific?{" "}
          <Link href="/contact" className="font-semibold text-[var(--color-text-primary)] underline underline-offset-4">
            Talk to us
          </Link>
          .
        </p>
      </section>

      <section className="border-y border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/50" aria-labelledby="finder-heading">
        <div className={`${container} py-16 sm:py-24`}>
          <SectionHeading id="finder-heading" eyebrow="Plan finder" title="Not sure which plan fits?" lead="Three questions, one suggestion. You can change plans later." />
          <div className="mt-10" data-reveal style={delay(1)}>
            <PlanFinder />
          </div>
        </div>
      </section>

      <section className={`${container} py-16 sm:py-24`} aria-labelledby="compare-heading">
        <SectionHeading id="compare-heading" eyebrow="Compare" title="Every plan, side by side." />
        <div className="mt-10 overflow-x-auto rounded-[18px] border border-[var(--color-border-subtle)]" data-reveal tabIndex={0} role="region" aria-labelledby="compare-heading">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--color-bg-subtle)]">
              <tr>
                <th scope="col" className="sticky left-0 bg-[var(--color-bg-subtle)] px-5 py-4 font-semibold text-[var(--color-text-secondary)]">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th key={plan.id} scope="col" className="px-4 py-4 font-semibold text-[var(--color-text-primary)]">
                    {plan.name}
                    {plan.highlight && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--color-action-primary)]" aria-label="Recommended" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              {comparisonRows.map((row) => (
                <tr key={row.label} className="transition-colors hover:bg-[var(--color-bg-subtle)]/60">
                  <th scope="row" className="sticky left-0 bg-[var(--color-bg-surface)] px-5 py-4 font-medium text-[var(--color-text-primary)]">
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td key={i} className={cn("px-4 py-4", value === "—" ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]")}>
                      {value === "Included" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <IconCheck size={12} />
                          <span>Included</span>
                        </span>
                      ) : value === "—" ? (
                        <span>
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Not included</span>
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-[var(--color-border-subtle)]" aria-labelledby="pricing-faq-heading">
        <div className={`${container} grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div data-reveal>
            <SectionHeading id="pricing-faq-heading" eyebrow="Billing questions" title="Plans and billing, explained." />
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
              Something else? <Link href="/contact" className="font-semibold text-[var(--color-text-primary)] underline underline-offset-4">Contact us</Link>.
            </p>
          </div>
          <div data-reveal style={delay(1)}>
            <Faq items={pricingFaq} idPrefix="pricing-faq" />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
