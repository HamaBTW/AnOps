import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { IconArrowRight, IconCheck } from "@/shared/components/ui/brand-icons";
import { CategoryIcon } from "@/shared/components/marketing/category-icon";
import { StatusBadge } from "@/shared/components/marketing/status-badge";
import { btnPrimary, btnSecondary, card, container, eyebrow, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";
import { aiUseCases, apps, getApp, getCategory, statusMeta } from "@/shared/config/catalog";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return apps.map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const app = getApp(slug);
  if (!app) return { title: "App not found" };
  return {
    title: app.name,
    description: `${app.summary} Status: ${statusMeta[app.status].label}.`,
  };
}

export default async function AppDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const app = getApp(slug);
  if (!app) notFound();

  const category = getCategory(app.category);
  const useCase = aiUseCases.find((item) => item.appSlug === app.slug);
  const connected = app.connectsWith.map((item) => getApp(item)).filter((item) => item !== undefined);

  return (
    <div className={`${container} ${sectionY} scroll-reveal`}>
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-text-secondary)]">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/apps" className="hover:text-[var(--color-text-primary)] hover:underline">
              Apps
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/apps?category=${category.id}`} className="hover:text-[var(--color-text-primary)] hover:underline">
              {category.label}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--color-text-primary)]" aria-current="page">
            {app.name}
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="reveal">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)]">
              <CategoryIcon id={app.category} size={20} />
            </span>
            <p className={eyebrow}>{category.label}</p>
            <StatusBadge status={app.status} />
          </div>
          <h1 className={`${headingXl} mt-5`}>{app.name}</h1>
          <p className={`${lead} mt-5 max-w-2xl`}>{app.summary}</p>

          <section className="mt-12" aria-labelledby="capabilities-heading">
            <h2 id="capabilities-heading" className="text-xl font-semibold text-[var(--color-text-primary)]">
              Planned capabilities
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Status: {statusMeta[app.status].label}. Capabilities describe planned scope and are not all available yet.
            </p>
            <ul className="mt-6 space-y-3">
              {app.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-[var(--color-text-primary)]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
                    <IconCheck size={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {useCase && (
            <section className={`${card} mt-12 p-6`} aria-labelledby="use-case-heading">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="use-case-heading" className="text-lg font-semibold text-[var(--color-text-primary)]">
                  AI use case
                </h2>
                <StatusBadge status="in-progress" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-primary)]">{useCase.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{useCase.benefit}</p>
              <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
                AI outputs are suggestions. An authorized person reviews and approves them before anything changes.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className={`${card} p-6`}>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Interested in {app.name}?</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Tell us about your operations and we will talk through how this app would fit.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/contact" className={btnPrimary}>
                Contact us
              </Link>
              <Link href="/pricing" className={btnSecondary}>
                Compare plans
              </Link>
            </div>
          </div>

          <div className={`${card} p-6`}>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Connected apps</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Designed to share records with:</p>
            <ul className="mt-4 divide-y divide-[var(--color-border-subtle)]">
              {connected.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/apps/${item.slug}`}
                    className="group flex items-center justify-between gap-3 py-3 text-sm text-[var(--color-text-primary)] hover:underline"
                  >
                    <span className="flex items-center gap-2">
                      {item.name}
                      <StatusBadge status={item.status} />
                    </span>
                    <IconArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="mt-16">
        <Link href="/apps" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
          Back to all apps
        </Link>
      </div>
    </div>
  );
}
