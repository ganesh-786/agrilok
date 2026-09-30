// A warning before sending, in the browser. The API applies the same check and
// is the one that actually stops the question (packages/core pii.py); this
// only saves the student a round trip. Keep the two patterns in step.

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const MOBILE = /(?<![0-9])(?:\+?977[\s-]?)?9[6-8][0-9](?:[\s-]?[0-9]){7}(?![0-9])/;
const LANDLINE = /(?<![0-9])0[1-9][0-9]?[\s-][0-9]{6,7}(?![0-9])/;

export function looksPersonal(text: string): boolean {
  const ascii = text.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  return EMAIL.test(ascii) || MOBILE.test(ascii) || LANDLINE.test(ascii);
}
