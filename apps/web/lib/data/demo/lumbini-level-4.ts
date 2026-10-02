// Lumbini Province, Level 4 (Assistant), agriculture groups.
//
// The exam scheme, marks, time, question distribution, rules and topic titles
// are taken from the official syllabus LUM-03 (approved 2082/10/26), and cite
// it. The study notes and most questions are demo content written for the
// prototype: labelled as such, and citing a placeholder, never a passage they
// were not taken from. Topic titles are a selection; the syllabus lists more.

import type { Question, StudyNote, Syllabus } from "@/lib/contracts";

import { official, placeholder, question, t } from "./build";

const DOC = "LUM-03";

export const syllabus: Syllabus = {
  id: "lumbini-level-4-agriculture",
  level: "level_4",
  province: "lumbini",
  groups: [
    "agri_extension",
    "soil_science",
    "agri_economics_marketing",
    "horticulture",
    "crop_protection",
  ],
  documentId: DOC,
  title: t("कृषि सेवा, सहायक स्तर चौथो तह", "Agriculture Service, Assistant Level 4"),
  review: "ai_assisted_pending_review",
  negativeMarkingPercent: 20,
  partial: true,
  stages: [
    {
      id: "stage-1",
      kind: "written",
      title: t("प्रथम चरण: लिखित परीक्षा (प्रथम पत्र)", "Stage 1: written exam (Paper I)"),
      marks: 100,
      detail: t("वस्तुगत बहुवैकल्पिक, ४५ मिनेट", "Multiple choice, 45 minutes"),
    },
    {
      id: "stage-2",
      kind: "written",
      title: t("द्वितीय चरण: लिखित परीक्षा (द्वितीय पत्र)", "Stage 2: written exam (Paper II)"),
      marks: 100,
      detail: t(
        "विषयगत, २ घण्टा १५ मिनेट। प्रथम पत्रमा उत्तीर्ण भएकाले मात्र दिन पाउँछन्।",
        "Written answers, 2 hours 15 minutes. Only for candidates who pass Paper I.",
      ),
    },
    {
      id: "stage-3",
      kind: "interview",
      title: t("अन्तिम चरण: अन्तर्वार्ता", "Final stage: interview"),
      marks: 30,
      detail: t("मौखिक अन्तर्वार्ता", "Oral interview"),
    },
  ],
  papers: [
    {
      id: "p1",
      number: 1,
      title: t(
        "प्रथम पत्र: सामान्य ज्ञान, सार्वजनिक व्यवस्थापन र सेवा सम्बन्धी कार्य-ज्ञान",
        "Paper I: General awareness, public management and job knowledge",
      ),
      format: "objective",
      fullMarks: 100,
      passMarks: 40,
      minutes: 45,
      pattern: t("५० बहुवैकल्पिक प्रश्न × २ अङ्क", "50 multiple-choice questions × 2 marks"),
      questionCount: 50,
      marksPerQuestion: 2,
      sections: [
        {
          id: "p1-a",
          title: t(
            "खण्ड क: सामान्य ज्ञान र सार्वजनिक व्यवस्थापन",
            "Section A: General awareness and public management",
          ),
          questions: 20,
          marks: 40,
          weights: [
            { subjectId: "gk", questions: 10, marks: 20 },
            { subjectId: "pm", questions: 10, marks: 20 },
          ],
        },
        {
          id: "p1-b",
          title: t("खण्ड ख: सेवा सम्बन्धी कार्य-ज्ञान", "Section B: Job-based knowledge"),
          questions: 30,
          marks: 60,
          weights: [
            { subjectId: "u1", questions: 6, marks: 12 },
            { subjectId: "u2", questions: 4, marks: 8 },
            { subjectId: "u3", questions: 4, marks: 8 },
            { subjectId: "u4", questions: 4, marks: 8 },
            { subjectId: "u5", questions: 4, marks: 8 },
            { subjectId: "u6", questions: 4, marks: 8 },
            { subjectId: "u7", questions: 4, marks: 8 },
          ],
        },
      ],
    },
    {
      id: "p2",
      number: 2,
      title: t("द्वितीय पत्र: सेवा सम्बन्धी कार्य-ज्ञान", "Paper II: Job-based knowledge"),
      format: "subjective",
      fullMarks: 100,
      passMarks: 40,
      minutes: 135,
      pattern: t(
        "छोटो उत्तर १२ × ५ अङ्क र लामो उत्तर ४ × १० अङ्क",
        "12 short answers × 5 marks and 4 long answers × 10 marks",
      ),
      questionCount: null,
      marksPerQuestion: null,
      sections: [
        {
          id: "p2-a",
          title: t("खण्ड क", "Section A"),
          questions: null,
          marks: 50,
          weights: [
            { subjectId: "u1", questions: null, marks: 20 },
            { subjectId: "u2", questions: null, marks: 15 },
            { subjectId: "u3", questions: null, marks: 15 },
          ],
        },
        {
          id: "p2-b",
          title: t("खण्ड ख", "Section B"),
          questions: null,
          marks: 50,
          weights: [
            { subjectId: "u4", questions: null, marks: 10 },
            { subjectId: "u5", questions: null, marks: 15 },
            { subjectId: "u6", questions: null, marks: 15 },
            { subjectId: "u7", questions: null, marks: 10 },
          ],
        },
      ],
    },
  ],
  rules: {
    negativeMarking: {
      text: t(
        "बहुवैकल्पिक प्रश्नको प्रत्येक गलत उत्तरमा त्यो प्रश्नको २० प्रतिशत अङ्क कट्टा हुन्छ। उत्तर नदिएको प्रश्नमा अङ्क पाइँदैन, कट्टा पनि हुँदैन।",
        "Each wrong multiple-choice answer loses 20 percent of that question's marks. An unanswered question earns nothing and loses nothing.",
      ),
      citation: official(DOC, t("द्रष्टव्य ४", "Note 4"), {
        text: "प्रत्येक गलत उत्तर बापत २० प्रतिशत अङ्क कट्टा गरिनेछ । तर उत्तर नदिएमा त्यस बापत अङ्क दिइनेछैन र अङ्क कट्टा पनि गरिनेछैन।",
        translation: t(
          "प्रत्येक गलत उत्तरमा २० प्रतिशत अङ्क कट्टा हुन्छ; उत्तर नदिएमा अङ्क पनि पाइँदैन, कट्टा पनि हुँदैन।",
          "20 percent of the marks are deducted for each wrong answer; an unanswered question gets no marks and no deduction.",
        ),
      }),
    },
    laws: {
      text: t(
        "पाठ्यक्रममा उल्लेख भएका कानुन, ऐन, नियम र नीति विज्ञापन निस्किँदा जुन रूपमा कायम छन्, त्यही रूपमा (संशोधनसहित) पढ्नुपर्छ।",
        "Laws, acts, rules and policies named in the syllabus count as they stand when the vacancy is advertised, including amendments.",
      ),
      citation: official(DOC, t("द्रष्टव्य ६", "Note 6")),
    },
    devices: {
      text: t(
        "बहुवैकल्पिक परीक्षामा क्याल्कुलेटर, मोबाइल फोन, स्मार्ट घडी जस्ता मेमोरी भएका उपकरण प्रयोग गर्न पाइँदैन।",
        "No calculators, mobile phones, smart watches or other devices with memory in the multiple-choice exam.",
      ),
      citation: official(DOC, t("द्रष्टव्य ७", "Note 7")),
    },
    medium: {
      text: t(
        "लिखित परीक्षा नेपाली, अंग्रेजी वा दुवै भाषामा दिन सकिन्छ।",
        "The written exam can be taken in Nepali, English or both.",
      ),
      citation: official(DOC, t("द्रष्टव्य २", "Note 2")),
    },
    progression: {
      text: t(
        "प्रथम पत्रमा न्यूनतम उत्तीर्णाङ्क ल्याएकाले मात्र द्वितीय पत्रको परीक्षा दिन पाउँछन्। लिखित परीक्षाबाट छनौट भएकाले मात्र अन्तर्वार्ता दिन्छन्।",
        "Only candidates who reach the pass mark in Paper I sit Paper II, and only those selected from the written exams are interviewed.",
      ),
      citation: official(DOC, t("द्रष्टव्य ११ र १३", "Notes 11 and 13")),
    },
  },
  subjects: [
    {
      id: "gk",
      number: "1",
      area: "general",
      title: t("सामान्य ज्ञान", "General awareness"),
      topics: [
        {
          id: "gk-1.1",
          code: "1.1",
          title: t(
            "नेपालको भौगोलिक अवस्था, प्राकृतिक स्रोत र साधनहरू",
            "Nepal's geography and natural resources",
          ),
          keywords: ["geography", "bhugol", "भूगोल", "natural resources"],
        },
        {
          id: "gk-1.3",
          code: "1.3",
          title: t(
            "लुम्बिनी प्रदेशको भौगोलिक, ऐतिहासिक, सांस्कृतिक र सामाजिक अवस्था",
            "Geography, history, culture and society of Lumbini Province",
          ),
          keywords: ["lumbini", "province", "प्रदेश"],
        },
        {
          id: "gk-1.6",
          code: "1.6",
          title: t(
            "नेपालको संविधान (भाग १ देखि ५ सम्म र अनुसूचीहरू)",
            "The Constitution of Nepal (Parts 1 to 5 and the schedules)",
          ),
          keywords: ["constitution", "sambidhan", "samvidhan", "संविधान", "schedule", "अनुसूची"],
        },
        {
          id: "gk-1.7",
          code: "1.7",
          title: t("संयुक्त राष्ट्र संघ (UNO) र सार्क (SAARC)", "The United Nations and SAARC"),
          keywords: ["uno", "un", "saarc", "सार्क"],
        },
      ],
    },
    {
      id: "pm",
      number: "2",
      area: "general",
      title: t("सार्वजनिक व्यवस्थापन", "Public management"),
      topics: [
        {
          id: "pm-2.1.5",
          code: "2.1.5",
          title: t(
            "कार्यालय कार्यविधि: पत्र व्यवहार, दर्ता र चलानी, परिपत्र, तोक आदेश, टिप्पणी लेखन र अभिलेख व्यवस्थापन",
            "Office procedure: correspondence, registration and dispatch, circulars, orders, notes and records",
          ),
          keywords: ["darta", "chalani", "दर्ता", "चलानी", "office", "कार्यालय", "record"],
        },
        {
          id: "pm-2.3",
          code: "2.3",
          title: t(
            "सार्वजनिक (नागरिक) बडापत्र: महत्त्व र आवश्यकता",
            "The citizen charter: importance and need",
          ),
          keywords: ["charter", "badapatra", "बडापत्र"],
        },
        {
          id: "pm-2.5",
          code: "2.5",
          title: t(
            "भ्रष्टाचार निवारण ऐन, २०५९ (परिच्छेद २: कसुर र सजाय)",
            "Prevention of Corruption Act, 2059 (Chapter 2: offences and penalties)",
          ),
          keywords: ["corruption", "bhrastachar", "भ्रष्टाचार"],
        },
      ],
    },
    {
      id: "u1",
      number: "1",
      area: "technical",
      title: t("कृषि सम्बन्धी", "General agriculture"),
      topics: [
        {
          id: "u1-1.2",
          code: "1.2",
          title: t("राष्ट्रीय कृषि नीति, २०६१", "National Agriculture Policy, 2061"),
          keywords: ["policy", "niti", "नीति", "krishi niti"],
        },
        {
          id: "u1-1.4",
          code: "1.4",
          title: t(
            "कृषि विकास रणनीति २०१५–२०३५ र यसका प्रमुख विशेषताहरू",
            "Agriculture Development Strategy 2015–2035 and its main features",
          ),
          keywords: ["ads", "strategy", "रणनीति"],
        },
        {
          id: "u1-1.11",
          code: "1.11",
          title: t(
            "कृषि वस्तुको उत्पादनोपरान्त हुने क्षति र क्षति कम गर्ने उपायहरू",
            "Post-harvest losses and how to reduce them",
          ),
          keywords: ["post harvest", "postharvest", "storage", "भण्डारण", "क्षति"],
        },
        {
          id: "u1-1.12",
          code: "1.12",
          title: t(
            "प्राङ्गारिक कृषि उत्पादन र असल कृषि अभ्यास",
            "Organic production and good agricultural practice",
          ),
          keywords: ["organic", "gap", "प्राङ्गारिक", "jaivik"],
        },
        {
          id: "u1-1.14",
          code: "1.14",
          title: t(
            "कृषि क्षेत्रमा ऋण लगानी र बाली बीमा सम्बन्धी व्यवस्था",
            "Agricultural credit and crop insurance",
          ),
          keywords: ["insurance", "bima", "बीमा", "credit", "loan", "ऋण"],
        },
      ],
    },
    {
      id: "u2",
      number: "2",
      area: "technical",
      title: t("बागवानी", "Horticulture"),
      topics: [
        {
          id: "u2-2.1",
          code: "2.1",
          title: t(
            "बागवानी (हर्टिकल्चर) को परिभाषा र यसका प्रकारहरू",
            "Definition and branches of horticulture",
          ),
          keywords: ["horticulture", "bagwani", "बागवानी", "pomology", "olericulture"],
        },
        {
          id: "u2-2.5",
          code: "2.5",
          title: t(
            "करेसाबारी: परिचय, महत्त्व र पोषण सुधारमा यसको भूमिका",
            "Kitchen gardens and their role in nutrition",
          ),
          keywords: ["kitchen garden", "karesabari", "करेसाबारी"],
        },
        {
          id: "u2-2.8",
          code: "2.8",
          title: t(
            "फलफूल बिरुवाको प्रसारण: बीउबाट र वानस्पतिक",
            "Propagation of fruit plants: from seed and vegetative",
          ),
          keywords: ["propagation", "grafting", "kalami", "कलमी", "layering", "budding", "cutting"],
        },
        {
          id: "u2-2.11",
          code: "2.11",
          title: t("फलफूल बोटको तालिम र काँटछाँट", "Training and pruning of fruit trees"),
          keywords: ["pruning", "training", "काँटछाँट"],
        },
      ],
    },
    {
      id: "u3",
      number: "3",
      area: "technical",
      title: t("कृषि प्रसार", "Agriculture extension"),
      topics: [
        {
          id: "u3-3.1",
          code: "3.1",
          title: t(
            "कृषि प्रसार: परिचय, अवधारणा, सिद्धान्त, महत्त्व र विशेषताहरू",
            "Agricultural extension: concept, principles and importance",
          ),
          keywords: ["extension", "prasar", "प्रसार"],
        },
        {
          id: "u3-3.4",
          code: "3.4",
          title: t(
            "कृषि प्रसार तरिकाहरू र तिनको सञ्चालन विधि",
            "Extension teaching methods and how they are run",
          ),
          keywords: ["method", "demonstration", "प्रदर्शन", "field day", "extension method"],
        },
        {
          id: "u3-3.5",
          code: "3.5",
          title: t(
            "अगुवा कृषकको महत्त्व, विशेषता र भूमिका",
            "The lead farmer: importance and role",
          ),
          keywords: ["lead farmer", "aguwa", "अगुवा"],
        },
        {
          id: "u3-3.8",
          code: "3.8",
          title: t(
            "नवप्रवर्तन, प्रसार र अपनाउने समूहहरू (Innovation, diffusion and adopters' categories)",
            "Innovation, diffusion and adopter categories",
          ),
          keywords: ["adopter", "innovation", "diffusion", "rogers", "innovators", "laggards"],
        },
      ],
    },
    {
      id: "u4",
      number: "4",
      area: "technical",
      title: t("बाली विज्ञान", "Agronomy"),
      topics: [
        {
          id: "u4-4.2",
          code: "4.2",
          title: t(
            "खाद्यान्न, दलहन, तेलहन तथा औद्योगिक बालीहरूको वैज्ञानिक वर्गीकरण र नामकरण",
            "Classification and scientific names of cereals, pulses, oilseeds and industrial crops",
          ),
          keywords: [
            "scientific name",
            "classification",
            "वैज्ञानिक नाम",
            "pulse",
            "cereal",
            "oilseed",
          ],
        },
        {
          id: "u4-4.4",
          code: "4.4",
          title: t(
            "बीउको परिभाषा, प्रमाणीकरण र यथार्थ संकेतपत्र पद्धति अनुसार बीउका पुस्ताहरू",
            "Seed: definition, certification and seed classes under truthful labelling",
          ),
          keywords: ["seed", "biu", "बीउ", "certification", "breeder", "foundation", "certified"],
        },
        {
          id: "u4-4.5",
          code: "4.5",
          title: t(
            "गुणस्तरीय बीउ उत्पादन प्रविधि र उत्पादनपछि गुणस्तर कायम राख्ने विधि",
            "Quality seed production and keeping seed quality after harvest",
          ),
          keywords: ["seed production", "isolation", "पृथकीकरण"],
        },
      ],
    },
    {
      id: "u5",
      number: "5",
      area: "technical",
      title: t("बाली संरक्षण", "Crop protection"),
      topics: [
        {
          id: "u5-5.2",
          code: "5.2",
          title: t(
            "मुसा एवं झारपातको पहिचान, नोक्सानी, लक्षण र रोकथाम",
            "Rodents and weeds: identification, damage and control",
          ),
          keywords: ["weed", "jhar", "झार", "rodent", "rat", "मुसा"],
        },
        {
          id: "u5-5.3",
          code: "5.3",
          title: t(
            "एकीकृत शत्रुजीव व्यवस्थापन (IPM): परिचय, सिद्धान्त र महत्त्व",
            "Integrated pest management (IPM): concept, principles and importance",
          ),
          keywords: ["ipm", "integrated pest", "एकीकृत शत्रुजीव", "pest management"],
        },
        {
          id: "u5-5.6",
          code: "5.6",
          title: t(
            "रोग, कीरा र झारपात व्यवस्थापनमा प्राकृतिक शत्रुजीव (मित्रजीव)",
            "Natural enemies (beneficial organisms) in managing pests, diseases and weeds",
          ),
          keywords: ["natural enemy", "mitrajiv", "मित्रजीव", "ladybird", "predator"],
        },
        {
          id: "u5-5.13",
          code: "5.13",
          title: t(
            "बाली उपचार शिविर (Plant Clinic): महत्त्व र सञ्चालन",
            "Plant clinics: why they matter and how they run",
          ),
          keywords: ["plant clinic", "clinic", "शिविर"],
        },
      ],
    },
    {
      id: "u6",
      number: "6",
      area: "technical",
      title: t("कृषि अर्थशास्त्र", "Agricultural economics"),
      topics: [
        {
          id: "u6-6.2",
          code: "6.2",
          title: t("माग तथा पूर्तिको परिचय र नियम", "Demand and supply"),
          keywords: ["demand", "supply", "माग", "पूर्ति", "price"],
        },
        {
          id: "u6-6.5",
          code: "6.5",
          title: t(
            "फार्मगेट, थोक तथा खुद्रा मूल्यको अवधारणा",
            "Farm-gate, wholesale and retail prices",
          ),
          keywords: ["farm gate", "farmgate", "wholesale", "retail", "मूल्य"],
        },
        {
          id: "u6-6.9",
          code: "6.9",
          title: t("प्राथमिक र सहायक तथ्याङ्क: परिचय र स्रोत", "Primary and secondary data"),
          keywords: ["primary data", "secondary data", "तथ्याङ्क", "data"],
        },
        {
          id: "u6-6.10",
          code: "6.10",
          title: t("बाली कटानी (Crop Cutting) र यसको महत्त्व", "Crop cutting and why it matters"),
          keywords: ["crop cutting", "yield estimate", "बाली कटानी"],
        },
      ],
    },
    {
      id: "u7",
      number: "7",
      area: "technical",
      title: t("माटो व्यवस्थापन", "Soil management"),
      topics: [
        {
          id: "u7-7.1",
          code: "7.1",
          title: t(
            "माटोको परिभाषा, माटो बन्ने प्रक्रिया र नेपालको माटो",
            "What soil is, how it forms, and the soils of Nepal",
          ),
          keywords: ["soil", "mato", "माटो", "weathering", "formation"],
        },
        {
          id: "u7-7.3",
          code: "7.3",
          title: t(
            "बिरुवालाई आवश्यक खाद्यतत्वहरूको काम, कमीका लक्षण र रोकथाम",
            "Plant nutrients: functions, deficiency symptoms and correction",
          ),
          keywords: ["nutrient", "deficiency", "खाद्यतत्व", "nitrogen", "zinc", "khaira", "boron"],
        },
        {
          id: "u7-7.8",
          code: "7.8",
          title: t(
            "भू-क्षय: कारण, प्रकार तथा व्यवस्थापन",
            "Soil erosion: causes, types and management",
          ),
          keywords: ["erosion", "bhu kshaya", "भू-क्षय", "terrace", "contour"],
        },
        {
          id: "u7-7.9",
          code: "7.9",
          title: t("एकीकृत खाद्यतत्व व्यवस्थापन", "Integrated plant nutrient management"),
          keywords: ["ipnm", "inm", "integrated nutrient", "एकीकृत खाद्य"],
        },
      ],
    },
  ],
};

