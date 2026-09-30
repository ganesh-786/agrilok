// Three terrace contours under a mustard sun: fields, and lines of a page.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="11" fill="var(--color-field)" />
      <path
        d="M7 37c7-4.6 14-6.8 21-6.8 5.4 0 9.7 1.2 13 3.1"
        stroke="var(--color-paper)"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M7 28.4c7-4.6 14-6.8 21-6.8 5.4 0 9.7 1.2 13 3.1"
        stroke="var(--color-paper)"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M7 19.8c7-4.6 14-6.8 21-6.8"
        stroke="var(--color-paper)"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="36.5" cy="12.5" r="4.6" fill="var(--color-mustard)" />
    </svg>
  );
}

export function Wordmark({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={34} />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[1.15rem] font-extrabold tracking-tight text-ink">
          agrilok
        </span>
        {tagline ? (
          <span className="mt-1 hidden text-[0.7rem] font-semibold text-ink-3 sm:block">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
