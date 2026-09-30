// A small, hand-drawn icon set. Inline SVG, no icon font, no library: each
// icon costs a few hundred bytes and inherits the text colour.

type IconProps = { className?: string; title?: string };

function Svg({ className, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function ExternalLink(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Svg>
  );
}

export function Search(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Svg>
  );
}

export function Check(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" />
    </Svg>
  );
}

export function Document(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </Svg>
  );
}

export function Download(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Svg>
  );
}

export function Flag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </Svg>
  );
}

/** A paddy stalk, drawn once, used as a section divider. */
export function PaddyStalk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" width="64" height="24" className={className} aria-hidden="true">
      <path d="M4 20c14-1 26-6 38-15" stroke="currentColor" strokeWidth="1.4" fill="none" />
      {[10, 17, 24, 31, 38].map((x, i) => (
        <ellipse
          key={x}
          cx={x}
          cy={17 - i * 2.6}
          rx="3.1"
          ry="1.4"
          transform={`rotate(-${24 + i * 4} ${x} ${17 - i * 2.6})`}
          fill="currentColor"
        />
      ))}
      <path d="M42 5c6 1 10 4 14 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
