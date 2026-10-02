// A small, hand-drawn icon set. Inline SVG, no icon font, no library: each
// icon costs a few hundred bytes and inherits the text colour. Icons are used
// only where they label a destination, an action or what kind of thing a panel
// holds, never as decoration.

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
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function Home(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5v10h13v-10" />
      <path d="M10 19.5v-5h4v5" />
    </Svg>
  );
}

export function Book(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.5c-1.8-1.3-4.2-2-7-2v13c2.8 0 5.2.7 7 2 1.8-1.3 4.2-2 7-2v-13c-2.8 0-5.2.7-7 2z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

export function Target(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </Svg>
  );
}

export function Bell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function Chat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 5.5h15v10h-8l-4.5 4v-4h-2.5z" />
      <path d="M8.5 9.5h7M8.5 12.5h4" />
    </Svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Svg>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 9.5 12 16l6.5-6.5" />
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

export function Close(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
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

export function Calendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
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

export function Bookmark(props: IconProps & { filled?: boolean }) {
  const { filled, ...rest } = props;
  return (
    <Svg {...rest}>
      <path d="M6.5 4h11v16l-5.5-4-5.5 4z" fill={filled ? "currentColor" : "none"} />
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

export function Info(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" />
    </Svg>
  );
}

export function Alert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.2h.01" />
    </Svg>
  );
}

export function WifiOff(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3l18 18" />
      <path d="M8.8 16.2a4.6 4.6 0 0 1 6.4 0" />
      <path d="M5.2 12.6A9.5 9.5 0 0 1 9 10.3M14.8 10.3a9.5 9.5 0 0 1 4 2.3" />
      <path d="M12 19.5h.01" />
    </Svg>
  );
}

export function Sun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" />
    </Svg>
  );
}

export function Moon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.5 15.2A7.7 7.7 0 0 1 8.8 4.5 7.8 7.8 0 1 0 19.5 15.2z" />
    </Svg>
  );
}

export function Repeat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 11V9.5a3 3 0 0 1 3-3h10.5M16 3.5l3 3-3 3" />
      <path d="M19 13v1.5a3 3 0 0 1-3 3H5.5M8 20.5l-3-3 3-3" />
    </Svg>
  );
}

export function Compass(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </Svg>
  );
}

export function Chart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 19.5h15" />
      <path d="M7.5 16v-4M12 16V7.5M16.5 16v-6" />
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

// --- Subjects -----------------------------------------------------------------
// One mark per kind of subject, so a list of subjects can be scanned by shape
// before it is read (lib/subject-icon.ts decides which subject gets which).

export function Globe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.5 2.6 3.8 5.4 3.8 8.5s-1.3 5.9-3.8 8.5c-2.5-2.6-3.8-5.4-3.8-8.5S9.5 6.1 12 3.5z" />
    </Svg>
  );
}

export function Landmark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 9.5 12 4.5l8.5 5z" />
      <path d="M5.5 9.5V17M10 9.5V17M14 9.5V17M18.5 9.5V17" />
      <path d="M4 17h16M3 20h18" />
    </Svg>
  );
}

export function Hourglass(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 3.5h11M6.5 20.5h11" />
      <path d="M8 3.5c0 4.2 4 5 4 8.5s-4 4.3-4 8.5" />
      <path d="M16 3.5c0 4.2-4 5-4 8.5s4 4.3 4 8.5" />
    </Svg>
  );
}

export function Cloud(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .5-7.57 5.5 5.5 0 0 0-10.6 1.4A3.2 3.2 0 0 0 7.5 18.5z" />
    </Svg>
  );
}

export function Scales(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5v15.5M8 20h8M5.5 7.5h13" />
      <path d="M5.5 7.5 3 13.5a2.7 2.7 0 0 0 5 0z" />
      <path d="M18.5 7.5 16 13.5a2.7 2.7 0 0 0 5 0z" />
    </Svg>
  );
}

export function Flask(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 3.5h5" />
      <path d="M10.5 3.5v5.3l-4.8 8.4a2 2 0 0 0 1.7 3.3h9.2a2 2 0 0 0 1.7-3.3l-4.8-8.4V3.5" />
      <path d="M8.3 14.5h7.4" />
    </Svg>
  );
}

export function Megaphone(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5v3a1 1 0 0 0 1 1h2.5l7 4v-13l-7 4H5a1 1 0 0 0-1 1z" />
      <path d="M17.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M8 14.5l1 4.5h2" />
    </Svg>
  );
}

export function Trend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 17.5 9 12l3.5 3.5L20 8" />
      <path d="M14.5 8H20v5.5" />
      <path d="M3.5 21h17" />
    </Svg>
  );
}

export function Layers(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8z" />
      <path d="M3.5 12 12 16.5 20.5 12" />
      <path d="M3.5 16 12 20.5 20.5 16" />
    </Svg>
  );
}

export function Shield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 19 6v5.5c0 4.3-2.8 7.6-7 9-4.2-1.4-7-4.7-7-9V6z" />
      <path d="M9 12l2.2 2.2L15 10.2" />
    </Svg>
  );
}

export function Apple(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 8.2c-1.7-1.7-5.5-1.2-5.5 3.1 0 3.6 2.3 8.2 4.3 8.200.6 0 .9-.3 1.2-.3s.6.3 1.200.3c2 0 4.3-4.6 4.3-8.2 0-4.3-3.8-4.8-5.5-3.1z" />
      <path d="M12 8.2c0-1.700.6-3 2-3.9" />
    </Svg>
  );
}

export function Sliders(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h9M17.5 7H20M4 17h2.5M11 17h9" />
      <circle cx="15.25" cy="7" r="2.25" />
      <circle cx="8.75" cy="17" r="2.25" />
    </Svg>
  );
}

export function Wheat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21V8.5" />
      <path d="M12 8.5c-1.3-1.6-1.3-3.3 0-5 1.3 1.7 1.3 3.4 0 5z" />
      <path d="M12 13c-2.3 0-3.9-1.3-4.3-3.5 2.3 0 3.9 1.3 4.3 3.5z" />
      <path d="M12 13c2.3 0 3.9-1.3 4.3-3.5-2.3 0-3.9 1.3-4.3 3.5z" />
      <path d="M12 17.5c-2.3 0-3.9-1.3-4.3-3.5 2.3 0 3.9 1.3 4.3 3.5z" />
      <path d="M12 17.5c2.3 0 3.9-1.3 4.3-3.5-2.3 0-3.9 1.3-4.3 3.5z" />
    </Svg>
  );
}

export function Sprout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.5V12" />
      <path d="M12 13c0-3.4-2.3-5.5-6.2-5.5 0 3.7 2.5 5.5 6.2 5.5z" />
      <path d="M12 10.5c0-3 2.1-5 5.9-5 0 3.3-2.3 5-5.9 5z" />
      <path d="M7.5 20.5h9" />
    </Svg>
  );
}

export function Bulb(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z" />
      <path d="M9.5 19h5M10.5 21.5h3" />
    </Svg>
  );
}
