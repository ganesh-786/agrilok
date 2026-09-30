"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// The root layout is not re-rendered on client-side navigation, so anything
// that depends on the current URL lives in these two small client pieces.

export function NavLinks({
  links,
  label,
}: {
  links: { href: string; label: string; tone: string }[];
  label: string;
}) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="wrap -mt-1 pb-2">
      <ul className="flex gap-1 overflow-x-auto text-[0.95rem] font-semibold [scrollbar-width:none]">
        {links.map((link) => {
          const active = path === link.href || path.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded px-3 py-1.5 no-underline ${
                  active ? `bg-paper-2 ${link.tone || "text-ink"}` : "text-ink-2 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Where to come back to after a settings form (language, photos) is submitted. */
export function ReturnTo() {
  const path = usePathname();
  const search = useSearchParams().toString();
  return <input type="hidden" name="returnTo" value={search ? `${path}?${search}` : path} />;
}
