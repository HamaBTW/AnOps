import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowRight, IconCheck } from "@/shared/components/ui/brand-icons";
import { Faq } from "@/shared/components/marketing/faq";
import { btnPrimary, btnSecondary, container } from "@/shared/components/marketing/styles";
import { AnimatedIcon } from "@/shared/components/portal/animated-icon";
import { CommandDemo } from "@/shared/components/portal/command-demo";
import { EcosystemMap } from "@/shared/components/portal/ecosystem-map";
import { ProductTour } from "@/shared/components/portal/product-tour";
import { CtaBand, Eyebrow, SectionHeading, TextLink, delay, display } from "@/shared/components/portal/sections";
import { aiUseCases, apps, getApp } from "@/shared/config/catalog";
import { industries } from "@/shared/config/industries";
import { faqItems, plans, siteDescription } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "AnOps | One platform. Every operation.",
  description: siteDescription,
  openGraph: {
    title: "AnOps | One platform. Every operation.",
    description: siteDescription,
    type: "website",
  },
};

const journey = [
  { app: "purchasing", verb: "Order", detail: "A purchase order is approved for a supplier." },
  { app: "inventory", verb: "Receive", detail: "Posting the receipt adds stock to the ledger." },
  { app: "manufacturing", verb: "Produce", detail: "Completing a work order consumes components." },
  { app: "finance", verb: "Invoice", detail: "The customer is invoiced and the payment allocated." },
  { app: "ai", verb: "Ask", detail: "Anyone authorized can ask about any of it." },
];

const principles = [
  { title: "The model proposes. You decide.", body: "AI reads and drafts. Every write is shown as a summary and runs only after a person confirms it." },
  { title: "Never more than your role allows.", body: "AI access is a subset of each person's permissions, set by the owner per module and operation." },
  { title: "Private by default.", body: "Conversations belong to the employee. Auditing them needs an explicit, logged permission." },
  { title: "Bounded and measured.", body: "Token budgets per person and per company, and a kill switch that stops AI instantly." },
];

const trust = [
  { icon: "wired-lineal-1004-avatars-settings-hover-smooth.webp", title: "Permissions on the server", body: "Every service checks the permission it needs. A hidden button is never the only control." },
  { icon: "wired-lineal-3308-building-office-in-reveal.webp", title: "Isolated companies", body: "Each company is its own workspace. Data never crosses from one company to another." },
  { icon: "wired-lineal-755-receipt-dollar-hover-pinch.webp", title: "Exact numbers", body: "Money is computed in whole cents and quantities in fixed-point units. No floating-point drift." },
  { icon: "wired-lineal-728-notebook-pen-hover-pinch.webp", title: "An audit trail", body: "Consequential changes are recorded with who made them and when." },
  { icon: "wired-lineal-12-layers-hover-slide.webp", title: "Transactions that hold", body: "Receipts, production and payment allocations update every record together, or not at all." },
  { icon: "wired-lineal-1821-moon-stars-hover-pinch.webp", title: "At the desk and on the go", body: "Responsive screens, light and dark themes, and an installable web app." },
];