/** Official citations for a topic line, used where the syllabus itself states the fact. */
const topicLine = (paperSection: string, code: string, quote: string) =>
  official(
    DOC,
    t(
      `${paperSection.split("|")[0]}, बुँदा ${code}`,
      `${paperSection.split("|")[1]}, topic ${code}`,
    ),
    { text: quote },
  );

const P1A = "प्रथम पत्र, खण्ड क|Paper I, Section A";
const P1B = "प्रथम पत्र, खण्ड ख|Paper I, Section B";

export const notes: StudyNote[] = [
  {
    topicId: "u5-5.3",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "कीरा, रोग र झारलाई आर्थिक नोक्सानी हुने स्तरभन्दा तल राख्न धेरै उपाय मिलाएर प्रयोग गर्ने तरिका।",
      "Keeping pests, diseases and weeds below the level that costs money, by combining several methods.",
    ),
    explanation: [
      t(
        "एकीकृत शत्रुजीव व्यवस्थापन (IPM) मा खेती गर्ने तरिका, भौतिक उपाय, मित्रजीव र आवश्यक परेमा मात्र विषादी मिलाएर प्रयोग गरिन्छ। लक्ष्य शत्रुजीव पूरै सखाप पार्नु होइन, नोक्सानी आर्थिक रूपमा थेग्न सकिने स्तरभित्र राख्नु हो।",
        "Integrated pest management (IPM) combines cultural practices, physical methods, natural enemies and, only when needed, pesticides. The aim is not to wipe out every pest but to keep the damage below the level where it costs the farmer money.",
      ),
      t(
        "विषादी तब मात्र प्रयोग गरिन्छ जब खेतको नियमित अवलोकनले शत्रुजीवको संख्या आर्थिक थ्रेसहोल्ड नाघेको देखाउँछ। यसो गर्दा मित्रजीव जोगिन्छन्, लागत घट्छ र विषादीको अवशेष कम हुन्छ।",
        "Pesticides are used only when regular field observation shows pest numbers have passed the economic threshold. This protects natural enemies, lowers costs and reduces pesticide residues.",
      ),
      t(
        "किसानले आफ्नै खेतमा नियमित अवलोकन गरेर निर्णय गर्न सिकून् भन्ने IPM को मुख्य उद्देश्य हो। यसका लागि कृषक पाठशाला जस्ता समूहमा सिक्ने तरिका प्रयोग हुन्छन्।",
        "A core aim of IPM is that farmers learn to observe their own fields and decide for themselves, often through group learning such as farmer field schools.",
      ),
    ],
    keyPoints: [
      t(
        "स्वस्थ बाली: उपयुक्त जात, सफा बीउ, समयमै रोपाइँ, सन्तुलित मलखाद",
        "Healthy crop: suitable variety, clean seed, timely planting, balanced nutrients",
      ),
      t(
        "लेडीबर्ड बिटल, माकुरा जस्ता मित्रजीव जोगाउने",
        "Protect natural enemies such as ladybird beetles and spiders",
      ),
      t("खेतको नियमित अवलोकन र शत्रुजीवको गणना", "Observe the field regularly and count pests"),
      t(
        "आर्थिक थ्रेसहोल्ड नाघेपछि मात्र विषादी, सुरक्षित तरिकाले",
        "Pesticides only after the economic threshold, used safely",
      ),
    ],
    citations: [
      placeholder("aitc"),
      topicLine(
        P1B,
        "५.३",
        "एकीकृत शत्रुजीव व्यवस्थापन (Integrated pest management) परिचय, सिद्धान्त र महत्व",
      ),
    ],
  },
  {
    topicId: "u2-2.8",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "नयाँ बिरुवा बीउबाट (लैङ्गिक) वा बोटकै भागबाट (वानस्पतिक) उत्पादन गर्ने तरिका।",
      "Raising new plants from seed (sexual) or from parts of a plant (vegetative).",
    ),
    explanation: [
      t(
        "बीउबाट प्रसारण सजिलो र सस्तो हुन्छ, तर बीउबाट उम्रेको बिरुवा प्रायः माउ बोटजस्तो हुँदैन र फल्न ढिलो गर्छ। त्यसैले फलफूलमा बीउ प्रायः मूलवृन्त (rootstock) उत्पादन र नयाँ जात विकासमा प्रयोग गरिन्छ।",
        "Seed propagation is easy and cheap, but seedlings are often not true to the parent and are slow to bear. In fruit growing, seed is mostly used to raise rootstocks and to breed new varieties.",
      ),
      t(
        "वानस्पतिक प्रसारणमा कटिङ, लेयरिङ, कलमी (ग्राफ्टिङ), आँखा कलमी (बडिङ) र तन्तु प्रसारण पर्छन्। यसरी उत्पादन भएका बिरुवा माउ बोटजस्तै हुन्छन् र छिटो फल्छन्।",
        "Vegetative propagation includes cuttings, layering, grafting, budding and tissue culture. Plants raised this way are true to the parent and bear earlier.",
      ),
      t(
        "बाली अनुसार तरिका फरक हुन्छ: लिचीमा गुटी कलमी (air layering), आँपमा कलमी, सुन्तलाजात र गुलाफमा आँखा कलमी, अङ्गुरमा कटिङ, र केरामा अङ्कुर वा तन्तु प्रसारण प्रचलित छन्।",
        "The method depends on the crop: air layering for litchi, grafting for mango, budding for citrus and roses, cuttings for grapes, and suckers or tissue culture for banana.",
      ),
    ],
    keyPoints: [
      t("बीउबाट: सस्तो, तर माउजस्तो नहुन सक्छ", "From seed: cheap, but may not be true to type"),
      t("वानस्पतिक: माउजस्तै, छिटो फल्ने", "Vegetative: true to type, bears earlier"),
      t("लिची: गुटी कलमी · आँप: कलमी", "Litchi: air layering · Mango: grafting"),
      t("सुन्तलाजात: आँखा कलमी · अङ्गुर: कटिङ", "Citrus: budding · Grapes: cuttings"),
    ],
    citations: [placeholder("aitc"), topicLine(P1B, "२.८", "फलफूल बिरुवाको प्रसारण")],
  },
  {
    topicId: "u3-3.4",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "किसानसम्म प्रविधि पुर्‍याउने तरिकालाई व्यक्तिगत, समूह र आम सम्पर्क गरी तीन भागमा बाँडिन्छ।",
      "Ways of reaching farmers fall into individual, group and mass contact methods.",
    ),
    explanation: [
      t(
        "व्यक्तिगत सम्पर्क तरिकामा खेतबारी तथा घर भ्रमण, कार्यालय भेट, टेलिफोन र व्यक्तिगत पत्र पर्छन्। यसले एउटा किसानको समस्या गहिराइमा बुझ्न मद्दत गर्छ, तर धेरै किसानसम्म पुग्न महँगो पर्छ।",
        "Individual contact methods include farm and home visits, office calls, telephone calls and personal letters. They help an extension worker understand one farmer's problem in depth, but are costly for reaching many farmers.",
      ),
      t(
        "समूह सम्पर्क तरिकामा विधि प्रदर्शन, परिणाम प्रदर्शन, समूह बैठक, कृषक दिवस, भ्रमण र तालिम पर्छन्। विधि प्रदर्शनले कुनै काम कसरी गर्ने भनेर देखाउँछ (जस्तै बीउ उपचार); परिणाम प्रदर्शनले प्रविधि अपनाउँदा आएको नतिजा तुलना गरेर देखाउँछ।",
        "Group contact methods include method demonstrations, result demonstrations, group meetings, field days, tours and training. A method demonstration shows how to do a task, such as treating seed; a result demonstration shows what a practice achieves, by comparison.",
      ),
      t(
        "आम सम्पर्क तरिकामा रेडियो, टेलिभिजन, पत्रपत्रिका, पर्चा, प्रदर्शनी, अभियान, मोबाइल एप र किसान कल सेन्टर पर्छन्। यसले धेरै किसानसम्म छिटो जानकारी पुर्‍याउँछ, तर दुईतर्फी छलफल कम हुन्छ।",
        "Mass contact methods include radio, television, newspapers, leaflets, exhibitions, campaigns, mobile apps and farmer call centres. They reach many farmers quickly but allow little two-way discussion.",
      ),
    ],
    keyPoints: [
      t(
        "व्यक्तिगत: भ्रमण, कार्यालय भेट, फोन, पत्र",
        "Individual: visits, office calls, phone, letters",
      ),
      t(
        "समूह: विधि र परिणाम प्रदर्शन, कृषक दिवस, तालिम",
        "Group: method and result demonstrations, field days, training",
      ),
      t(
        "आम: रेडियो, टिभी, पर्चा, प्रदर्शनी, मोबाइल एप",
        "Mass: radio, TV, leaflets, exhibitions, mobile apps",
      ),
      t(
        "विधि प्रदर्शन = कसरी गर्ने; परिणाम प्रदर्शन = के नतिजा आउँछ",
        "Method demonstration = how; result demonstration = what it achieves",
      ),
    ],
    citations: [
      placeholder("aitc"),
      topicLine(
        P1B,
        "३.४",
        "नेपालमा सञ्चालित विभिन्न कृषिप्रसार तरिकाहरु र तिनीहरुको सञ्चालन विधि",
      ),
    ],
  },
  {
    topicId: "u3-3.8",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "नयाँ प्रविधि समाजमा फैलँदा मानिसहरूले अपनाउने क्रम र समूह।",
      "How a new practice spreads, and the groups who adopt it in turn.",
    ),
    explanation: [
      t(
        "एभरेट रोजर्सको नवप्रवर्तन प्रसार (diffusion of innovations) सिद्धान्तअनुसार अपनाउनेहरू पाँच समूहमा पर्छन्: इनोभेटर (करिब २.५%), अर्ली एडप्टर (१३.५%), अर्ली मेजोरिटी (३४%), लेट मेजोरिटी (३४%) र ल्यागार्ड (१६%)।",
        "In Everett Rogers' diffusion of innovations theory, adopters fall into five groups: innovators (about 2.5%), early adopters (13.5%), early majority (34%), late majority (34%) and laggards (16%).",
      ),
      t(
        "प्रसार कार्यकर्ताका लागि अर्ली एडप्टर धेरै महत्त्वपूर्ण हुन्छन्, किनभने उनीहरू प्रायः गाउँका विचार नेता हुन्छन् र अरूले उनीहरूलाई हेरेर नयाँ प्रविधि अपनाउँछन्।",
        "Early adopters matter most to an extension worker: they are often local opinion leaders, and others adopt after watching them.",
      ),
      t(
        "अपनाउने प्रक्रिया प्रायः पाँच चरणमा पढाइन्छ: जानकारी, चासो, मूल्याङ्कन, परीक्षण र अपनाउने।",
        "The adoption process is usually taught in five stages: awareness, interest, evaluation, trial and adoption.",
      ),
    ],
    keyPoints: [
      t("इनोभेटर २.५% · अर्ली एडप्टर १३.५%", "Innovators 2.5% · Early adopters 13.5%"),
      t("अर्ली मेजोरिटी ३४% · लेट मेजोरिटी ३४%", "Early majority 34% · Late majority 34%"),
      t("ल्यागार्ड १६%", "Laggards 16%"),
      t("अर्ली एडप्टर प्रायः विचार नेता", "Early adopters are often opinion leaders"),
    ],
    citations: [
      placeholder("aitc"),
      topicLine(P1B, "३.८", "Innovation, diffusion and adopters' categories"),
    ],
  },
  {
    topicId: "u7-7.3",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "बिरुवालाई चाहिने १७ खाद्यतत्व, तिनको काम र कमी भएको पहिचान।",
      "The 17 nutrients plants need, what they do, and how to spot a shortage.",
    ),
    explanation: [
      t(
        "बिरुवालाई १७ वटा अत्यावश्यक खाद्यतत्व चाहिन्छन्। कार्बन, हाइड्रोजन र अक्सिजन हावा र पानीबाट पाइन्छन्। नाइट्रोजन, फस्फोरस र पोटासियम मुख्य खाद्यतत्व हुन्; क्याल्सियम, म्याग्नेसियम र सल्फर द्वितीयक खाद्यतत्व हुन्; फलाम, म्यांगानिज, जिंक, तामा, बोरन, मोलिब्डेनम, क्लोरिन र निकल सूक्ष्म खाद्यतत्व हुन्।",
        "Plants need 17 essential nutrients. Carbon, hydrogen and oxygen come from air and water. Nitrogen, phosphorus and potassium are the primary nutrients; calcium, magnesium and sulphur are secondary; iron, manganese, zinc, copper, boron, molybdenum, chlorine and nickel are micronutrients.",
      ),
      t(
        "कमीको लक्षण कुन पातमा पहिले देखिन्छ भन्ने कुराले तत्व चिनाउँछ। नाइट्रोजन बिरुवाभित्र सर्ने तत्व भएकाले यसको कमी पुराना (तल्ला) पातमा पहेँलोपन भएर देखिन्छ। फलाम नसर्ने भएकाले यसको कमी नयाँ पातका नसाबीच पहेँलो भएर देखिन्छ।",
        "Where a symptom appears first is a clue. Nitrogen moves within the plant, so its shortage shows as yellowing of older, lower leaves first. Iron does not move, so its shortage shows as yellowing between the veins of young leaves.",
      ),
      t(
        "धानमा जिंकको कमीले खैरा रोग लाग्छ, र काउलीमा बोरनको कमीले डाँठ खोक्रो र फूल खैरो हुन्छ। माटो जाँचका आधारमा मल हाल्दा कमी पनि हट्छ र खर्च पनि बच्छ।",
        "Zinc deficiency causes khaira disease in rice, and boron deficiency makes cauliflower stems hollow and curds brown. Fertilising on the basis of a soil test corrects shortages and saves money.",
      ),
    ],
    keyPoints: [
      t("१७ अत्यावश्यक खाद्यतत्व", "17 essential nutrients"),
      t("नाइट्रोजनको कमी: पुराना पात पहिले पहेँलो", "Nitrogen shortage: older leaves yellow first"),
      t(
        "फलामको कमी: नयाँ पातका नसाबीच पहेँलो",
        "Iron shortage: yellow between veins of young leaves",
      ),
      t(
        "जिंक: धानमा खैरा रोग · बोरन: काउलीमा खोक्रो डाँठ",
        "Zinc: khaira in rice · Boron: hollow stem in cauliflower",
      ),
    ],
    citations: [
      placeholder("aitc"),
      topicLine(P1B, "७.३", "बिरुवालाई आवश्यक पर्ने खाद्यतत्वहरुको काम"),
    ],
  },
  {
    topicId: "u4-4.4",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "प्रमाणित बीउ पुस्ता दर पुस्ता कसरी उत्पादन हुन्छ।",
      "How certified seed is produced, generation by generation.",
    ),
    explanation: [
      t(
        "बीउ प्रमाणीकरणमा बीउ पुस्तागत रूपमा उत्पादन हुन्छ: प्रजनक बीउबाट मूल बीउ, र मूल बीउबाट प्रमाणित बीउ। हरेक पुस्तामा शुद्धता र गुणस्तर जाँचिन्छ।",
        "In seed certification, seed is multiplied in generations: breeder seed produces foundation seed, and foundation seed produces certified seed. Purity and quality are checked at every generation.",
      ),
      t(
        "प्रजनक बीउ जात विकास गर्ने संस्थाको प्रत्यक्ष निगरानीमा थोरै परिमाणमा उत्पादन हुन्छ। किसानले सामान्यतया प्रमाणित वा लेबल गरिएको बीउ किन्छन्।",
        "Breeder seed is produced in small amounts under the direct control of the breeding institution. Farmers usually buy certified or labelled seed.",
      ),
      t(
        "यथार्थ संकेतपत्र पद्धतिमा उत्पादकले बीउको गुणस्तर (शुद्धता, उम्रने क्षमता आदि) लेबलमा घोषणा गर्छ र त्यो सही हुनुपर्छ। यसको विस्तृत व्यवस्था बीउबिजन ऐन र नियमावलीमा हेर्नुपर्छ।",
        "Under truthful labelling, the producer declares the seed's quality, such as purity and germination, on the label and is responsible for it being true. The detailed rules are in the Seeds Act and Regulation.",
      ),
    ],
    keyPoints: [
      t("क्रम: प्रजनक → मूल → प्रमाणित", "Order: breeder → foundation → certified"),
      t("हरेक पुस्तामा शुद्धता जाँच", "Purity checked at every generation"),
      t(
        "यथार्थ संकेतपत्र: गुणस्तर लेबलमा घोषणा",
        "Truthful labelling: quality declared on the label",
      ),
    ],
    citations: [
      placeholder("sqcc"),
      topicLine(P1B, "४.४", "बीउको परिभाषा, प्रमाणीकरण र यथार्थ संकेतपत्र पद्धती"),
    ],
  },
  {
    topicId: "u6-6.2",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "मूल्य र परिमाणबीचको सम्बन्ध बताउने आधारभूत नियम।",
      "The basic rules linking price and quantity.",
    ),
    explanation: [
      t(
        "मागको नियमअनुसार अन्य कुरा स्थिर रहेमा कुनै वस्तुको मूल्य बढ्दा त्यसको माग गरिने परिमाण घट्छ, र मूल्य घट्दा बढ्छ।",
        "The law of demand says that, other things being equal, when a good's price rises the quantity demanded falls, and when it falls the quantity demanded rises.",
      ),
      t(
        "पूर्तिको नियमअनुसार अन्य कुरा स्थिर रहेमा मूल्य बढ्दा उत्पादकले बजारमा ल्याउने परिमाण बढ्छ। माग र पूर्ति बराबर हुने बिन्दुमा सन्तुलन मूल्य तय हुन्छ।",
        "The law of supply says that, other things being equal, producers bring more to market when the price rises. The market settles at the equilibrium price, where demand equals supply.",
      ),
      t(
        "कृषि उपज मौसममा धेरै र बेमौसममा थोरै आउने भएकाले मूल्य धेरै उतारचढाव हुन्छ। भण्डारण, प्रशोधन र बेमौसमी उत्पादनले यो उतारचढाव घटाउँछ।",
        "Farm produce floods the market in season and is scarce out of season, so prices swing widely. Storage, processing and off-season production reduce the swings.",
      ),
    ],
    keyPoints: [
      t("मूल्य बढ्दा माग गरिने परिमाण घट्छ", "Price up, quantity demanded down"),
      t("मूल्य बढ्दा पूर्ति गरिने परिमाण बढ्छ", "Price up, quantity supplied up"),
      t("माग = पूर्ति भएको बिन्दुमा सन्तुलन मूल्य", "Equilibrium price where demand equals supply"),
    ],
    citations: [placeholder("moald"), topicLine(P1B, "६.२", "माग तथा पूर्तिको परिचय र नियम")],
  },
  {
    topicId: "gk-1.6",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "संविधान कहिले प्रकाशित भयो, कति पटक संशोधन भयो र भाग १ देखि ५ मा के छ।",
      "When the Constitution was published, its amendments, and what Parts 1 to 5 cover.",
    ),
    explanation: [
      t(
        "नेपालको संविधान नेपाल राजपत्रमा २०७२/०६/०३ मा प्रकाशित भयो। कानुन आयोगको संस्करणअनुसार पहिलो संशोधन २०७२/११/१६ मा र दोस्रो संशोधन २०७७/०३/०४ मा प्रमाणीकरण भई प्रकाशित भए।",
        "The Constitution of Nepal was published in the Nepal Gazette on 2072/06/03. According to the Law Commission's edition, the first amendment was authenticated and published on 2072/11/16 and the second on 2077/03/04.",
      ),
      t(
        "पाठ्यक्रमले भाग १ देखि ५ र अनुसूचीहरू समेटेको छ: भाग १ प्रारम्भिक, भाग २ नागरिकता, भाग ३ मौलिक हक र कर्तव्य, भाग ४ राज्यका निर्देशक सिद्धान्त, नीति तथा दायित्व, र भाग ५ राज्यको संरचना र राज्यशक्तिको बाँडफाँट।",
        "The syllabus covers Parts 1 to 5 and the schedules: Part 1 preliminary, Part 2 citizenship, Part 3 fundamental rights and duties, Part 4 directive principles, policies and obligations of the State, and Part 5 structure of the State and distribution of state power.",
      ),
      t(
        "संविधानमा ९ वटा अनुसूची छन्; अनुसूची ५ देखि ९ मा संघ, प्रदेश र स्थानीय तहका एकल र साझा अधिकारका सूची छन्।",
        "The Constitution has 9 schedules; Schedules 5 to 9 list the exclusive and shared powers of the federation, provinces and local levels.",
      ),
    ],
    keyPoints: [
      t("राजपत्रमा प्रकाशन: २०७२/०६/०३", "Published in the Gazette: 2072/06/03"),
      t(
        "पहिलो संशोधन २०७२/११/१६ · दोस्रो संशोधन २०७७/०३/०४",
        "First amendment 2072/11/16 · Second 2077/03/04",
      ),
      t("भाग ३: मौलिक हक र कर्तव्य", "Part 3: fundamental rights and duties"),
      t("९ अनुसूची", "9 schedules"),
    ],
    citations: [
      official("REF-04", t("पहिलो पृष्ठ", "First page"), {
        text: "नेपाल राजपत्रमा प्रकाशन मिति २०७२।०६।०३",
        translation: t(
          "नेपाल राजपत्रमा प्रकाशन मिति: २०७२/०६/०३",
          "Published in the Nepal Gazette on 2072/06/03",
        ),
      }),
      placeholder("lawcommission"),
    ],
  },
  {
    topicId: "u1-1.11",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "बाली भित्र्याएदेखि उपभोक्तासम्म पुग्दा हुने क्षति र त्यसलाई घटाउने उपाय।",
      "Losses between harvest and the consumer, and how to reduce them.",
    ),
    explanation: [
      t(
        "उत्पादनोपरान्त क्षति चोटपटक, पानी सुक्ने र श्वासप्रश्वास जस्ता शारीरिक प्रक्रिया, ढुसी तथा ब्याक्टेरियाले कुहाउने, र भण्डारका कीरा तथा मुसाका कारण हुन्छ।",
        "Post-harvest losses come from bruising and other damage, physiological processes such as water loss and respiration, rots caused by fungi and bacteria, and storage insects and rodents.",
      ),
      t(
        "सही परिपक्वतामा टिप्ने, होसियारीसाथ ओसारपसार गर्ने, सफा गर्ने, छनौट र ग्रेडिङ गर्ने, प्याज र आलुलाई क्युरिङ गर्ने, चिसो राख्ने (कोल्ड चेन) र राम्रो प्याकेजिङले क्षति घटाउँछन्।",
        "Harvesting at the right maturity, careful handling, cleaning, sorting and grading, curing onions and potatoes, keeping produce cool along a cold chain and good packaging all cut losses.",
      ),
      t(
        "अन्नबालीलाई राम्ररी सुकाएर हावा नछिर्ने भाँडामा राख्दा भण्डारका कीराको क्षति धेरै कम हुन्छ।",
        "For grain, drying it well and storing it in airtight containers greatly reduces damage from storage insects.",
      ),
    ],
    keyPoints: [
      t(
        "क्षतिका कारण: चोट, शारीरिक प्रक्रिया, कुहाउने जीवाणु, कीरा र मुसा",
        "Causes: damage, physiology, rots, insects and rodents",
      ),
      t("सही बेलामा टिप्ने, होसियारीसाथ ओसारपसार", "Harvest at the right time, handle with care"),
      t("क्युरिङ, छनौट, ग्रेडिङ, चिसो भण्डार", "Curing, sorting, grading, cool storage"),
    ],
    citations: [
      placeholder("aitc"),
      topicLine(
        P1B,
        "१.११",
        "कृषि वस्तुहरुको उत्पादनोपरान्त (Post-harvest) हुने क्षति र क्षति कम गर्ने उपायहरु",
      ),
    ],
  },
];

