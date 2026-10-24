import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowRight, IconCheck, IconSparkles } from "@/shared/components/ui/brand-icons";
import { CategoryIcon } from "@/shared/components/marketing/category-icon";
import { DashboardPreview } from "@/shared/components/marketing/dashboard-preview";
import { Faq } from "@/shared/components/marketing/faq";
import { StatusBadge } from "@/shared/components/marketing/status-badge";
import { btnPrimary, btnSecondary, card, container, eyebrow, headingLg, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";
import { aiUseCases, apps, categories, getApp, appsInCategory } from "@/shared/config/catalog";
import { faqItems, industries, plans, siteDescription } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "AnOps | One platform. Every operation.",
  description: siteDescription,
};

const pillars = [
  { title: "Centralize the context", body: "Keep customers, orders, stock and people records in one connected workspace instead of copying between tools." },
  { title: "See what needs attention", body: "Each area shows what is open, what is late and what needs a decision, based on the records your role can access." },
  { title: "Move forward with control", body: "Suggestions are drafted for review. Nothing changes until an authorized person approves it." },
];

const workflow = [
  { slug: "crm", step: "Lead", detail: "Qualify the opportunity" },
  { slug: "sales", step: "Quote", detail: "Prepare the commercial offer" },
  { slug: "sales", step: "Order", detail: "Confirm the customer order" },
  { slug: "invoicing", step: "Invoice", detail: "Track payment status" },
  { slug: "inventory", step: "Stock", detail: "Keep fulfillment informed" },
];

