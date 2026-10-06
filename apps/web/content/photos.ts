import type { StaticImageData } from "next/image";

import mustardTerracesGandaki from "@/assets/photos/mustard-terraces-gandaki.jpg";
import paddyTerracesAutumn from "@/assets/photos/paddy-terraces-autumn.jpg";
import ripePaddyDolakha from "@/assets/photos/ripe-paddy-dolakha.jpg";

// Every photograph is openly licensed on Wikimedia Commons and credited here,
// once, so the credit on a photograph and the credits page can never disagree.
// The files were resized and re-encoded for the web; nothing else was changed.
//
// Author and licence were read from each file's Commons page on 2026-10-01.
// A photograph is decoration here: no page needs one to be understood, so
// each is rendered with an empty alt and described on the credits page.
export interface Photo {
  image: StaticImageData;
  /** What it shows, for the credits page. */
  caption: { ne: string; en: string };
  place: { ne: string; en: string };
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const photos = {
  paddyTerraces: {
    image: paddyTerracesAutumn,
    caption: {
      ne: "शरद ऋतुमा पहेँलो भएका धानका गरा",
      en: "Paddy terraces turning gold in autumn",
    },
    place: { ne: "पहाडी क्षेत्र", en: "Mountain region" },
    author: "Sasmit Adhikari",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:Paddy_fields_in_mountain_region.jpg",
  },
  ripePaddy: {
    image: ripePaddyDolakha,
    caption: { ne: "पाकेको धानको खेत", en: "A field of ripe paddy" },
    place: { ne: "दोलखा", en: "Dolakha" },
    author: "Shantiram Subedi",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:Rice_field_of_Nepal.jpg",
  },
  mustardTerraces: {
    image: mustardTerracesGandaki,
    caption: {
      ne: "पहाडी गाउँ, सिँढीजस्ता गरा र फुलेको तोरीबारी",
      en: "A hill village with terraced fields and mustard in flower",
    },
    place: { ne: "रानीबन, गण्डकी प्रदेश", en: "Raniban, Gandaki Province" },
    author: "Timothy A. Gonsalves",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source:
      "https://commons.wikimedia.org/wiki/File:Mustard_Raniban_Gandaki_Nepal_Feb13_DSC_1733.jpg",
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;
