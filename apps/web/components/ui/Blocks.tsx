import Link from "next/link";

import { ChevronRight } from "@/components/Icons";

// Layout pieces that repeat on every screen. Kept together because each is
// only a few lines, and consistency between them is the point.

export function PageHeader({
  title,
  lead,
  children,
  plain = false,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
  /** A detail page reached from a list (a notice, a topic): a smaller title under its breadcrumb. */
  plain?: boolean;
}) {
  return (
    <header className={plain ? "space-y-3 pb-6 pt-2" : "space-y-3 pb-6 pt-6 md:pb-8 md:pt-9"}>
      <h1 className={plain ? "max-w-4xl text-headline" : "text-display"}>{title}</h1>
      {lead ? <p className="max-w-prose text-ink-2">{lead}</p> : null}
      {children}
    </header>
  );
}

export function SectionHeader({
  title,
  id,
  action,
  level = 2,
}: {
  title: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Heading id={id} className={level === 2 ? "text-title" : "text-lead"}>
        {title}
      </Heading>
      {action ? <div className="shrink-0 text-small">{action}</div> : null}
    </div>
  );
}

/**
 * A named group of panels on a screen that holds several kinds of thing. The
 * heading is what a student scans for; the space above it is what separates
 * one group from the next.
 */
export function Zone({
  id,
  title,
  action,
  children,
  className = "",
}: {
  id: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`mt-10 lg:mt-12 ${className}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-title">
          {title}
        </h2>
        {action ? <div className="shrink-0 text-small">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * One object on the page, in a box of its own: an icon that says what kind of
 * thing it is, its name, and at most one link out. The icon and the name are
 * read before the content, which is what lets a student find a panel without
 * reading the page.
 */
export function Panel({
  id,
  icon,
  title,
  action,
  children,
  className = "",
  level = 3,
}: {
  id: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className={`card flex flex-col p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="icon-chip" aria-hidden="true">
          {icon}
        </span>
        <Heading id={id} className="min-w-0 flex-1 font-sans text-lead font-bold leading-snug">
          {title}
        </Heading>
        {action ? <div className="shrink-0 text-small">{action}</div> : null}
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/** A tappable row in a list: title, detail, and a chevron. */
export function RowLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <Link href={href} className="row-link flex min-h-14 items-center gap-3 px-4 py-3 no-underline">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-relaxed text-ink">{title}</span>
        {detail ? <span className="mt-0.5 block text-small text-ink-3">{detail}</span> : null}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
    </Link>
  );
}

/** A bordered list of rows. */
export function RowList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="card divide-y divide-line overflow-hidden">
      {children}
    </ul>
  );
}

export function EmptyState({
  title,
  children,
  actions,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-sunken px-5 py-6">
      <p className="text-lead font-semibold">{title}</p>
      {children ? <div className="max-w-prose space-y-2 text-ink-2">{children}</div> : null}
      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </div>
  );
}

/** A progress bar that states its value in words for screen readers. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(value, max) / max : 0;
  return (
    <span className="block" role="img" aria-label={label}>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-sunken">
        <span
          className="meter-fill block h-full rounded-full bg-action"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </span>
    </span>
  );
}

export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${100 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

/** Links styled as filter chips. Server-driven, so filters work without JavaScript. */
export function ChipLinks({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: React.ReactNode; active: boolean }[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2 py-1">
        {items.map((item, i) => (
          <li key={i}>
            <Link
              href={item.href}
              aria-current={item.active ? "true" : undefined}
              scroll={false}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-small font-semibold no-underline transition-colors duration-[var(--motion-press)] ${
                item.active
                  ? "border-action bg-action text-on-action"
                  : "border-line-strong bg-surface text-ink hover:border-ink hover:bg-sunken"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