export default function HomePage() {
  const available = apps.filter((app) => app.status === "available");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="portal-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_70%_30%,black,transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-[var(--color-action-primary)] opacity-[0.16] blur-[120px]" />
        <div className={`${container} relative grid items-center gap-12 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-28 lg:pt-24`}>
          <div data-reveal>
            <Link
              href="/apps/ai"
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-1 pl-1 pr-3 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-control)]"
            >
              <span className="rounded-full bg-[var(--color-action-primary)] px-2 py-0.5 text-[#111F1D]">New</span>
              AnOps AI Command Center
              <IconArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <h1 className={`${display} mt-6`}>
              One platform.
              <br />
              <span className="relative inline-block">
                Every operation.
                <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--color-action-primary)]">
                  <path d="M2 9 C 80 2, 220 2, 298 7" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              AnOps connects your company, people, finance, stock, purchasing, production and marketing in one workspace, with an AI that
              prepares the work and waits for your confirmation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={`${btnPrimary} h-12 px-6`}>
                Start free
                <IconArrowRight size={14} />
              </Link>
              <Link href="/apps" className={`${btnSecondary} h-12 px-6`}>
                Explore the 11 apps
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-text-secondary)]">
              {["Free plan: 1 company, 1 app", "Role-based access", "AI that asks before it acts"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <IconCheck size={12} className="text-[var(--color-text-primary)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal="scale" style={delay(2)} className="relative">
            <CommandDemo />
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/40" aria-labelledby="eco-heading">
        <div className={`${container} py-20 sm:py-28`}>
          <SectionHeading
            id="eco-heading"
            eyebrow="The ecosystem"
            title="Eleven managements. One set of records."
            lead="Instead of stitching tools together, every AnOps application works on the same companies, people, products, suppliers and customers."
            action={<TextLink href="/apps">Open the app directory</TextLink>}
          />
          <div className="mt-12" data-reveal style={delay(1)}>
            <EcosystemMap />
          </div>
        </div>
      </section>

      {/* Product tour */}
      <section className="border-t border-[var(--color-border-subtle)]" aria-labelledby="tour-heading">
        <div className={`${container} py-20 sm:py-28`}>
          <SectionHeading
            id="tour-heading"
            eyebrow="Inside the product"
            title="See each application at work."
            lead="Pick an application to see the kind of screen your team works in and what it can do today."
          />
          <div className="mt-12" data-reveal style={delay(1)}>
            <ProductTour apps={available} />
          </div>
        </div>
      </section>

      {/* Record journey */}
      <section className="portal-ink relative overflow-hidden" aria-labelledby="journey-heading">
        <div aria-hidden="true" className="portal-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]" />
        <div className={`${container} relative py-20 sm:py-28`}>
          <SectionHeading
            id="journey-heading"
            eyebrow="Connected by design"
            title="One record leads to the next."
            lead="A supplier order becomes stock, stock becomes product, product becomes an invoice. Nothing is typed twice."
          />
          <ol className="relative mt-14 grid gap-4 md:grid-cols-5 md:gap-3">
            <svg aria-hidden="true" className="absolute left-0 right-0 top-[34px] hidden h-2 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 2">
              <line x1="4" y1="1" x2="96" y2="1" stroke="#C8F03E" strokeOpacity="0.55" strokeWidth="0.4" className="portal-flow" vectorEffect="non-scaling-stroke" />
            </svg>
            {journey.map((step, index) => {
              const app = getApp(step.app);
              if (!app) return null;
              return (
                <li key={step.verb} data-reveal style={delay(index, 110)} className="relative">
                  <Link href={`/apps/${app.slug}`} className="group flex h-full flex-col rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 transition-colors hover:border-[#C8F03E]/60">
                    <div className="flex items-center gap-3">
                      <AnimatedIcon icon={app.icon} size={44} />
                      <span className="text-xs font-semibold text-[var(--color-text-secondary)]">0{index + 1}</span>
                    </div>
                    <p className="mt-5 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.03em]">{step.verb}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#C8F03E]">{app.name}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.detail}</p>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* AI */}
      <section className="border-b border-[var(--color-border-subtle)]" aria-labelledby="ai-heading">
        <div className={`${container} grid gap-14 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]`}>
          <div>
            <div data-reveal>
              <AnimatedIcon icon="wired-lineal-256x256-ai-chip-hover-pinch.webp" size={64} play="always" />
              <Eyebrow className="mt-6">AI with guardrails</Eyebrow>
              <h2 id="ai-heading" className="mt-4 font-[family-name:var(--font-heading)] text-[30px] leading-[1.1] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[40px]">
                An assistant that knows the business, and its limits.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
                AnOps AI works through the same services as the screens, so validation, permissions and company boundaries always apply.
              </p>
            </div>
            <dl className="mt-10 grid gap-6 sm:grid-cols-2">
              {principles.map((item, index) => (
                <div key={item.title} data-reveal style={delay(index)} className="border-l-2 border-[var(--color-action-primary)] pl-4">
                  <dt className="text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div data-reveal="scale" style={delay(1)}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">AI across the platform</p>
            <ul className="mt-4 divide-y divide-[var(--color-border-subtle)] overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              {aiUseCases.map((useCase) => {
                const app = getApp(useCase.appSlug);
                return (
                  <li key={useCase.area}>
                    <Link href={`/apps/${useCase.appSlug}`} className="group flex gap-4 p-5 transition-colors hover:bg-[var(--color-bg-subtle)]">
                      {app && <AnimatedIcon icon={app.icon} size={44} />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{useCase.area}</span>
                          <IconArrowRight size={13} className="shrink-0 text-[var(--color-text-secondary)] transition-transform group-hover:translate-x-1" />
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">{useCase.description}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--color-text-primary)]">{useCase.benefit}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section aria-labelledby="industries-heading">
        <div className={`${container} py-20 sm:py-28`}>
          <SectionHeading
            id="industries-heading"
            eyebrow="Industries"
            title="Built around how different businesses run."
            action={<TextLink href="/industries">All industry solutions</TextLink>}
          />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry, index) => (
              <li key={industry.slug} data-reveal style={delay(index, 60)}>
                <Link
                  href={`/industries/${industry.slug}`}
                  style={{ ["--accent" as string]: industry.accent }}
                  className="group flex h-full flex-col rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 transition-[border-color,box-shadow] duration-300 hover:border-[color-mix(in_oklab,var(--accent)_55%,var(--color-border-subtle))] hover:shadow-[0_18px_40px_-26px_var(--accent)]"
                >
                  <AnimatedIcon icon={industry.icon} size={52} />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{industry.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{industry.summary}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                    {industry.apps.slice(0, 4).map((slug) => (
                      <span key={slug} className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                        {getApp(slug)?.name}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/40" aria-labelledby="trust-heading">
        <div className={`${container} py-20 sm:py-28`}>
          <SectionHeading
            id="trust-heading"
            eyebrow="Why AnOps"
            title="Engineered to be trusted with your operations."
            lead="Business software earns trust in the details: who can do what, what happens when two people act at once, and whether the numbers add up."
          />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-2 lg:grid-cols-3">
            {trust.map((item, index) => (
              <li key={item.title} data-reveal="fade" style={delay(index, 60)} className="group bg-[var(--color-bg-surface)] p-6 sm:p-7">
                <AnimatedIcon icon={item.icon} size={44} />
                <h3 className="mt-5 text-base font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-[var(--color-border-subtle)]" aria-labelledby="pricing-heading">
        <div className={`${container} py-20 sm:py-28`}>
          <SectionHeading
            id="pricing-heading"
            eyebrow="Plans"
            title="Start with one app. Grow when you are ready."
            action={<TextLink href="/pricing">Compare all plans</TextLink>}
          />
          <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan, index) => (
              <li
                key={plan.id}
                data-reveal
                style={delay(index, 60)}
                className={`relative flex flex-col rounded-[16px] border p-5 ${plan.highlight ? "border-[var(--color-text-primary)] bg-[var(--color-bg-surface)]" : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"}`}
              >
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{plan.name}</p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{plan.price}</p>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  {plan.companies} · {plan.applications}
                </p>
                {plan.highlight && (
                  <span className="absolute -top-3 left-5 rounded-full bg-[var(--color-action-primary)] px-2.5 py-0.5 text-[11px] font-semibold text-[#111F1D]">{plan.highlight}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--color-border-subtle)]" aria-labelledby="faq-heading">
        <div className={`${container} grid gap-10 py-20 sm:py-28 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div data-reveal>
            <Eyebrow>Questions</Eyebrow>
            <h2 id="faq-heading" className="mt-4 font-[family-name:var(--font-heading)] text-[30px] leading-[1.1] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[40px]">
              A few things worth making clear.
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              More answers in the <TextLink href="/help" className="min-h-0">help center</TextLink>
            </p>
          </div>
          <div data-reveal style={delay(1)}>
            <Faq items={faqItems} idPrefix="home-faq" />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
