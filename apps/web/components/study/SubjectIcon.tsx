import {
  Apple,
  Book,
  Bulb,
  Cloud,
  Flask,
  Globe,
  Hourglass,
  Landmark,
  Layers,
  Megaphone,
  Scales,
  Shield,
  Sliders,
  Sprout,
  Trend,
  Wheat,
} from "@/components/Icons";
import { subjectIconKey, type SubjectIconKey } from "@/lib/subject-icon";

const ICONS: Record<SubjectIconKey, typeof Book> = {
  reasoning: Bulb,
  awareness: Globe,
  government: Landmark,
  history: Hourglass,
  environment: Cloud,
  law: Scales,
  research: Flask,
  extension: Megaphone,
  economics: Trend,
  soil: Layers,
  protection: Shield,
  horticulture: Apple,
  technology: Sliders,
  crops: Wheat,
  agriculture: Sprout,
  book: Book,
};

/** The mark for a subject, in the tinted chip every panel uses. */
export function SubjectIcon({ titleEn }: { titleEn: string }) {
  const key = subjectIconKey(titleEn);
  const Icon = ICONS[key];
  return (
    <span className="icon-chip" aria-hidden="true" data-subject-icon={key}>
      <Icon className="h-5 w-5" />
    </span>
  );
}
