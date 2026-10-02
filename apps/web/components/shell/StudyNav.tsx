"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { Bell, Book, Chat, Home, Target } from "@/components/Icons";

// The five destinations (docs/student-experience.md, section 2): a bottom bar
// on a phone and a tablet, tabs in the masthead on a laptop.
//
// Every study page is rendered on request, so a tap has to wait for the
// server before the page changes. Without an answer in between, a tap on a
// slow connection looks like a button that does not work. The tab therefore
// marks itself the moment it is pressed (useLinkStatus) and settles into the
// current marker when the page arrives.

export type NavItem = {
  key: "home" | "syllabus" | "practice" | "updates" | "ask";
  href: string;
  label: string;
};

const ICONS = { home: Home, syllabus: Book, practice: Target, updates: Bell, ask: Chat };

function isActive(path: string, item: NavItem, base: string): boolean {
  if (item.key === "home") return path === base || path === `${base}/guide`;
  return path === item.href || path.startsWith(`${item.href}/`);
}

function TabBody({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className={`tab-body ${className}`} data-pending={pending ? "" : undefined}>
      {children}
    </span>
  );
}

export function BottomNav({
  items,
  base,
  label,
}: {
  items: NavItem[];
  base: string;
  label: string;
}) {
  const path = usePathname();
  return (
    <nav
      aria-label={label}
      data-testid="bottom-nav"
      className="study-bottom-nav fixed inset-x-0 bottom-0 z-30 bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 px-1">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          const active = isActive(path, item, base);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="tab block rounded-lg"
              >
                <TabBody
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-caption ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  <span className="tab-mark top-0" aria-hidden="true" />
                  <Icon className="h-[1.35rem] w-[1.35rem]" />
                  <span className="leading-relaxed">{item.label}</span>
                </TabBody>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopTabs({ items, base, label }: { items: NavItem[]; base: string; label: string }) {
  const path = usePathname();
  return (
    <nav aria-label={label} data-testid="top-nav">
      <ul className="flex flex-wrap gap-x-1">
        {items.map((item) => {
          const active = isActive(path, item, base);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="tab block rounded-lg"
              >
                <TabBody
                  className={`inline-flex min-h-11 items-center px-3.5 text-small ${
                    active ? "font-bold" : "font-semibold"
                  }`}
                >
                  {item.label}
                  <span className="tab-mark bottom-0" aria-hidden="true" />
                </TabBody>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
