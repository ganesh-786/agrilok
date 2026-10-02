// Demo notices. Every title says it is a demo, so none can be mistaken for a
// real vacancy or deadline, and each links to the commission's real notice
// page rather than to a made-up file. Dates are set relative to today so the
// open, closing-soon and closed states are always there to test.

import type { Notice } from "@/lib/contracts";
import { addDays } from "@/lib/dates";

import { LUMBINI_PPSC } from "./documents";
import { t } from "./build";

const L4_GROUPS = [
  "agri_extension",
  "soil_science",
  "agri_economics_marketing",
  "horticulture",
  "crop_protection",
] as const;
const L7_GROUPS = [
  "agri_extension",
  "horticulture",
  "agronomy",
  "plant_protection",
  "agri_economics_marketing",
  "soil_science",
] as const;

const LUMBINI_NOTICES = "https://ppsc.lumbini.gov.np/";
const PSC_NOTICES = "https://psc.gov.np/category/notice-advertisement/all.html";
const KOSHI_NOTICES = "https://psc.koshi.gov.np/";

/** Demo notices for a given day (ISO date in Nepal). */
export function demoNotices(today: string): Notice[] {
  const d = (days: number) => addDays(today, days);
  return [
    {
      id: "l4-vacancy-open",
      kind: "vacancy",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "विज्ञापन: कृषि सेवा, सहायक स्तर चौथो तह (नमूना सूचना)",
        "Vacancy: Agriculture Service, Assistant Level 4 (demo notice)",
      ),
      summary: t(
        "कृषि प्रसार लगायतका समूहका सहायक स्तर चौथो तहका पदका लागि दरखास्त आह्वान गरिएको नमूना सूचना। पद संख्या, योग्यता र दस्तुर आधिकारिक सूचनामा हेर्नुहोस्।",
        "A demo call for applications for Level 4 agriculture posts, including Agriculture Extension. The number of posts, qualifications and fees are in the official notice.",
      ),
      publishedOn: d(-3),
      deadline: d(12),
      eventOn: null,
      appliesTo: { levels: ["level_4"], provinces: ["lumbini"], groups: [...L4_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l4-exam-schedule",
      kind: "exam",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "लिखित परीक्षा कार्यक्रम: सहायक स्तर चौथो तह, कृषि सेवा (नमूना सूचना)",
        "Written exam schedule: Assistant Level 4, Agriculture Service (demo notice)",
      ),
      summary: t(
        "प्रथम पत्रको लिखित परीक्षाको मिति, समय र परीक्षा केन्द्रको नमूना सूचना।",
        "A demo notice of the date, time and centres for the Paper I written exam.",
      ),
      publishedOn: d(-1),
      deadline: null,
      eventOn: d(40),
      appliesTo: { levels: ["level_4"], provinces: ["lumbini"], groups: [...L4_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l4-syllabus-update",
      kind: "syllabus",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "पाठ्यक्रम अद्यावधिक: सहायक स्तर चौथो तह, कृषि सेवा (नमूना सूचना)",
        "Syllabus update: Assistant Level 4, Agriculture Service (demo notice)",
      ),
      summary: t(
        "यो तहको हालको पाठ्यक्रम २०८२/१०/२६ मा स्वीकृत भएको हो, र यसभन्दा अगाडिको पाठ्यक्रम खारेज भएको छ (पाठ्यक्रमको द्रष्टव्य १५ र १६)। तपाईंले पढ्दै गरेको पाठ्यक्रमको मिति मिलाउनुहोस्।",
        "The current syllabus for this level was approved on 2082/10/26 and the earlier one was repealed (notes 15 and 16 of the syllabus). Check the date on the syllabus you are studying from.",
      ),
      publishedOn: d(-30),
      deadline: null,
      eventOn: null,
      appliesTo: { levels: ["level_4"], provinces: ["lumbini"], groups: [...L4_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l4-result",
      kind: "result",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "लिखित परीक्षाको नतिजा: सहायक स्तर चौथो तह (नमूना सूचना)",
        "Written exam result: Assistant Level 4 (demo notice)",
      ),
      summary: t(
        "अघिल्लो विज्ञापनको लिखित परीक्षामा छनौट भएकाहरूको नमूना नतिजा सूचना।",
        "A demo result notice for candidates selected in an earlier written exam.",
      ),
      publishedOn: d(-10),
      deadline: null,
      eventOn: null,
      appliesTo: { levels: ["level_4"], provinces: ["lumbini"], groups: [...L4_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l4-vacancy-closed",
      kind: "vacancy",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "विज्ञापन: कृषि सेवा, सहायक स्तर चौथो तह, अघिल्लो चरण (नमूना सूचना)",
        "Vacancy: Agriculture Service, Assistant Level 4, earlier round (demo notice)",
      ),
      summary: t(
        "दरखास्त दिने म्याद सकिसकेको अघिल्लो विज्ञापनको नमूना सूचना।",
        "A demo notice for an earlier round whose application period has ended.",
      ),
      publishedOn: d(-60),
      deadline: d(-30),
      eventOn: null,
      appliesTo: { levels: ["level_4"], provinces: ["lumbini"], groups: [...L4_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l4-policy",
      kind: "policy",
      provenance: "demo",
      checked: false,
      publisher: {
        ne: "कृषि सम्बन्धी मन्त्रालय (moald.gov.np)",
        en: "Ministry responsible for agriculture (moald.gov.np)",
      },
      title: t(
        "नीति सम्झना: पाठ्यक्रमले उल्लेख गरेको प्राङ्गारिक तथा जीवाणुमल निर्देशिका (नमूना सूचना)",
        "Policy reminder: the organic and bio-fertiliser directive named in your syllabus (demo notice)",
      ),
      summary: t(
        "पाठ्यक्रमको बुँदा ७.१० ले 'प्राङ्गारिक तथा जीवाणुमल निर्देशिका, २०७८' उल्लेख गरेको छ। पाठ्यक्रमका कानुन र नीति विज्ञापनको बखत कायम रूपमा पढ्नुपर्ने भएकाले संशोधन भए नभएको आधिकारिक साइटमा हेर्नुहोस्।",
        "Topic 7.10 of the syllabus names the Organic and Bio-fertiliser Directive, 2078. Laws and policies count as they stand at the advertisement, so check the official site for any change.",
      ),
      publishedOn: d(-20),
      deadline: null,
      eventOn: null,
      appliesTo: { levels: ["level_4"], provinces: ["lumbini"], groups: [...L4_GROUPS] },
      officialUrl: "https://moald.gov.np/",
    },
    {
      id: "l4-koshi-vacancy",
      kind: "vacancy",
      provenance: "demo",
      checked: false,
      publisher: {
        ne: "प्रदेश लोक सेवा आयोग, कोशी प्रदेश",
        en: "Koshi Province Public Service Commission",
      },
      title: t(
        "विज्ञापन: कृषि सेवा, चौथो तह, कोशी प्रदेश (नमूना सूचना)",
        "Vacancy: Agriculture Service, Level 4, Koshi Province (demo notice)",
      ),
      summary: t(
        "अर्को प्रदेशको नमूना सूचना। कोशीको पाठ्यक्रम र योग्यता लुम्बिनीभन्दा फरक हुन सक्छ।",
        "A demo notice from another province. Koshi's syllabus and requirements may differ from Lumbini's.",
      ),
      publishedOn: d(-7),
      deadline: d(8),
      eventOn: null,
      appliesTo: { levels: ["level_4"], provinces: ["koshi"], groups: "all" },
      officialUrl: KOSHI_NOTICES,
    },
    {
      id: "l7-vacancy-soon",
      kind: "vacancy",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "विज्ञापन: कृषि सेवा, अधिकृत सातौं तह (नमूना सूचना)",
        "Vacancy: Agriculture Service, Officer Level 7 (demo notice)",
      ),
      summary: t(
        "अधिकृत सातौं तहका कृषि पदका लागि दरखास्त आह्वानको नमूना सूचना। म्याद छिट्टै सकिँदैछ।",
        "A demo call for applications for Level 7 agriculture posts. The deadline is close.",
      ),
      publishedOn: d(-10),
      deadline: d(3),
      eventOn: null,
      appliesTo: { levels: ["level_7"], provinces: ["lumbini"], groups: [...L7_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l7-interview",
      kind: "exam",
      provenance: "demo",
      checked: false,
      publisher: LUMBINI_PPSC,
      title: t(
        "सामूहिक परीक्षण र अन्तर्वार्ता कार्यक्रम: अधिकृत सातौं तह (नमूना सूचना)",
        "Group test and interview schedule: Officer Level 7 (demo notice)",
      ),
      summary: t(
        "लिखित परीक्षाबाट छनौट भएकाहरूको सामूहिक परीक्षण र अन्तर्वार्ताको नमूना कार्यक्रम।",
        "A demo schedule for the group test and interview of candidates selected from the written exam.",
      ),
      publishedOn: d(-2),
      deadline: null,
      eventOn: d(20),
      appliesTo: { levels: ["level_7"], provinces: ["lumbini"], groups: [...L7_GROUPS] },
      officialUrl: LUMBINI_NOTICES,
    },
    {
      id: "l7-federal-vacancy",
      kind: "vacancy",
      provenance: "demo",
      checked: false,
      publisher: { ne: "लोक सेवा आयोग", en: "Public Service Commission" },
      title: t(
        "विज्ञापन: नेपाल कृषि सेवा, सातौं तह, संघ (नमूना सूचना)",
        "Vacancy: Nepal Agriculture Service, Level 7, federal (demo notice)",
      ),
      summary: t(
        "संघीय लोक सेवा आयोगको नमूना सूचना। संघको पाठ्यक्रम प्रदेशको भन्दा फरक हुन्छ।",
        "A demo notice from the federal commission. The federal syllabus differs from the provincial one.",
      ),
      publishedOn: d(-5),
      deadline: d(20),
      eventOn: null,
      appliesTo: { levels: ["level_7"], provinces: ["federal"], groups: "all" },
      officialUrl: PSC_NOTICES,
    },
  ];
}
