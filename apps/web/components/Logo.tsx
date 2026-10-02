// Three terrace contours under a sun: fields, and lines of a page. The mark is
// a fixed brand commitment. Its green is the brand colour: outside
// an exam the buttons and links share it; inside one they take the exam's own
// colour and the mark is the one green thing on the page.
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
      <rect width="48" height="48" rx="11" fill="var(--color-logo)" />
      <path
        d="M7 37c7-4.6 14-6.8 21-6.8 5.4 0 9.7 1.2 13 3.1"
        stroke="var(--color-on-logo)"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M7 28.4c7-4.6 14-6.8 21-6.8 5.4 0 9.7 1.2 13 3.1"
        stroke="var(--color-on-logo)"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M7 19.8c7-4.6 14-6.8 21-6.8"
        stroke="var(--color-on-logo)"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="36.5" cy="12.5" r="4.6" fill="#d9a21b" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={32} />
      <span className="text-[1.2rem] font-bold tracking-[-0.01em] text-ink">agrilok</span>
    </span>
  );
}
