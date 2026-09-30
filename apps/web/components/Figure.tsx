import Image from "next/image";

import type { Photo } from "@/content/photos";
import type { Lang } from "@/lib/i18n";

// A photograph with a real caption and credit, like a printed page. In lite
// mode it is not rendered at all, so no image bytes are sent.
export function Figure({
  photo,
  lang,
  lite,
  sizes,
  priority = false,
  className = "",
  aspect = "aspect-[4/3]",
}: {
  photo: Photo;
  lang: Lang;
  lite: boolean;
  sizes: string;
  priority?: boolean;
  className?: string;
  aspect?: string;
}) {
  if (lite) return null;
  return (
    <figure className={className}>
      <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-paper-2 ${aspect}`}>
        <Image
          src={photo.image}
          alt={photo.alt[lang]}
          fill
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          className="object-cover"
        />
      </div>
      <figcaption className="mt-1.5 text-[0.75rem] leading-snug text-ink-3">
        {photo.place[lang]} · {photo.author},{" "}
        <a href={photo.licenseUrl} className="underline" rel="license noopener noreferrer">
          {photo.license}
        </a>
      </figcaption>
    </figure>
  );
}
