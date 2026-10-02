import { Check, Clock } from "@/components/Icons";
import type { ReviewStateValue } from "@/lib/contracts";
import type { Dictionary } from "@/lib/i18n";

// Small status labels. Words always carry the meaning; colour only repeats it,
// and only four meanings have a colour at all: an exam level, correct or
// checked, wrong, and waiting for review. Everything else is ink.

export type TagTone =
  "neutral" | "outline" | "success" | "warning" | "danger" | "demo" | "level_4" | "level_7";

const TONES: Record<TagTone, string> = {
  neutral: "bg-sunken text-ink-2",
  outline: "border border-line-strong text-ink-2",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  demo: "border border-dashed border-line-strong text-ink-2",
  level_4: "bg-l4 text-on-l4",
  level_7: "bg-l7 text-on-l7",
};

export function Tag({
  tone = "neutral",
  children,
  className = "",
  title,
}: {
  tone?: TagTone;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-caption font-semibold leading-relaxed ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The review state is never optional UI and never softened (apps/web/README.md):
 * "Pending review" is shown as plainly as "Checked by a person".
 */
export function ReviewLabel({
  state,
  t,
}: {
  state: ReviewStateValue;
  t: Pick<Dictionary, "reviewState">;
}) {
  const verified = state === "verified";
  return (
    <Tag
      tone={verified ? "success" : "warning"}
      title={verified ? undefined : t.reviewState.pendingNote}
    >
      {verified ? (
        <Check className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0" />
      )}
      {verified ? t.reviewState.verified : t.reviewState.pending}
    </Tag>
  );
}

export function DemoTag({ t }: { t: Pick<Dictionary, "demo"> }) {
  return <Tag tone="demo">{t.demo.tag}</Tag>;
}
