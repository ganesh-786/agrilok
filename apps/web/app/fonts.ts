import localFont from "next/font/local";

// Two self-hosted families (app/fonts/, SIL Open Font License), both from the
// Noto Devanagari project, so Nepali and English share one design in each.
//
// - Noto Sans Devanagari sets running text and the interface. Its tables carry
//   a Nepali language system, so with lang="ne" on the page it draws the Nepali
//   forms of the digits and letters that differ from Hindi. One variable file
//   per script covers every weight.
// - Noto Serif Devanagari sets headings and question stems, the way a printed
//   question paper sets them apart from its instructions. Only one weight is
//   used, so it ships as a static 600 instead of the variable file: 67 kB for
//   both scripts instead of 156 kB.
//
// The files are in the repository, not fetched at build time, so a build never
// depends on a font CDN, and the content security policy allows fonts from
// this origin only. They are the files Google Fonts serves for these families,
// unmodified, so shaping is exactly what the upstream project ships.
//
// preload is off on purpose: about 210 kB of type must not compete with the
// page itself on a slow connection. Text renders at once in the device's own
// Devanagari face and swaps when the file arrives. After the first visit the
// service worker and the browser cache hold it, so it also works offline.
//
// Each family is split by unicode-range, the way the browser would fetch it
// from a font service: a page with no Nepali heading never downloads the
// Devanagari serif file. The two ranges are written out in full each time
// because next/font reads these options at build time and accepts literals
// only, not a shared constant.

export const fontLatin = localFont({
  src: "./fonts/NotoSansDevanagari-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-latin",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const fontDevanagari = localFont({
  src: "./fonts/NotoSansDevanagari-devanagari.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  // The automatic fallback is tuned against Arial, which has no Devanagari.
  adjustFontFallback: false,
  variable: "--font-devanagari",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09",
    },
  ],
});

export const fontSerifLatin = localFont({
  src: "./fonts/NotoSerifDevanagari-600-latin.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: false,
  // A serif heading swaps in over a serif fallback, sized to match.
  adjustFontFallback: "Times New Roman",
  variable: "--font-serif-latin",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const fontSerifDevanagari = localFont({
  src: "./fonts/NotoSerifDevanagari-600-devanagari.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-serif-devanagari",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09",
    },
  ],
});
