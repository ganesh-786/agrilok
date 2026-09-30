import type { StaticImageData } from "next/image";

import harvestDhading from "@/assets/photos/harvest-dhading.jpg";
import mustardTerracesGandaki from "@/assets/photos/mustard-terraces-gandaki.jpg";
import paddyTerracesAutumn from "@/assets/photos/paddy-terraces-autumn.jpg";
import ripePaddyDolakha from "@/assets/photos/ripe-paddy-dolakha.jpg";
import terracesGhara from "@/assets/photos/terraces-ghara.jpg";

// Every photograph is openly licensed on Wikimedia Commons and credited here,
// once, so a caption and the credits page can never disagree. The files were
// resized and re-encoded for the web; nothing else was changed.
export interface Photo {
  image: StaticImageData;
  alt: { ne: string; en: string };
  place: { ne: string; en: string };
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const photos = {
  mustardTerraces: {
    image: mustardTerracesGandaki,
    alt: {
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
  ripePaddy: {
    image: ripePaddyDolakha,
    alt: { ne: "पाकेको धानको खेत", en: "A field of ripe paddy" },
    place: { ne: "दोलखा", en: "Dolakha" },
    author: "Shantiram Subedi",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:Rice_field_of_Nepal.jpg",
  },
  terraces: {
    image: terracesGhara,
    alt: {
      ne: "भिरालो पहाडमा खेतका गरा, अगाडि फूलेका रूखका हाँगा",
      en: "Terraced fields on a hillside, with flowering branches in front",
    },
    place: { ne: "घाराको दक्षिणतिर", en: "South of Ghara" },
    author: "Greg Willis",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    source: "https://commons.wikimedia.org/wiki/File:Terraces,_south_of_Ghara_(4525876548).jpg",
  },
  harvest: {
    image: harvestDhading,
    alt: { ne: "धान काट्दै गरेका किसान", en: "A farmer harvesting paddy" },
    place: { ne: "धादिङ", en: "Dhading" },
    author: "Bhawana Gurung",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:Harvesting_time_in_the_village_of_Dhading.jpg",
  },
  paddyTerraces: {
    image: paddyTerracesAutumn,
    alt: {
      ne: "शरद ऋतुमा पहेँलो भएका धानका गरा",
      en: "Paddy terraces turning gold in autumn",
    },
    place: { ne: "पहाडी क्षेत्र", en: "Mountain region" },
    author: "Sasmit Adhikari",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:Paddy_fields_in_mountain_region.jpg",
  },
} satisfies Record<string, Photo>;
