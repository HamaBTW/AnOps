import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowRight } from "@/shared/components/ui/brand-icons";
import { card, container, eyebrow, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";

export const metadata: Metadata = {
  title: "Community",
  description: "Learn, collaborate, get services and find the right AnOps links.",
};

const sections = [
  {
    id: "learn",
    title: "Learn",
    body: "Understand how the platform fits together, from the app directory to getting started with your first setup.",
    items: [
      { label: "Browse the app directory", href: "/apps" },
      { label: "Read the help center", href: "/help" },
      { label: "See industry workflows", href: "/industries" },
    ],
  },
  {
    id: "collaborate",
    title: "Collaborate",
    body: "A place for members to share questions and ideas is being prepared. Its channels and guidelines will be announced before they open.",
    items: [],
  },
  {
    id: "services",
    title: "Get Services",
    body: "Implementation and partner services are to be announced. In the meantime, tell us about your operations and we will talk through the right setup.",
    items: [{ label: "Contact us about your setup", href: "/contact" }],
  },
  {
    id: "links",
    title: "Links",
    body: "The key pages of the AnOps website, in one place.",
    items: [
      { label: "Apps", href: "/apps" },
      { label: "Pricing", href: "/pricing" },
      { label: "Help center", href: "/help" },
      { label: "About AnOps", href: "/about" },
    ],
  },
];

export default function CommunityPage() {
  return (
    <>
      <section className={`${container} pb-8 pt-16 sm:pt-20`}>
        <p className={eyebrow}>Community</p>
        <h1 className={`${headingXl} mt-3 max-w-3xl`}>Learn, collaborate and grow with AnOps.</h1>
        <p className={`${lead} mt-5 max-w-2xl`}>Find the resources you need, and see what is coming next.</p>
      </section>

      <section className={`${container} ${sectionY} scroll-reveal`}>
        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.id} id={section.id} className={`${card} scroll-mt-24 p-6 sm:p-8`} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{section.body}</p>
              {section.items.length > 0 && (
                <ul className="mt-6 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
                        {item.label}
                        <IconArrowRight size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