const P = placeholder;

export const questions: Question[] = [
  question({
    id: "l4-gk-01",
    syllabusId: syllabus.id,
    subjectId: "gk",
    topicId: "gk-1.6",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "नेपालको संविधान नेपाल राजपत्रमा कुन मितिमा प्रकाशित भयो?",
      "On which date was the Constitution of Nepal published in the Nepal Gazette?",
    ),
    correct: t("२०७२/०६/०३", "2072/06/03 BS"),
    wrong: [
      [
        t("२०७२/०९/०३", "2072/09/03 BS"),
        t("यो मिति संविधानमा छापिएको छैन।", "This date is not printed on the Constitution."),
      ],
      [
        t("२०७३/०६/०३", "2073/06/03 BS"),
        t(
          "वर्ष मिलेन; संविधान २०७२ सालमा प्रकाशित भएको हो।",
          "Wrong year; it was published in 2072.",
        ),
      ],
      [
        t("२०७२/११/१६", "2072/11/16 BS"),
        t(
          "यो पहिलो संशोधन प्रमाणीकरण र प्रकाशन भएको मिति हो।",
          "That is when the first amendment was authenticated and published.",
        ),
      ],
    ],
    explanation: t(
      "कानुन आयोगको संस्करणको पहिलो पृष्ठमा 'नेपाल राजपत्रमा प्रकाशन मिति २०७२।०६।०३' लेखिएको छ।",
      "The first page of the Law Commission's edition prints: published in the Nepal Gazette on 2072/06/03.",
    ),
    citation: official("REF-04", t("पहिलो पृष्ठ", "First page"), {
      text: "नेपाल राजपत्रमा प्रकाशन मिति २०७२।०६।०३",
      translation: t(
        "नेपाल राजपत्रमा प्रकाशन मिति: २०७२/०६/०३",
        "Published in the Nepal Gazette on 2072/06/03",
      ),
    }),
  }),
  question({
    id: "l4-gk-02",
    syllabusId: syllabus.id,
    subjectId: "gk",
    topicId: "gk-1.6",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "नेपालको संविधानको दोस्रो संशोधन कुन सालमा भएको हो?",
      "In which year (BS) was the Constitution of Nepal amended for the second time?",
    ),
    correct: t("२०७७", "2077"),
    wrong: [
      [t("२०७५", "2075"), t("दोस्रो संशोधनको साल २०७७ हो।", "The second amendment is from 2077.")],
      [
        t("२०७२", "2072"),
        t("२०७२ मा पहिलो संशोधन भएको हो।", "2072 is the year of the first amendment."),
      ],
      [
        t("२०८०", "2080"),
        t(
          "कानुन आयोगको संस्करणमा २०८० को संशोधन उल्लेख छैन।",
          "The Law Commission's edition lists no amendment in 2080.",
        ),
      ],
    ],
    explanation: t(
      "संस्करणमा 'नेपालको संविधान (दोस्रो संशोधन), २०७७' र त्यसको प्रमाणीकरण मिति २०७७।०३।०४ उल्लेख छ।",
      "The edition lists the Constitution of Nepal (Second Amendment), 2077, authenticated on 2077/03/04.",
    ),
    citation: official("REF-04", t("पहिलो पृष्ठ", "First page"), {
      text: "नेपालको संविधान (दोस्रो संशोधन), २०७७ २०७७।०३।०४",
      translation: t(
        "दोस्रो संशोधन, २०७७: प्रमाणीकरण मिति २०७७/०३/०४",
        "Second Amendment, 2077: authenticated 2077/03/04",
      ),
    }),
  }),
  question({
    id: "l4-gk-03",
    syllabusId: syllabus.id,
    subjectId: "gk",
    topicId: "gk-1.6",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "नेपालको संविधानमा कति वटा अनुसूची छन्?",
      "How many schedules does the Constitution of Nepal have?",
    ),
    correct: t("९", "9"),
    wrong: [
      [t("७", "7"), t("अनुसूची ९ वटा छन्।", "There are 9 schedules.")],
      [t("८", "8"), t("अनुसूची ९ वटा छन्।", "There are 9 schedules.")],
      [t("१०", "10"), t("अनुसूची ९ वटा छन्।", "There are 9 schedules.")],
    ],
    explanation: t(
      "संविधानमा अनुसूची १ देखि ९ सम्म छन्। अनुसूची ५ देखि ९ मा संघ, प्रदेश र स्थानीय तहका एकल तथा साझा अधिकारका सूची छन्।",
      "The Constitution has Schedules 1 to 9. Schedules 5 to 9 list the exclusive and shared powers of the federation, provinces and local levels.",
    ),
    citation: P("lawcommission"),
  }),
  question({
    id: "l4-pm-01",
    syllabusId: syllabus.id,
    subjectId: "pm",
    topicId: "pm-2.1.5",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "कार्यालयमा आएको पत्र आधिकारिक रूपमा प्राप्त भएको अभिलेख कुन प्रक्रियाले राखिन्छ?",
      "Which office procedure records an incoming letter as officially received?",
    ),
    correct: t("दर्ता", "Registration (darta)"),
    wrong: [
      [
        t("चलानी", "Dispatch (chalani)"),
        t(
          "चलानी कार्यालयबाट बाहिर पठाइने पत्रको अभिलेख हो।",
          "Dispatch records letters sent out of the office.",
        ),
      ],
      [
        t("परिपत्र", "Circular"),
        t(
          "परिपत्र धेरै निकाय वा व्यक्तिलाई एकै पटक पठाइने सूचना हो।",
          "A circular is a notice sent to many offices or people at once.",
        ),
      ],
      [
        t("तोक आदेश", "Order (tok adesh)"),
        t(
          "तोक आदेशले काम तोक्छ, पत्र प्राप्तिको अभिलेख राख्दैन।",
          "An order assigns work; it does not record that a letter arrived.",
        ),
      ],
    ],
    explanation: t(
      "आएको पत्रलाई दर्ता किताबमा दर्ता नम्बर र मितिसहित चढाइन्छ; बाहिर जाने पत्र चलानी किताबमा चढाइन्छ।",
      "Incoming letters are entered in the registration book with a number and date; outgoing letters go in the dispatch book.",
    ),
    citation: P("publicAdmin"),
  }),
  question({
    id: "l4-pm-02",
    syllabusId: syllabus.id,
    subjectId: "pm",
    topicId: "pm-2.3",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "सार्वजनिक (नागरिक) बडापत्रको मुख्य उद्देश्य के हो?",
      "What is the main purpose of a citizen charter?",
    ),
    correct: t(
      "सेवाग्राहीलाई कुन सेवा, कति दस्तुर, कति समयमा र कसबाट पाइन्छ भनी जानकारी दिनु",
      "To tell service users which services they get, for what fee, in how long, and from whom",
    ),
    wrong: [
      [
        t("कर्मचारीको हाजिरी अभिलेख राख्नु", "To keep staff attendance records"),
        t("हाजिरी आन्तरिक प्रशासनको विषय हो।", "Attendance is internal administration."),
      ],
      [
        t("कार्यालयको वार्षिक बजेट प्रकाशित गर्नु", "To publish the office's annual budget"),
        t("बजेट बडापत्रको विषय होइन।", "The budget is not what a charter covers."),
      ],
      [
        t("कार्यालयका सवारी साधनको सूची राख्नु", "To list the office's vehicles"),
        t("यो सम्पत्ति अभिलेख हो, बडापत्र होइन।", "That is an asset record, not a charter."),
      ],
    ],
    explanation: t(
      "बडापत्रले सेवाग्राहीप्रति कार्यालयको प्रतिबद्धता देखाउँछ: सेवाको विवरण, दस्तुर, समय, जिम्मेवार अधिकारी र गुनासो सुन्ने व्यवस्था।",
      "A charter states the office's commitments to service users: the services, fees, time taken, the responsible official and how complaints are heard.",
    ),
    citation: P("publicAdmin"),
  }),
  question({
    id: "l4-pm-03",
    syllabusId: syllabus.id,
    subjectId: "pm",
    topicId: "pm-2.5",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "पाठ्यक्रमले उल्लेख गरेको भ्रष्टाचार निवारण ऐन कुन सालको हो?",
      "Which year (BS) is the Prevention of Corruption Act named in the syllabus?",
    ),
    correct: t("२०५९", "2059"),
    wrong: [
      [
        t("२०४८", "2048"),
        t(
          "पाठ्यक्रमले भ्रष्टाचार निवारण ऐन, २०५९ उल्लेख गरेको छ।",
          "The syllabus names the Act of 2059.",
        ),
      ],
      [
        t("२०६३", "2063"),
        t(
          "पाठ्यक्रमले भ्रष्टाचार निवारण ऐन, २०५९ उल्लेख गरेको छ।",
          "The syllabus names the Act of 2059.",
        ),
      ],
      [
        t("२०७२", "2072"),
        t(
          "पाठ्यक्रमले भ्रष्टाचार निवारण ऐन, २०५९ उल्लेख गरेको छ।",
          "The syllabus names the Act of 2059.",
        ),
      ],
    ],
    explanation: t(
      "पाठ्यक्रमको प्रथम पत्र, खण्ड क को बुँदा २.५ मा 'भ्रष्टाचार निवारण ऐन, २०५९' उल्लेख छ।",
      "Paper I, Section A, topic 2.5 of the syllabus names the Prevention of Corruption Act, 2059.",
    ),
    citation: topicLine(P1A, "२.५", "भ्रष्टाचार निवारण ऐन, २०५९"),
  }),
  question({
    id: "l4-u1-01",
    syllabusId: syllabus.id,
    subjectId: "u1",
    topicId: "u1-1.2",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "पाठ्यक्रमले उल्लेख गरेको राष्ट्रिय कृषि नीति कुन सालको हो?",
      "Which year is the National Agriculture Policy named in the syllabus?",
    ),
    correct: t("२०६१", "2061"),
    wrong: [
      [
        t("२०७१", "2071"),
        t(
          "पाठ्यक्रमले राष्ट्रिय कृषि नीति, २०६१ उल्लेख गरेको छ।",
          "The syllabus names the policy of 2061.",
        ),
      ],
      [
        t("२०४९", "2049"),
        t(
          "पाठ्यक्रमले राष्ट्रिय कृषि नीति, २०६१ उल्लेख गरेको छ।",
          "The syllabus names the policy of 2061.",
        ),
      ],
      [
        t("२०८१", "2081"),
        t(
          "पाठ्यक्रमले राष्ट्रिय कृषि नीति, २०६१ उल्लेख गरेको छ।",
          "The syllabus names the policy of 2061.",
        ),
      ],
    ],
    explanation: t(
      "सेवा सम्बन्धी खण्डको बुँदा १.२ मा 'राष्ट्रिय कृषि नीति, २०६१' छ।",
      "Topic 1.2 of the job-knowledge section names the National Agriculture Policy, 2061.",
    ),
    citation: topicLine(P1B, "१.२", "राष्ट्रीय कृषि नीति, २०६१"),
  }),
  question({
    id: "l4-u1-02",
    syllabusId: syllabus.id,
    subjectId: "u1",
    topicId: "u1-1.4",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "पाठ्यक्रमले उल्लेख गरेको कृषि विकास रणनीति (ADS) कुन अवधिका लागि हो?",
      "Which period does the Agriculture Development Strategy (ADS) named in the syllabus cover?",
    ),
    correct: t("सन् २०१५–२०३५", "2015–2035"),
    wrong: [
      [
        t("सन् २०१०–२०३०", "2010–2030"),
        t(
          "पाठ्यक्रमले कृषि विकास रणनीति २०१५–२०३५ उल्लेख गरेको छ।",
          "The syllabus names the strategy for 2015–2035.",
        ),
      ],
      [
        t("सन् १९९५–२०१५", "1995–2015"),
        t(
          "पाठ्यक्रमले कृषि विकास रणनीति २०१५–२०३५ उल्लेख गरेको छ।",
          "The syllabus names the strategy for 2015–2035.",
        ),
      ],
      [
        t("सन् २०२०–२०४०", "2020–2040"),
        t(
          "पाठ्यक्रमले कृषि विकास रणनीति २०१५–२०३५ उल्लेख गरेको छ।",
          "The syllabus names the strategy for 2015–2035.",
        ),
      ],
    ],
    explanation: t(
      "सेवा सम्बन्धी खण्डको बुँदा १.४ मा 'कृषि विकास रणनीति २०१५-२०३५' छ।",
      "Topic 1.4 of the job-knowledge section names the Agriculture Development Strategy 2015-2035.",
    ),
    citation: topicLine(P1B, "१.४", "कृषि विकास रणनीति २०१५-२०३५"),
  }),
  question({
    id: "l4-u1-03",
    syllabusId: syllabus.id,
    subjectId: "u1",
    topicId: "u1-1.11",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "भण्डारणअघि प्याजको उत्पादनोपरान्त क्षति घटाउन कुन काम गरिन्छ?",
      "Which step reduces post-harvest loss of onions before storage?",
    ),
    correct: t("क्युरिङ: घाँटी र बाहिरी बोक्रा सुकाउने", "Curing: drying the neck and outer skins"),
    wrong: [
      [
        t("धोएर भिजेकै अवस्थामा भण्डार गर्ने", "Washing them and storing them wet"),
        t("भिजेको प्याज छिटो कुहिन्छ।", "Wet onions rot quickly."),
      ],
      [
        t("हावा नछिर्ने प्लास्टिकको झोलामा राख्ने", "Sealing them in airtight plastic bags"),
        t(
          "प्याजलाई हावा चाहिन्छ; बन्द झोलामा चिस्यान जम्मा भएर कुहिन्छ।",
          "Onions need airflow; in a sealed bag moisture builds up and they rot.",
        ),
      ],
      [
        t("पात ढल्नुअघि नै खन्ने", "Lifting them before the tops fall over"),
        t(
          "पात ढल्नु प्याज पाकेको संकेत हो; काँचो प्याज राम्ररी भण्डार हुँदैन।",
          "Tops falling over is the sign of maturity; immature onions store poorly.",
        ),
      ],
    ],
    explanation: t(
      "क्युरिङले घाँटी र बाहिरी बोक्रा सुकाउँछ, जसले पानी सुक्न र रोग पस्न रोक्छ। त्यसपछि सुक्खा, हावा चल्ने ठाउँमा भण्डार गरिन्छ।",
      "Curing dries the neck and outer skins, which slows water loss and keeps rots out. The onions are then stored somewhere dry and airy.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u1-04",
    syllabusId: syllabus.id,
    subjectId: "u1",
    topicId: "u1-1.12",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "प्राङ्गारिक खेतीमा तलका मध्ये कुन प्रयोग गर्न मिल्छ?",
      "Which of these may be used in organic farming?",
    ),
    correct: t("कम्पोस्ट र गोठेमल", "Compost and farmyard manure"),
    wrong: [
      [t("युरिया", "Urea"), t("युरिया रासायनिक मल हो।", "Urea is a synthetic fertiliser.")],
      [
        t("रासायनिक कीटनाशक विषादी", "Synthetic insecticides"),
        t(
          "प्राङ्गारिक खेतीमा रासायनिक विषादी प्रयोग गरिँदैन।",
          "Synthetic pesticides are not used in organic farming.",
        ),
      ],
      [
        t("रासायनिक झारनाशक", "Chemical herbicides"),
        t(
          "प्राङ्गारिक खेतीमा रासायनिक झारनाशक प्रयोग गरिँदैन।",
          "Chemical herbicides are not used in organic farming.",
        ),
      ],
    ],
    explanation: t(
      "प्राङ्गारिक खेतीमा माटोको उर्वराशक्ति कम्पोस्ट, गोठेमल, हरियो मल र बाली चक्रबाट कायम गरिन्छ, र रासायनिक मल तथा विषादी प्रयोग गरिँदैन।",
      "Organic farming builds soil fertility with compost, farmyard manure, green manure and crop rotation, without synthetic fertilisers or pesticides.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u2-01",
    syllabusId: syllabus.id,
    subjectId: "u2",
    topicId: "u2-2.1",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "तरकारी खेतीसँग सम्बन्धित बागवानीको शाखालाई के भनिन्छ?",
      "What is the branch of horticulture that deals with vegetables called?",
    ),
    correct: t("ओलेरिकल्चर (Olericulture)", "Olericulture"),
    wrong: [
      [
        t("पोमोलोजी (Pomology)", "Pomology"),
        t("पोमोलोजी फलफूल खेतीको शाखा हो।", "Pomology is fruit growing."),
      ],
      [
        t("फ्लोरिकल्चर (Floriculture)", "Floriculture"),
        t("फ्लोरिकल्चर फूल खेती हो।", "Floriculture is flower growing."),
      ],
      [
        t("भिटिकल्चर (Viticulture)", "Viticulture"),
        t("भिटिकल्चर अङ्गुर खेती हो।", "Viticulture is grape growing."),
      ],
    ],
    explanation: t(
      "बागवानीका मुख्य शाखा: पोमोलोजी (फलफूल), ओलेरिकल्चर (तरकारी), फ्लोरिकल्चर (फूल) र ल्यान्डस्केप बागवानी।",
      "The main branches of horticulture are pomology (fruit), olericulture (vegetables), floriculture (flowers) and landscape gardening.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u2-02",
    syllabusId: syllabus.id,
    subjectId: "u2",
    topicId: "u2-2.8",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "लिचीको बिरुवा उत्पादन गर्न सामान्यतया कुन तरिका प्रयोग गरिन्छ?",
      "Which method is usually used to propagate litchi?",
    ),
    correct: t("गुटी कलमी (air layering)", "Air layering"),
    wrong: [
      [
        t("बीउ रोपेर", "Sowing seed"),
        t(
          "बीउबाट उम्रेको लिची माउजस्तो हुँदैन र फल्न धेरै ढिलो गर्छ।",
          "Seedlings are not true to type and take many years to bear.",
        ),
      ],
      [
        t("पातको कटिङ", "Leaf cuttings"),
        t("लिचीमा पातको कटिङबाट जरा आउँदैन।", "Litchi does not root from leaf cuttings."),
      ],
      [
        t("टी आँखा कलमी (T-budding)", "T-budding"),
        t(
          "टी आँखा कलमी मुख्यतया सुन्तलाजात र गुलाफमा प्रयोग हुन्छ।",
          "T-budding is used mainly for citrus and roses.",
        ),
      ],
    ],
    explanation: t(
      "गुटी कलमीमा हाँगाको बोक्रा गोलो गरी हटाई ओसिलो माध्यमले बेरिन्छ; जरा आएपछि हाँगा काटेर रोपिन्छ। यसरी बनेको बिरुवा माउजस्तै हुन्छ।",
      "In air layering, a ring of bark is removed from a branch and wrapped in a moist medium; once roots form, the branch is cut off and planted. The new plant is true to the parent.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u2-03",
    syllabusId: syllabus.id,
    subjectId: "u2",
    topicId: "u2-2.8",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "तलका मध्ये कुन वानस्पतिक प्रसारणको तरिका हो?",
      "Which of these is a method of vegetative propagation?",
    ),
    correct: t("कलमी (ग्राफ्टिङ)", "Grafting"),
    wrong: [
      [
        t("बीउ छर्ने", "Sowing seed"),
        t("बीउ छर्नु लैङ्गिक प्रसारण हो।", "Sowing seed is sexual propagation."),
      ],
      [
        t("वर्णशंकर बीउ उत्पादन", "Hybrid seed production"),
        t("यो पनि बीउबाटै हुने लैङ्गिक प्रसारण हो।", "That also works through seed."),
      ],
      [
        t("खुला परागसेचन", "Open pollination"),
        t("परागसेचन बीउ बन्ने प्रक्रिया हो।", "Pollination is how seed forms."),
      ],
    ],
    explanation: t(
      "कटिङ, लेयरिङ, कलमी, आँखा कलमी र तन्तु प्रसारण वानस्पतिक प्रसारण हुन्; यिनले माउबोटजस्तै बिरुवा दिन्छन्।",
      "Cuttings, layering, grafting, budding and tissue culture are vegetative methods; they give plants true to the parent.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u2-04",
    syllabusId: syllabus.id,
    subjectId: "u2",
    topicId: "u2-2.5",
    origin: "drafted",
    provenance: "demo",
    stem: t("करेसाबारीको मुख्य उद्देश्य के हो?", "What is the main purpose of a kitchen garden?"),
    correct: t(
      "घरपरिवारलाई वर्षभरि ताजा तरकारी र पोषण उपलब्ध गराउनु",
      "To give the household fresh vegetables and better nutrition all year",
    ),
    wrong: [
      [
        t("ठूलो परिमाणमा निर्यात गर्नु", "Large-scale export"),
        t("करेसाबारी घरायसी उपभोगका लागि हो।", "A kitchen garden is for the household's own use."),
      ],
      [
        t("काठ उत्पादन गर्नु", "Growing timber"),
        t("काठ वन वा कृषि वनको विषय हो।", "Timber is forestry."),
      ],
      [
        t("पशु चराउनु", "Grazing animals"),
        t("यो चरन हो, करेसाबारी होइन।", "That is pasture, not a kitchen garden."),
      ],
    ],
    explanation: t(
      "घरनजिकै सानो जग्गामा धेरै प्रकारका तरकारी पालैपालो लगाउँदा परिवारलाई वर्षभरि भिटामिन र खनिजयुक्त खाना पाइन्छ र खर्च घट्छ।",
      "Growing many vegetables in turn on a small plot near the house gives the family vitamins and minerals all year and cuts food spending.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u3-01",
    syllabusId: syllabus.id,
    subjectId: "u3",
    topicId: "u3-3.4",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "बीउ उपचार जस्तो कुनै काम कसरी गर्ने भनी किसानलाई चरणबद्ध रूपमा देखाउने प्रदर्शनलाई के भनिन्छ?",
      "A demonstration that shows farmers step by step how to do a task, such as treating seed, is called a",
    ),
    correct: t("विधि प्रदर्शन (Method demonstration)", "Method demonstration"),
    wrong: [
      [
        t("परिणाम प्रदर्शन (Result demonstration)", "Result demonstration"),
        t(
          "परिणाम प्रदर्शनले नतिजा तुलना गरेर देखाउँछ, काम गर्ने तरिका होइन।",
          "A result demonstration shows outcomes by comparison, not how to do the task.",
        ),
      ],
      [
        t("कृषक दिवस (Field day)", "Field day"),
        t(
          "कृषक दिवसमा धेरै किसानलाई खेतमा बोलाएर नतिजा र प्रविधि देखाइन्छ।",
          "A field day brings many farmers to a field to see results and practices.",
        ),
      ],
      [
        t("प्रदर्शनी (Exhibition)", "Exhibition"),
        t("प्रदर्शनी आम सम्पर्कको तरिका हो।", "An exhibition is a mass contact method."),
      ],
    ],
    explanation: t(
      "विधि प्रदर्शनमा प्रसार कार्यकर्ताले काम गरेर देखाउँछन् र किसानले आफैं गरेर सिक्छन्।",
      "In a method demonstration the extension worker does the task in front of farmers, who then do it themselves.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u3-02",
    syllabusId: syllabus.id,
    subjectId: "u3",
    topicId: "u3-3.4",
    origin: "drafted",
    provenance: "demo",
    stem: t("तलका मध्ये कुन आम सम्पर्क तरिका हो?", "Which of these is a mass contact method?"),
    correct: t("रेडियो कार्यक्रम", "A radio programme"),
    wrong: [
      [
        t("खेतबारी भ्रमण", "A farm visit"),
        t("यो व्यक्तिगत सम्पर्क तरिका हो।", "That is an individual contact method."),
      ],
      [
        t("समूह बैठक", "A group meeting"),
        t("यो समूह सम्पर्क तरिका हो।", "That is a group contact method."),
      ],
      [
        t("कार्यालय भेट", "An office call"),
        t("यो व्यक्तिगत सम्पर्क तरिका हो।", "That is an individual contact method."),
      ],
    ],
    explanation: t(
      "रेडियो, टेलिभिजन, पत्रपत्रिका, पर्चा, प्रदर्शनी र मोबाइल एपले एकै पटक धेरै किसानसम्म जानकारी पुर्‍याउँछन्।",
      "Radio, television, newspapers, leaflets, exhibitions and mobile apps reach many farmers at once.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u3-03",
    syllabusId: syllabus.id,
    subjectId: "u3",
    topicId: "u3-3.8",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "रोजर्सको वर्गीकरणअनुसार नयाँ प्रविधि सबैभन्दा पहिले कुन समूहले अपनाउँछ?",
      "In Rogers' adopter categories, which group adopts an innovation first?",
    ),
    correct: t("इनोभेटर (Innovators)", "Innovators"),
    wrong: [
      [
        t("अर्ली एडप्टर (Early adopters)", "Early adopters"),
        t("अर्ली एडप्टर इनोभेटरपछि अपनाउँछन्।", "Early adopters follow the innovators."),
      ],
      [
        t("अर्ली मेजोरिटी (Early majority)", "Early majority"),
        t("यो समूह अर्ली एडप्टरपछि आउँछ।", "This group comes after the early adopters."),
      ],
      [
        t("ल्यागार्ड (Laggards)", "Laggards"),
        t("ल्यागार्ड सबैभन्दा पछि अपनाउँछन्।", "Laggards adopt last."),
      ],
    ],
    explanation: t(
      "क्रम: इनोभेटर, अर्ली एडप्टर, अर्ली मेजोरिटी, लेट मेजोरिटी र ल्यागार्ड।",
      "The order is innovators, early adopters, early majority, late majority and laggards.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u3-04",
    syllabusId: syllabus.id,
    subjectId: "u3",
    topicId: "u3-3.8",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "रोजर्सको मोडेलमा 'अर्ली मेजोरिटी' समूहमा करिब कति प्रतिशत मानिस पर्छन्?",
      "About what share of adopters are the early majority in Rogers' model?",
    ),
    correct: t("३४%", "34%"),
    wrong: [
      [t("२.५%", "2.5%"), t("२.५% इनोभेटर हुन्।", "2.5% are innovators.")],
      [t("१३.५%", "13.5%"), t("१३.५% अर्ली एडप्टर हुन्।", "13.5% are early adopters.")],
      [t("१६%", "16%"), t("१६% ल्यागार्ड हुन्।", "16% are laggards.")],
    ],
    explanation: t(
      "रोजर्सको मोडेलमा अर्ली मेजोरिटी र लेट मेजोरिटी दुवै ३४/३४ प्रतिशत हुन्छन्।",
      "In Rogers' model the early majority and the late majority are each 34 percent.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u4-01",
    syllabusId: syllabus.id,
    subjectId: "u4",
    topicId: "u4-4.2",
    origin: "drafted",
    provenance: "demo",
    stem: t("धानको वैज्ञानिक नाम के हो?", "What is the scientific name of rice?"),
    correct: t("Oryza sativa", "Oryza sativa"),
    wrong: [
      [
        t("Triticum aestivum", "Triticum aestivum"),
        t("यो गहुँको वैज्ञानिक नाम हो।", "That is wheat."),
      ],
      [t("Zea mays", "Zea mays"), t("यो मकैको वैज्ञानिक नाम हो।", "That is maize.")],
      [t("Hordeum vulgare", "Hordeum vulgare"), t("यो जौको वैज्ञानिक नाम हो।", "That is barley.")],
    ],
    explanation: t(
      "धान घाँस परिवार (Poaceae) को बाली हो र यसको वैज्ञानिक नाम Oryza sativa हो।",
      "Rice belongs to the grass family, Poaceae, and its scientific name is Oryza sativa.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u4-02",
    syllabusId: syllabus.id,
    subjectId: "u4",
    topicId: "u4-4.2",
    origin: "drafted",
    provenance: "demo",
    stem: t("तलका मध्ये कुन दलहन बाली हो?", "Which of these is a pulse crop?"),
    correct: t("मसुरो", "Lentil"),
    wrong: [
      [t("तोरी", "Mustard"), t("तोरी तेलहन बाली हो।", "Mustard is an oilseed.")],
      [t("मकै", "Maize"), t("मकै खाद्यान्न बाली हो।", "Maize is a cereal.")],
      [t("उखु", "Sugarcane"), t("उखु औद्योगिक बाली हो।", "Sugarcane is an industrial crop.")],
    ],
    explanation: t(
      "मसुरो, चना, केराउ, रहर र मास जस्ता दलहन बालीको जरामा राइजोबियम ब्याक्टेरियाले हावाको नाइट्रोजन स्थिर गर्छ।",
      "Pulses such as lentil, chickpea, pea, pigeon pea and black gram host Rhizobium bacteria in their roots that fix nitrogen from the air.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u4-03",
    syllabusId: syllabus.id,
    subjectId: "u4",
    topicId: "u4-4.4",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "बीउ प्रमाणीकरणमा बीउका पुस्ताको सही क्रम कुन हो?",
      "What is the correct order of seed classes in certification?",
    ),
    correct: t("प्रजनक → मूल → प्रमाणित", "Breeder → Foundation → Certified"),
    wrong: [
      [
        t("प्रमाणित → मूल → प्रजनक", "Certified → Foundation → Breeder"),
        t(
          "क्रम उल्टो भयो; प्रजनक बीउबाट सुरु हुन्छ।",
          "Reversed: the chain starts from breeder seed.",
        ),
      ],
      [
        t("मूल → प्रजनक → प्रमाणित", "Foundation → Breeder → Certified"),
        t(
          "मूल बीउ प्रजनक बीउबाट बन्छ, उल्टो होइन।",
          "Foundation seed comes from breeder seed, not the other way round.",
        ),
      ],
      [
        t("प्रजनक → प्रमाणित → मूल", "Breeder → Certified → Foundation"),
        t("प्रमाणित बीउ मूल बीउबाट बन्छ।", "Certified seed comes from foundation seed."),
      ],
    ],
    explanation: t(
      "प्रजनक बीउबाट मूल बीउ, र मूल बीउबाट प्रमाणित बीउ उत्पादन गरिन्छ; हरेक पुस्तामा शुद्धता जाँचिन्छ।",
      "Breeder seed produces foundation seed, and foundation seed produces certified seed; purity is checked at every generation.",
    ),
    citation: P("sqcc"),
  }),
  question({
    id: "l4-u4-04",
    syllabusId: syllabus.id,
    subjectId: "u4",
    topicId: "u4-4.5",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "बीउ उत्पादनमा पृथकीकरण दूरी किन राखिन्छ?",
      "Why is an isolation distance kept in seed production?",
    ),
    correct: t(
      "अरू जातसँग पर-परागसेचन हुन नदिई बीउको आनुवंशिक शुद्धता कायम राख्न",
      "To stop cross-pollination with other varieties and keep the seed genetically pure",
    ),
    wrong: [
      [
        t("बाली काट्न सजिलो बनाउन", "To make harvesting easier"),
        t(
          "दूरीको उद्देश्य शुद्धता हो, काट्ने सुविधा होइन।",
          "The distance is about purity, not convenience.",
        ),
      ],
      [
        t("सिँचाइको पानी बचाउन", "To save irrigation water"),
        t("पृथकीकरण दूरीको सिँचाइसँग सम्बन्ध छैन।", "It has nothing to do with irrigation."),
      ],
      [
        t("बीउ दर घटाउन", "To reduce the seed rate"),
        t("बीउ दर रोपाइँको निर्णय हो।", "The seed rate is a planting decision."),
      ],
    ],
    explanation: t(
      "पर-परागसेचन हुने बालीमा छिमेकी खेतको अर्को जातको परागले बीउ मिसावट गर्छ; त्यसैले तोकिएको दूरी राखिन्छ।",
      "In cross-pollinated crops, pollen from another variety in a nearby field contaminates the seed, so a set distance is kept.",
    ),
    citation: P("sqcc"),
  }),
  question({
    id: "l4-u5-01",
    syllabusId: syllabus.id,
    subjectId: "u5",
    topicId: "u5-5.3",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "एकीकृत शत्रुजीव व्यवस्थापनमा रासायनिक विषादी कहिले प्रयोग गरिन्छ?",
      "In integrated pest management, when are chemical pesticides used?",
    ),
    correct: t(
      "शत्रुजीवको संख्या आर्थिक थ्रेसहोल्ड नाघेपछि मात्र, अन्तिम उपायका रूपमा",
      "Only when pest numbers pass the economic threshold, as a last resort",
    ),
    wrong: [
      [
        t("हरेक हप्ता तोकिएको तालिकाअनुसार", "Every week on a fixed schedule"),
        t(
          "तालिकाअनुसार छर्दा आवश्यक नपर्दा पनि विषादी लाग्छ र मित्रजीव मर्छन्।",
          "Calendar spraying applies pesticide when it is not needed and kills natural enemies.",
        ),
      ],
      [
        t("कहिल्यै प्रयोग गरिँदैन", "Never"),
        t(
          "IPM ले विषादी निषेध गर्दैन; आवश्यक परे सुरक्षित रूपमा प्रयोग गर्छ।",
          "IPM does not ban pesticides; it uses them safely when needed.",
        ),
      ],
      [
        t("कुनै कीरा देखिनुअघि नै बचाउका लागि", "Before any pest appears, as prevention"),
        t(
          "कीरा नदेखिँदै छर्नु IPM को सिद्धान्त विपरीत हो।",
          "Spraying before a pest is seen goes against IPM.",
        ),
      ],
    ],
    explanation: t(
      "IPM मा खेतको नियमित अवलोकन गरिन्छ र शत्रुजीव आर्थिक थ्रेसहोल्ड नाघेमा मात्र, सकेसम्म छनौटयुक्त विषादी सुरक्षित तरिकाले प्रयोग गरिन्छ।",
      "IPM relies on regular field observation, and pesticides, preferably selective ones, are used safely only when pests pass the economic threshold.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u5-02",
    syllabusId: syllabus.id,
    subjectId: "u5",
    topicId: "u5-5.6",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "लाही (aphid) को प्राकृतिक शत्रु (मित्रजीव) कुन हो?",
      "Which of these is a natural enemy of aphids?",
    ),
    correct: t("लेडीबर्ड बिटल", "Ladybird beetle"),
    wrong: [
      [
        t("गबारो (stem borer)", "Stem borer"),
        t("गबारो बालीको डाँठ खाने शत्रुजीव हो।", "The stem borer is itself a crop pest."),
      ],
      [
        t("फलको झिँगा (fruit fly)", "Fruit fly"),
        t("फलको झिँगा फलमा क्षति गर्ने शत्रुजीव हो।", "The fruit fly is a pest of fruit."),
      ],
      [
        t("सेतो झिँगा (whitefly)", "Whitefly"),
        t("सेतो झिँगा आफैं रस चुस्ने शत्रुजीव हो।", "The whitefly is itself a sap-sucking pest."),
      ],
    ],
    explanation: t(
      "लेडीबर्ड बिटलको लार्भा र वयस्क दुवैले लाही खान्छन्; त्यसैले IPM मा यिनलाई जोगाइन्छ।",
      "Both the larvae and adults of ladybird beetles eat aphids, which is why IPM protects them.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u5-03",
    syllabusId: syllabus.id,
    subjectId: "u5",
    topicId: "u5-5.2",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "धेरैजसो बालीमा झारपात नियन्त्रण गर्न सबैभन्दा महत्त्वपूर्ण समय कुन हो?",
      "For most crops, when does weed control matter most?",
    ),
    correct: t(
      "बाली र झारबीच प्रतिस्पर्धाको महत्त्वपूर्ण अवधि, प्रायः बालीको सुरुको वृद्धि अवस्था",
      "During the critical period of crop–weed competition, usually early crop growth",
    ),
    wrong: [
      [
        t("बाली काट्ने बेला", "At harvest"),
        t(
          "त्यतिबेलासम्म झारले उत्पादन घटाइसकेको हुन्छ।",
          "By then the weeds have already cut the yield.",
        ),
      ],
      [
        t("बालीको बीउ लागेपछि", "After the crop has set seed"),
        t("त्यो बेलासम्म क्षति भइसक्छ।", "The damage is done by then."),
      ],
      [
        t("फूल फुलेपछि मात्र", "Only after flowering"),
        t(
          "सुरुको अवस्थामा नियन्त्रण नगर्दा बाली कमजोर भइसक्छ।",
          "Without early control the crop is already weakened.",
        ),
      ],
    ],
    explanation: t(
      "बालीको सुरुका केही हप्ता झारसँगको प्रतिस्पर्धाले उत्पादनमा सबैभन्दा धेरै असर गर्छ; यसैलाई महत्त्वपूर्ण अवधि भनिन्छ।",
      "Weed competition in the first weeks of crop growth hurts yield most; this is called the critical period.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u5-04",
    syllabusId: syllabus.id,
    subjectId: "u5",
    topicId: "u5-5.13",
    origin: "drafted",
    provenance: "demo",
    stem: t("बाली उपचार शिविर (Plant clinic) के हो?", "What is a plant clinic?"),
    correct: t(
      "किसानले रोग वा कीरा लागेको नमूना ल्याएर पहिचान र सल्लाह पाउने ठाउँ",
      "A place where farmers bring samples of affected plants for a diagnosis and advice",
    ),
    wrong: [
      [
        t("विषादी बेच्ने पसल", "A pesticide shop"),
        t(
          "शिविरले निदान र सल्लाह दिन्छ, विषादी बेच्दैन।",
          "A clinic diagnoses and advises; it does not sell pesticides.",
        ),
      ],
      [
        t("बीउ भण्डार", "A seed store"),
        t("बीउ भण्डार बाली उपचार शिविर होइन।", "A seed store is something else."),
      ],
      [
        t("भू-क्षय भएको ठाउँ", "An eroded site"),
        t("यसको बाली उपचार शिविरसँग सम्बन्ध छैन।", "That is unrelated."),
      ],
    ],
    explanation: t(
      "बाली उपचार शिविरमा प्लान्ट डाक्टरले किसानले ल्याएको नमूना हेरेर समस्या पहिचान गर्छन् र व्यवस्थापनको सल्लाह दिन्छन्।",
      "At a plant clinic, a plant doctor examines samples farmers bring, identifies the problem and advises on management.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u6-01",
    syllabusId: syllabus.id,
    subjectId: "u6",
    topicId: "u6-6.2",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "मागको नियमअनुसार, अन्य कुरा स्थिर रहेमा, वस्तुको मूल्य बढ्दा माग गरिने परिमाण:",
      "By the law of demand, other things being equal, when a good's price rises the quantity demanded",
    ),
    correct: t("घट्छ", "falls"),
    wrong: [
      [
        t("बढ्छ", "rises"),
        t(
          "मूल्य र माग गरिने परिमाण उल्टो दिशामा चल्छन्।",
          "Price and quantity demanded move in opposite directions.",
        ),
      ],
      [
        t("उस्तै रहन्छ", "stays the same"),
        t(
          "मूल्य र माग गरिने परिमाण उल्टो दिशामा चल्छन्।",
          "Price and quantity demanded move in opposite directions.",
        ),
      ],
      [
        t("दोब्बर हुन्छ", "doubles"),
        t(
          "मूल्य र माग गरिने परिमाण उल्टो दिशामा चल्छन्।",
          "Price and quantity demanded move in opposite directions.",
        ),
      ],
    ],
    explanation: t(
      "मूल्य बढ्दा उपभोक्ताले कम किन्छन् वा सस्तो विकल्प रोज्छन्; त्यसैले माग गरिने परिमाण घट्छ।",
      "When the price rises, consumers buy less or switch to cheaper substitutes, so the quantity demanded falls.",
    ),
    citation: P("moald"),
  }),
  question({
    id: "l4-u6-02",
    syllabusId: syllabus.id,
    subjectId: "u6",
    topicId: "u6-6.5",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "ढुवानी र बजार लागत जोड्नुअघि किसानले फार्ममै पाउने मूल्यलाई के भनिन्छ?",
      "The price a farmer gets at the farm, before transport and marketing costs, is the",
    ),
    correct: t("फार्मगेट मूल्य", "Farm-gate price"),
    wrong: [
      [
        t("खुद्रा मूल्य", "Retail price"),
        t(
          "खुद्रा मूल्य उपभोक्ताले पसलमा तिर्ने मूल्य हो।",
          "The retail price is what the consumer pays in a shop.",
        ),
      ],
      [
        t("थोक मूल्य", "Wholesale price"),
        t(
          "थोक मूल्य थोक बजारको ठूलो कारोबारको मूल्य हो।",
          "The wholesale price is for bulk trade in a wholesale market.",
        ),
      ],
      [
        t("निर्यात मूल्य", "Export price"),
        t("यो विदेश पठाउँदाको मूल्य हो।", "That is the price for sale abroad."),
      ],
    ],
    explanation: t(
      "फार्मगेट, थोक र खुद्रा मूल्यबीचको फरकले बजार लागत र बिचौलियाको हिस्सा देखाउँछ।",
      "The gap between farm-gate, wholesale and retail prices shows the marketing costs and the middlemen's share.",
    ),
    citation: P("moald"),
  }),
  question({
    id: "l4-u6-03",
    syllabusId: syllabus.id,
    subjectId: "u6",
    topicId: "u6-6.9",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "सर्वेक्षकले किसानसँग प्रत्यक्ष अन्तर्वार्ता लिएर संकलन गरेको तथ्याङ्क कुन हो?",
      "Data a surveyor collects directly from farmers by interview are",
    ),
    correct: t("प्राथमिक तथ्याङ्क", "Primary data"),
    wrong: [
      [
        t("सहायक तथ्याङ्क", "Secondary data"),
        t(
          "सहायक तथ्याङ्क अरूले पहिले नै संकलन गरेर प्रकाशित गरेको हुन्छ।",
          "Secondary data were collected and published by someone else.",
        ),
      ],
      [
        t("प्रकाशित तथ्याङ्क", "Published data"),
        t("प्रकाशित तथ्याङ्क सहायक तथ्याङ्क हो।", "Published data are secondary data."),
      ],
      [
        t("अनुमानित तथ्याङ्क", "Estimated data"),
        t(
          "अन्तर्वार्ताबाट सिधै लिइएको तथ्याङ्क अनुमान होइन।",
          "Data taken straight from interviews are not estimates.",
        ),
      ],
    ],
    explanation: t(
      "आफैंले पहिलो पटक संकलन गरेको तथ्याङ्क प्राथमिक हो; अरूले संकलन गरी प्रकाशित गरेको तथ्याङ्क सहायक हो।",
      "Data you collect first-hand are primary; data collected and published by others are secondary.",
    ),
    citation: P("moald"),
  }),
  question({
    id: "l4-u6-04",
    syllabusId: syllabus.id,
    subjectId: "u6",
    topicId: "u6-6.10",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "बाली कटानी (Crop cutting) मुख्यतया के अनुमान गर्न प्रयोग गरिन्छ?",
      "Crop cutting is used mainly to estimate",
    ),
    correct: t("प्रति एकाइ क्षेत्रफलको उत्पादन", "Yield per unit area"),
    wrong: [
      [
        t("बजार मूल्य", "Market price"),
        t("बाली कटानीले उत्पादन नाप्छ, मूल्य होइन।", "Crop cutting measures yield, not price."),
      ],
      [
        t("माटोको पीएच", "Soil pH"),
        t("पीएच माटो परीक्षणबाट थाहा हुन्छ।", "Soil pH comes from a soil test."),
      ],
      [
        t("वर्षाको मात्रा", "Rainfall"),
        t("वर्षा मौसम केन्द्रले नाप्छ।", "Rainfall is measured at weather stations."),
      ],
    ],
    explanation: t(
      "छानिएका खेतमा तोकिएको आकारको प्लट काटेर तौलिएर प्रति हेक्टर उत्पादन अनुमान गरिन्छ।",
      "A plot of set size is harvested in sampled fields and weighed to estimate yield per hectare.",
    ),
    citation: P("moald"),
  }),
  question({
    id: "l4-u7-01",
    syllabusId: syllabus.id,
    subjectId: "u7",
    topicId: "u7-7.3",
    origin: "drafted",
    provenance: "demo",
    stem: t("धानमा जिंकको कमीले कुन रोग लाग्छ?", "Zinc deficiency in rice causes"),
    correct: t("खैरा रोग", "Khaira disease"),
    wrong: [
      [
        t("ब्लास्ट (Blast)", "Blast"),
        t("ब्लास्ट ढुसीले लगाउने रोग हो।", "Blast is caused by a fungus."),
      ],
      [
        t("टुंग्रो (Tungro)", "Tungro"),
        t("टुंग्रो भाइरसबाट लाग्ने रोग हो।", "Tungro is caused by a virus."),
      ],
      [
        t("बकाने (Bakanae)", "Bakanae"),
        t("बकाने ढुसीबाट लाग्ने रोग हो।", "Bakanae is caused by a fungus."),
      ],
    ],
    explanation: t(
      "खैरा रोगमा धानका पातमा खैरा थोप्ला देखिन्छन् र बिरुवा पुड्को हुन्छ; जिंक सल्फेटले यो सुधार गर्छ।",
      "In khaira disease rice leaves show brown patches and plants are stunted; zinc sulphate corrects it.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u7-02",
    syllabusId: syllabus.id,
    subjectId: "u7",
    topicId: "u7-7.3",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "पुराना (तल्ला) पातबाट पहेँलोपन सुरु भए प्रायः कुन तत्वको कमी हुन्छ?",
      "Yellowing that starts on older, lower leaves usually means a shortage of",
    ),
    correct: t("नाइट्रोजन", "Nitrogen"),
    wrong: [
      [
        t("फलाम", "Iron"),
        t("फलामको कमी नयाँ पातमा देखिन्छ।", "Iron shortage shows on young leaves."),
      ],
      [
        t("बोरन", "Boron"),
        t(
          "बोरनको कमी बढ्ने टुप्पो र नयाँ भागमा देखिन्छ।",
          "Boron shortage shows at growing tips and new tissue.",
        ),
      ],
      [
        t("क्याल्सियम", "Calcium"),
        t(
          "क्याल्सियम नसर्ने तत्व हो; यसको कमी नयाँ भागमा देखिन्छ।",
          "Calcium does not move, so its shortage shows in new growth.",
        ),
      ],
    ],
    explanation: t(
      "नाइट्रोजन बिरुवाभित्र सर्ने तत्व हो; कमी हुँदा बिरुवाले पुराना पातबाट नयाँ पातमा सार्छ, त्यसैले पुराना पात पहिले पहेँलिन्छन्।",
      "Nitrogen moves within the plant; when it runs short the plant moves it from old leaves to new ones, so the old leaves yellow first.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u7-03",
    syllabusId: syllabus.id,
    subjectId: "u7",
    topicId: "u7-7.1",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "चट्टान टुक्रिएर माटो बन्ने प्रक्रियालाई के भनिन्छ?",
      "What is the process that breaks rock down to form soil called?",
    ),
    correct: t("अपक्षय (Weathering)", "Weathering"),
    wrong: [
      [
        t("निक्षालन (Leaching)", "Leaching"),
        t(
          "निक्षालनमा पानीसँग तत्वहरू माटोको तल बगेर जान्छन्।",
          "Leaching is nutrients washing down through the soil.",
        ),
      ],
      [
        t("भू-क्षय (Erosion)", "Erosion"),
        t(
          "भू-क्षयमा माटो पानी वा हावाले बगाएर लैजान्छ।",
          "Erosion is soil being carried away by water or wind.",
        ),
      ],
      [
        t("माटो खाँदिनु (Compaction)", "Compaction"),
        t("खाँदिनुमा माटोका कण थिचिन्छन्।", "Compaction is soil being pressed together."),
      ],
    ],
    explanation: t(
      "भौतिक, रासायनिक र जैविक अपक्षयले चट्टानलाई टुक्र्याएर माटोको मूल पदार्थ बनाउँछ।",
      "Physical, chemical and biological weathering break rock into the parent material of soil.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u7-04",
    syllabusId: syllabus.id,
    subjectId: "u7",
    topicId: "u7-7.8",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "भिरालो जग्गामा भू-क्षय घटाउन कुन उपाय उपयुक्त हुन्छ?",
      "Which practice reduces soil erosion on sloping land?",
    ),
    correct: t("गरा बनाउने र समोच्च रेखामा खेती गर्ने", "Terracing and farming along the contour"),
    wrong: [
      [
        t("बालीको अवशेष जलाउने", "Burning crop residue"),
        t("अवशेष जलाउँदा माटो नाङ्गो र कमजोर हुन्छ।", "Burning leaves the soil bare and weak."),
      ],
      [
        t("भिरालोको माथि-तल जोत्ने", "Ploughing up and down the slope"),
        t(
          "यसले पानी बग्ने बाटो बनाउँछ र क्षय बढाउँछ।",
          "It makes channels for water and increases erosion.",
        ),
      ],
      [
        t("जग्गा नाङ्गो छोड्ने", "Leaving the land bare"),
        t("नाङ्गो माटो वर्षाले सजिलै बगाउँछ।", "Bare soil washes away easily in rain."),
      ],
    ],
    explanation: t(
      "गरा, समोच्च खेती, छापो र भू-आवरण बालीले पानीको बहाव सुस्त बनाउँछन् र माटो समात्छन्।",
      "Terraces, contour farming, mulch and cover crops slow runoff and hold the soil.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l4-u7-05",
    syllabusId: syllabus.id,
    subjectId: "u7",
    topicId: "u7-7.9",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "एकीकृत खाद्यतत्व व्यवस्थापनको अर्थ के हो?",
      "What does integrated plant nutrient management mean?",
    ),
    correct: t(
      "माटोको आवश्यकताअनुसार प्राङ्गारिक मल, जैविक मल र रासायनिक मल मिलाएर प्रयोग गर्ने",
      "Combining organic manures, biofertilisers and chemical fertilisers according to what the soil needs",
    ),
    wrong: [
      [
        t("युरिया मात्र प्रयोग गर्ने", "Using only urea"),
        t("एउटै तत्वले सबै आवश्यकता पूरा गर्दैन।", "One nutrient cannot meet every need."),
      ],
      [
        t("कम्पोस्ट मात्र प्रयोग गर्ने", "Using only compost"),
        t(
          "एकीकृत व्यवस्थापनमा धेरै स्रोत मिलाइन्छ।",
          "Integrated management combines several sources.",
        ),
      ],
      [
        t("कुनै मल प्रयोग नगर्ने", "Using no fertiliser at all"),
        t("यसले माटोको उर्वराशक्ति घटाउँछ।", "That runs the soil down."),
      ],
    ],
    explanation: t(
      "माटो जाँचका आधारमा धेरै स्रोतबाट खाद्यतत्व दिँदा उत्पादन पनि बढ्छ र माटोको स्वास्थ्य पनि कायम रहन्छ।",
      "Supplying nutrients from several sources, guided by a soil test, raises yield and keeps the soil healthy.",
    ),
    citation: P("aitc"),
  }),
];
