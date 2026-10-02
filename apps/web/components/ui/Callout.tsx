import { Alert, Info, WifiOff } from "@/components/Icons";

// An inline message with a reason and, usually, a next step. Used for every
// designed state that is not a whole empty screen (docs/student-experience.md,
// section 6).

type Tone = "info" | "warning" | "danger" | "success" | "offline";

const STYLES: Record<Tone, string> = {
  info: "border-line bg-sunken",
  warning: "border-warning/30 bg-warning-tint",
  danger: "border-danger/30 bg-danger-tint",
  success: "border-success/30 bg-success-tint",
  offline: "border-line-strong bg-sunken",
};

const ICON_COLOR: Record<Tone, string> = {
  info: "text-ink-2",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
  offline: "text-ink-2",
};

export function Callout({
  tone = "info",
  title,
  children,
  role,
  className = "",
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  const Icon = tone === "offline" ? WifiOff : tone === "info" ? Info : Alert;
  return (
    <div
      role={role}
      className={`flex gap-3 rounded-xl border px-3.5 py-3 text-small ${STYLES[tone]} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLOR[tone]}`} />
      <div className="min-w-0 space-y-1 text-ink">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink-2">{children}</div> : null}
      </div>
    </div>
  );
}
