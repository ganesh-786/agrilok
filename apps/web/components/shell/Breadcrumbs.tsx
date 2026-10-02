import Link from "next/link";

import { ChevronRight } from "@/components/Icons";

// Where a page sits inside its exam: Home, then the destination, then the
// page. Every ancestor is a real link to a real page; the page itself is named
// last and is not a link (WAI-ARIA Authoring Practices, breadcrumb pattern).
//
// The exam is not a crumb. Level, commission and group are changed with the
// exam bar above, which is a control, and a trail is a place to read.

export type Crumb = { href: string; label: string };

export function Breadcrumbs({
  label,
  trail,
  current,
  currentDetail,
}: {
  /** The landmark's name, from the dictionary. */
  label: string;
  trail: Crumb[];
  /** The short visible name of this page. */
  current: string;
  /** The rest of the page's name for a screen reader, when the heading below already shows it. */
  currentDetail?: string;
}) {
  return (
    <nav aria-label={label} data-testid="breadcrumbs" className="pt-3 text-small">
      <ol className="flex flex-wrap items-center gap-x-1.5 text-ink-2">
        {trail.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <Link href={crumb.href} className="link inline-flex min-h-11 items-center font-medium">
              {crumb.label}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
          </li>
        ))}
        <li className="flex min-h-11 items-center">
          <span aria-current="page" className="font-semibold text-ink">
            {current}
            {currentDetail ? <span className="sr-only"> {currentDetail}</span> : null}
          </span>
        </li>
      </ol>
    </nav>
  );
}
