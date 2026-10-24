import Link from "next/link";
import { ButtonLink, buttonClass } from "@/shared/components/ui/button";

/** Server-rendered pager. Preserves other query parameters so filters survive paging. */
export function Pagination({
  basePath,
  page,
  totalPages,
  params,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("page", String(target));
    return `${basePath}?${search.toString()}`;
  };
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2 text-sm">
      {page > 1 ? (
        <ButtonLink href={hrefFor(page - 1)}>Previous</ButtonLink>
      ) : (
        <span className={buttonClass("secondary", "pointer-events-none opacity-50")} aria-disabled="true">
          Previous
        </span>
      )}
      <span className="text-[var(--color-text-secondary)]">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={buttonClass("secondary")}>
          Next
        </Link>
      ) : (
        <span className={buttonClass("secondary", "pointer-events-none opacity-50")} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
