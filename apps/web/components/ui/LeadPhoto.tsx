import Image from "next/image";
import Link from "next/link";

import { photos, type PhotoKey } from "@/content/photos";

// The photograph along the edge of a filled block. It is decoration: the block
// reads the same without it, so it has an empty alt and is never the thing a
// page waits for. It carries its photographer's name, which links to the
// credits page with the licence and the original.
//
// next/image serves it in AVIF or WebP at the width the screen needs and shows
// a blurred preview until it arrives, which is what keeps a photograph
// affordable on a slow connection.
export function LeadPhoto({ photo, credit }: { photo: PhotoKey; credit: string }) {
  const item = photos[photo];
  return (
    <div className="lead-photo" data-testid="lead-photo">
      <Image
        src={item.image}
        alt=""
        fill
        sizes="(min-width: 64rem) 30rem, (min-width: 48rem) 46vw, 100vw"
        placeholder="blur"
      />
      <Link href="/credits#photos" className="photo-credit">
        {credit.replace("{name}", item.author)}
      </Link>
    </div>
  );
}
