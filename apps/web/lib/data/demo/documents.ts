// Official documents the prototype cites. Each is a real government document
// from the Phase 0 corpus (spike/corpus/sources.yaml): the address, the date
// it was fetched and the date printed on it are copied from there, not made
// up. Demo content never cites these for a passage they do not contain; it
// uses a placeholder citation instead (docs/student-experience.md, section 8).

import type { OfficialDocument, Text } from "@/lib/contracts";

export const LUMBINI_PPSC: Text = {
  ne: "प्रदेश लोक सेवा आयोग, लुम्बिनी प्रदेश",
  en: "Lumbini Province Public Service Commission",
};

export const documents: Record<string, OfficialDocument> = {
  "LUM-03": {
    id: "LUM-03",
    kind: "syllabus",
    title: {
      ne: "कृषि सेवा, सहायक स्तर चौथो तह (कृषि प्रसार, माटो विज्ञान, एग्री इको एण्ड मार्केटिङ, बागवानी, बाली संरक्षण र बाली विकास समूह) को पाठ्यक्रम",
      en: "Agriculture Service, Assistant Level 4 (Agriculture Extension, Soil Science, Agri Economics and Marketing, Horticulture, Crop Protection and Crop Development groups): syllabus",
    },
    publisher: LUMBINI_PPSC,
    url: "https://ppsc.lumbini.gov.np/media/list/%E0%A4%95%E0%A4%B7_%E0%A4%8F%E0%A4%95%E0%A4%95%E0%A4%A4.%E0%A4%AA%E0%A4%B0%E0%A4%B5%E0%A4%A7%E0%A4%95_%E0%A4%9A%E0%A4%A5_gQDmn7u.pdf",
    referringPage: null,
    fetchedOn: "2026-09-16",
    printedDate: { ne: "स्वीकृत मिति २०८२/१०/२६", en: "Approved 2082/10/26 BS" },
  },
  "LUM-01": {
    id: "LUM-01",
    kind: "syllabus",
    title: {
      ne: "कृषि सेवा, अधिकृत सातौं तह (एग्री एक्सटेन्सन, हर्टिकल्चर, एग्रोनोमी, प्लान्ट प्रोटेक्सन, एग्री इको एण्ड मार्केटिङ र स्वायल साइन्स समूह) को पाठ्यक्रम",
      en: "Agriculture Service, Officer Level 7 (Agri Extension, Horticulture, Agronomy, Plant Protection, Agri Economics and Marketing, Soil Science groups): syllabus",
    },
    publisher: LUMBINI_PPSC,
    url: "https://ppsc.lumbini.gov.np/media/list/agri_7th.pdf",
    referringPage: null,
    fetchedOn: "2026-09-16",
    printedDate: { ne: "स्वीकृत मिति २०८०/१२/२०", en: "Approved 2080/12/20 BS" },
  },
  "REF-04": {
    id: "REF-04",
    kind: "statute",
    title: {
      ne: "नेपालको संविधान (युनिकोड संस्करण, भदौ २०८१ सम्म अद्यावधिक)",
      en: "Constitution of Nepal (Unicode edition, updated to Bhadra 2081)",
    },
    publisher: { ne: "नेपाल कानुन आयोग", en: "Nepal Law Commission" },
    url: "https://giwmscdnone.gov.np/media/pdf_upload/%E0%A4%A8%E0%A5%87%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A4%95%E0%A5%8B%20%E0%A4%B8_%E0%A4%82%E0%A4%B5%E0%A4%BF%E0%A4%A7%E0%A4%BE%E0%A4%A8%20unicode%20%E0%A4%AD%E0%A4%BE%E0%A4%A6%E0%A5%8D%E0%A4%B0%20%E0%A5%A8%E0%A5%A6%E0%A5%AE%E0%A5%A7_mtbuyjt.pdf",
    referringPage: "https://lawcommission.gov.np/content/13437/nepal-s-constitution/",
    fetchedOn: "2026-09-19",
    printedDate: {
      ne: "नेपाल राजपत्रमा प्रकाशन मिति २०७२/०६/०३",
      en: "Published in the Nepal Gazette 2072/06/03 BS",
    },
  },
};

/**
 * Publishers a placeholder citation may point to: the kind of official source
 * a study note or question will cite once it is written from one. Only the
 * publisher's own site is linked, never a deep link to an unchecked passage.
 */
export const publishers = {
  aitc: {
    publisher: {
      ne: "कृषि सूचना तथा प्रशिक्षण केन्द्रका प्राविधिक पुस्तिका (aitc.gov.np)",
      en: "Technical manuals of the Agriculture Information and Training Center (aitc.gov.np)",
    },
    homepage: "https://aitc.gov.np/",
  },
  moald: {
    publisher: {
      ne: "कृषि सम्बन्धी मन्त्रालय (moald.gov.np)",
      en: "Ministry responsible for agriculture (moald.gov.np)",
    },
    homepage: "https://moald.gov.np/",
  },
  sqcc: {
    publisher: {
      ne: "बीउ बिजन गुणस्तर नियन्त्रण केन्द्र (sqcc.gov.np)",
      en: "Seed Quality Control Centre (sqcc.gov.np)",
    },
    homepage: "https://sqcc.gov.np/",
  },
  lawcommission: {
    publisher: {
      ne: "नेपाल कानुन आयोग (lawcommission.gov.np)",
      en: "Nepal Law Commission (lawcommission.gov.np)",
    },
    homepage: "https://lawcommission.gov.np/",
  },
  publicAdmin: {
    publisher: {
      ne: "सार्वजनिक प्रशासन सम्बन्धी आधिकारिक सामग्री (थपिँदै)",
      en: "Official public administration material (being added)",
    },
    homepage: null,
  },
  university: {
    publisher: {
      ne: "विश्वविद्यालयको आधिकारिक जानकारी (थपिँदै)",
      en: "The university's official information (being added)",
    },
    homepage: null,
  },
  narc: {
    publisher: {
      ne: "राष्ट्रिय कृषि प्रविधि सूचना केन्द्र, नार्क (agritechinfo.narc.gov.np)",
      en: "National Agricultural Technology Information Centre, NARC (agritechinfo.narc.gov.np)",
    },
    homepage: "https://agritechinfo.narc.gov.np/",
  },
} as const;
