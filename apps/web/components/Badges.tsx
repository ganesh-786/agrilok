import { Check, Clock } from "@/components/Icons";
import { localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { LevelCode, ReviewStateValue } from "@/lib/types";

// The review state is never optional UI and never softened
// (apps/web/README.md). "Pending review" is shown as plainly as "checked".
export function ReviewBadge({
  state,
  t,
  compact = false,
}: {
  state: ReviewStateValue;
  t: Dictionary;
  compact?: boolean;
}) {
  const verified = state === "verified";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[0.78rem] font-semibold leading-tight ${
        verified
          ? "border-ok bg-ok-tint text-ok"
          : "border-dashed border-warn bg-mustard-tint text-warn"
      }`}
      title={verified ? t.answer.reviewVerified : t.answer.reviewPendingNote}
    >
      {verified ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {compact ? null : verified ? t.answer.reviewVerified : t.answer.reviewPending}
      {compact ? (
        <span className="sr-only">
          {verified ? t.answer.reviewVerified : t.answer.reviewPending}
        </span>
      ) : null}
    </span>
  );
}

export function LevelBadge({ level, t, lang }: { level: LevelCode; t: Dictionary; lang: Lang }) {
  const four = level === "level_4";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.78rem] font-bold leading-tight ${
        four ? "bg-field-tint text-field" : "bg-clay-tint text-clay"
      }`}
    >
      {t.levels[level].short.replace(/[0-9]/, (d) => localDigits(d, lang))}
    </span>
  );
}