export default function HomePage() {
  const aiPreviewApp = getApp("stock-forecast-reorder");

  return (
    <>
      <section className={`${container} grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-24 lg:pt-24`}>
        <div className="reveal">
          <p className={eyebrow}>AI-native · Modular · Connected</p>
          <h1 className={`${headingXl} mt-5`}>One platform. Every operation.</h1>
          <p className={`${lead} mt-6 max-w-xl`}>
            AnOps brings sales, finance, supply chain, people and marketing into one modular workspace. Your records stay
            connected, and AI drafts suggestions your team reviews before anything changes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/apps" className={btnPrimary}>
              Explore the apps
              <IconArrowRight size={14} />
            </Link>
            <Link href="/contact" className={btnSecondary}>
              Contact us
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
            Applications are at different stages. Every app shows its status: InP (In Progress) or CS (Coming Soon).
          </p>
        </div>
        <DashboardPreview />
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <p className={eyebrow}>Less switching. More understanding.</p>
        <h2 className={`${headingLg} mt-3 max-w-2xl`}>Work from one shared picture of the business.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar, index) => (
            <div key={pillar.title} className={`${card} reveal p-6`} style={{ ["--reveal-delay" as string]: `${index * 90}ms` }}>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">0{index + 1}</p>
              <h3 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className={eyebrow}>The application ecosystem</p>
            <h2 className={`${headingLg} mt-3 max-w-2xl`}>Everything has a place. Nothing works alone.</h2>
            <p className={`${lead} mt-4 max-w-2xl`}>
              Apps are organized into nine areas. They are designed to share one data foundation, so a customer, order or stock
              movement is recorded once and used wherever it is needed.
            </p>
          </div>
          <Link href="/apps" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
            Browse all {apps.length} apps
            <IconArrowRight size={14} />
          </Link>
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/apps?category=${category.id}`}
                className={`${card} group flex h-full flex-col gap-3 p-5 lift hover:border-[var(--color-border-control)]`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]">
                    <CategoryIcon id={category.id} size={18} />
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{appsInCategory(category.id).length} apps</span>
                </div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{category.label}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{category.description}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {appsInCategory(category.id)
                    .slice(0, 4)
                    .map((app) => (
                      <span key={app.slug} className="rounded-[var(--radius-pill)] bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                        {app.name}
                      </span>
                    ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <p className={eyebrow}>Connected workflows</p>
        <h2 className={`${headingLg} mt-3 max-w-2xl`}>One record leads to the next.</h2>
        <p className={`${lead} mt-4 max-w-2xl`}>
          A planned flow across apps: each step builds on the record before it, instead of being re-entered in another tool.
        </p>
        <ol className="mt-10 grid gap-3 md:grid-cols-5">
          {workflow.map((item, index) => {
            const app = getApp(item.slug);
            return (
              <li key={`${item.step}-${index}`} className={`${card} reveal p-5`} style={{ ["--reveal-delay" as string]: `${index * 70}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{app?.name}</span>
                  {app && <StatusBadge status={app.status} />}
                </div>
                <p className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{item.step}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className={eyebrow}>AI capabilities · In Progress</p>
            <h2 className={`${headingLg} mt-3`}>Assistance that understands the operation.</h2>
            <p className={`${lead} mt-4`}>
              Five focused capabilities help your teams prepare and review work. They are in progress, and every output is a
              suggestion that needs review.
            </p>
            <ul className="mt-8 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
              {aiUseCases.map((useCase) => (
                <li key={useCase.area} className="flex gap-4 py-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]">
                    <IconCheck size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{useCase.area}</p>
                      <StatusBadge status="in-progress" />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{useCase.description}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{useCase.benefit}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${card} self-start p-5 sm:p-6`}>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                <IconSparkles size={16} />
                {aiPreviewApp?.name}
              </p>
              <StatusBadge status="in-progress" />
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Illustrative example · planned behavior</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-4">
                <p className="text-xs text-[var(--color-text-secondary)]">Forecast</p>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]">Stock for one product is projected to run short within three weeks.</p>
              </div>
              <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-4">
                <p className="text-xs text-[var(--color-text-secondary)]">Draft purchase order</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <span className="text-[var(--color-text-secondary)]">Quantity</span>
                  <span className="text-[var(--color-text-secondary)]">Unit price</span>
                  <span className="text-[var(--color-text-secondary)]">Total</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">120</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">€20</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">€2,400</span>
                </div>
              </div>
              <div className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-status-warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-status-warning)]">
                Review required · Not sent
              </div>
            </div>
            <Link href={`/apps/${aiPreviewApp?.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
              About this capability
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <p className={eyebrow}>Industries</p>
        <h2 className={`${headingLg} mt-3 max-w-2xl`}>Built around how different businesses run.</h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {industries.map((industry) => (
            <li key={industry.slug}>
              <Link href={`/industries#${industry.slug}`} className={`${card} group flex h-full flex-col gap-2 p-6 lift hover:border-[var(--color-border-control)]`}>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{industry.name}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{industry.summary}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  See the workflows
                  <IconArrowRight size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className={eyebrow}>Pricing</p>
            <h2 className={`${headingLg} mt-3`}>Start with one app. Grow when you are ready.</h2>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
            Compare plans
            <IconArrowRight size={14} />
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={`${card} flex flex-col p-6 ${plan.highlight ? "border-[var(--color-border-control)] shadow-[0_8px_30px_-12px_rgba(17,31,29,0.18)]" : ""}`}
            >
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{plan.name}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">{plan.price}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{plan.priceNote}</p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">{plan.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal border-t border-[var(--color-border-subtle)]`}>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className={eyebrow}>Questions</p>
            <h2 className={`${headingLg} mt-3`}>A few things worth making clear.</h2>
            <p className={`${lead} mt-4`}>
              More answers are in the <Link href="/help" className="font-semibold text-[var(--color-text-primary)] underline underline-offset-4">help center</Link>.
            </p>
          </div>
          <Faq items={faqItems} idPrefix="home-faq" />
        </div>
      </section>

      <section className={`${container} pb-20 sm:pb-24`}>
        <div className="rounded-[var(--radius-card)] bg-[#111F1D] px-6 py-12 text-[#F7F7F2] sm:px-12 sm:py-16">
          <h2 className="max-w-2xl text-[32px] leading-[38px] tracking-[-0.03em] sm:text-[44px] sm:leading-[50px]">
            Make room for a clearer way to work.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#B4BFB7]">
            Tell us how your operations run and we will talk through the right starting point.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className={btnPrimary}>
              Contact us
            </Link>
            <Link href="/apps" className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] border border-[#476158] px-5 text-sm font-semibold text-[#F7F7F2] hover:bg-[#192B27]">
              Explore the apps
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
