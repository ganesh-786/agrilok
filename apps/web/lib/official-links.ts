// Link only to addresses we have confirmed are official (the owner's
// decision 6, 2026-09-30: "check whether it is official, then only link,
// because a link might be phishing").
//
// A citation or notice whose address is not on this list is still named, but
// its link is withheld and the reason shown. Hosts are matched exactly, never
// by suffix: "psc.gov.np.example.com" and "fakepsc.gov.np" are not official.
//
// The list is the approved domains of the source whitelist
// (data/sources/whitelist.yml) plus the commission and agency sites confirmed
// during research. It is kept by hand: nothing compares it with the whitelist
// automatically, and two commission hosts here are spelled differently from
// the whitelist's unapproved candidates. Add a host only after confirming it
// belongs to the authority it claims.

const OFFICIAL_HOSTS = new Set([
  // Public Service Commission and the seven provincial commissions.
  "psc.gov.np",
  "psc.koshi.gov.np",
  "ppsc.madhesh.gov.np",
  "ppsc.bagamati.gov.np",
  "spsc.bagamati.gov.np",
  "ppsc.gandaki.gov.np",
  "ppsc.lumbini.gov.np",
  "ppsc.karnali.gov.np",
  "psc.sudurpashchim.gov.np",
  // Ministry, its agencies, research and law (whitelisted or confirmed).
  "moald.gov.np",
  "aitc.gov.np",
  "dls.gov.np",
  "sqcc.gov.np",
  "seed.sqcc.gov.np",
  "narc.gov.np",
  "agritechinfo.narc.gov.np",
  "lawcommission.gov.np",
  // The shared government file host that official pages link their PDFs to.
  "giwmscdnone.gov.np",
  "giwmscdntwo.gov.np",
]);

const ARCHIVE_HOST = "web.archive.org";

export type OfficialLink =
  | { ok: true; href: string; host: string; archived: boolean }
  | { ok: false; host: string | null; reason: "not_official" | "not_https" | "invalid" };

function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

/**
 * Check an address before it becomes a link.
 *
 * An Internet Archive copy is accepted only when the page it preserves is on
 * an official host, and it is marked as archived so the student knows it is a
 * copy, not the government site.
 */
export function checkOfficialLink(address: string | null | undefined): OfficialLink {
  if (!address) return { ok: false, host: null, reason: "invalid" };
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return { ok: false, host: null, reason: "invalid" };
  }
  const host = hostOf(url);
  if (url.protocol !== "https:") return { ok: false, host, reason: "not_https" };
  if (url.username || url.password) return { ok: false, host, reason: "invalid" };
  if (OFFICIAL_HOSTS.has(host)) return { ok: true, href: url.toString(), host, archived: false };
  if (host === ARCHIVE_HOST) {
    const inner = url.pathname.replace(/^\/web\/[^/]+\//, "");
    const original = checkOfficialLink(inner.startsWith("http") ? inner : null);
    if (original.ok) return { ok: true, href: url.toString(), host: original.host, archived: true };
    return { ok: false, host, reason: "not_official" };
  }
  return { ok: false, host, reason: "not_official" };
}

/** For tests: the hosts on the list. */
export function officialHosts(): string[] {
  return [...OFFICIAL_HOSTS];
}
