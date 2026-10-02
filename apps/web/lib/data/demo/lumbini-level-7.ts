// Lumbini Province, Level 7 (Officer), agriculture groups.
//
// The exam scheme, marks, time, rules and topic titles are taken from the
// official syllabus LUM-01 (approved 2080/12/20), and cite it. Study notes
// and most questions are demo content. Reasoning questions are original items
// that prove themselves; they cite the syllabus unit they practise, not a fact
// source (the owner's decision 3, 2026-09-30).

import type { Question, StudyNote, Syllabus } from "@/lib/contracts";

import { official, placeholder, question, t } from "./build";

const DOC = "LUM-01";

const unit = (ne: string, en: string) => official(DOC, t(ne, en));

export const syllabus: Syllabus = {
  id: "lumbini-level-7-agriculture",
  level: "level_7",
  province: "lumbini",
  groups: [
    "agri_extension",
    "horticulture",
    "agronomy",
    "plant_protection",
    "agri_economics_marketing",
    "soil_science",
  ],
  documentId: DOC,
  title: t("कृषि सेवा, अधिकृत सातौं तह", "Agriculture Service, Officer Level 7"),
  review: "ai_assisted_pending_review",
  negativeMarkingPercent: 20,
  partial: true,
  stages: [
    {
      id: "stage-1",
      kind: "written",
      title: t("प्रथम चरण: लिखित परीक्षा", "Stage 1: written exam"),
      marks: 200,
      detail: t(
        "प्रथम पत्र (बहुवैकल्पिक, १ घण्टा ३० मिनेट) र द्वितीय पत्र (विषयगत, ३ घण्टा), छुट्टाछुट्टै",
        "Paper I (multiple choice, 1 hour 30 minutes) and Paper II (written answers, 3 hours), held separately",
      ),
    },
    {
      id: "stage-2a",
      kind: "group_test",
      title: t("द्वितीय चरण: सामूहिक परीक्षण", "Stage 2: group test"),
      marks: 10,
      detail: t("सामूहिक छलफल, ३० मिनेट", "Group discussion, 30 minutes"),
    },
    {
      id: "stage-2b",
      kind: "interview",
      title: t("द्वितीय चरण: अन्तर्वार्ता", "Stage 2: interview"),
      marks: 30,
      detail: t("बोर्ड अन्तर्वार्ता", "Board interview"),
    },
  ],
  papers: [
    {
      id: "p1",
      number: 1,
      title: t("प्रथम पत्र: सामान्य विषय", "Paper I: General subject"),
      format: "objective",
      fullMarks: 100,
      passMarks: 40,
      minutes: 90,
      pattern: t(
        "१०० बहुवैकल्पिक प्रश्न × १ अङ्क (भाग १ मा ५०, भाग २ मा ५०)",
        "100 multiple-choice questions × 1 mark (50 in Part I, 50 in Part II)",
      ),
      questionCount: 100,
      marksPerQuestion: 1,
      sections: [
        {
          id: "p1-i",
          title: t(
            "भाग १: सामान्य जानकारी र सामान्य तार्किक परीक्षण",
            "Part I: General awareness and general reasoning test",
          ),
          questions: 50,
          marks: 50,
          weights: [
            { subjectId: "ga", questions: 25, marks: 25 },
            { subjectId: "rs", questions: 25, marks: 25 },
          ],
        },
        {
          id: "p1-ii",
          title: t("भाग २: सामान्य प्राविधिक विषय", "Part II: General technical subject"),
          questions: 50,
          marks: 50,
          weights: [
            { subjectId: "t1", questions: 5, marks: 5 },
            { subjectId: "t2", questions: 5, marks: 5 },
            { subjectId: "t3", questions: 10, marks: 10 },
            { subjectId: "t4", questions: 10, marks: 10 },
            { subjectId: "t5", questions: 20, marks: 20 },
          ],
        },
      ],
    },
    {
      id: "p2",
      number: 2,
      title: t("द्वितीय पत्र: प्राविधिक विषय", "Paper II: Technical subject"),
      format: "subjective",
      fullMarks: 100,
      passMarks: 40,
      minutes: 180,
      pattern: t(
        "छोटो उत्तर ४ × ५ अङ्क र लामो उत्तर ८ × १० अङ्क",
        "4 short answers × 5 marks and 8 long answers × 10 marks",
      ),
      questionCount: null,
      marksPerQuestion: null,
      sections: [
        {
          id: "p2-a",
          title: t("खण्ड क", "Section A"),
          questions: null,
          marks: 25,
          weights: [
            { subjectId: "x1", questions: null, marks: null },
            { subjectId: "x2", questions: null, marks: null },
          ],
        },
        {
          id: "p2-b",
          title: t("खण्ड ख", "Section B"),
          questions: null,
          marks: 25,
          weights: [
            { subjectId: "x3", questions: null, marks: null },
            { subjectId: "x4", questions: null, marks: null },
          ],
        },
        {
          id: "p2-c",
          title: t("खण्ड ग", "Section C"),
          questions: null,
          marks: 25,
          weights: [{ subjectId: "x5", questions: null, marks: null }],
        },
        {
          id: "p2-d",
          title: t("खण्ड घ", "Section D"),
          questions: null,
          marks: 25,
          weights: [{ subjectId: "x6", questions: null, marks: null }],
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
      citation: official(DOC, t("द्रष्टव्य ३", "Note 3"), {
        text: "प्रत्येक गलत उत्तर वापत 20 प्रतिशत अङ्क कट्टा गरिनेछ । तर उत्तर नदिएमा त्यस वापत अङ्क दिइनेछैन र अङ्क कट्टा पनि गरिनेछैन ।",
        translation: t(
          "प्रत्येक गलत उत्तरमा २० प्रतिशत अङ्क कट्टा हुन्छ; उत्तर नदिएमा अङ्क पनि पाइँदैन, कट्टा पनि हुँदैन।",
          "20 percent of the marks are deducted for each wrong answer; an unanswered question gets no marks and no deduction.",
        ),
      }),
    },
    laws: {
      text: t(
        "पाठ्यक्रममा उल्लेख भएका कानुन, ऐन, नियम र नीति यो पाठ्यक्रम स्वीकृत हुँदा जुन रूपमा कायम थिए, त्यही रूपमा पढ्नुपर्छ।",
        "Laws, acts, rules and policies named in the syllabus count as they stood when this syllabus was approved.",
      ),
      citation: official(DOC, t("द्रष्टव्य ७", "Note 7")),
    },
    devices: {
      text: t(
        "बहुवैकल्पिक परीक्षामा मोबाइल फोन, क्याल्कुलेटर, स्मार्ट घडी जस्ता मेमोरी भएका उपकरण प्रयोग गर्न पाइँदैन।",
        "No mobile phones, calculators, smart watches or other devices with memory in the multiple-choice exam.",
      ),
      citation: official(DOC, t("द्रष्टव्य ४", "Note 4")),
    },
    medium: {
      text: t(
        "लिखित परीक्षा नेपाली, अंग्रेजी वा दुवै भाषामा दिन सकिन्छ।",
        "The written exam can be taken in Nepali, English or both.",
      ),
      citation: official(DOC, t("द्रष्टव्य १", "Note 1")),
    },
    progression: {
      text: t(
        "प्रथम चरणको लिखित परीक्षाबाट छनौट भएकाले मात्र सामूहिक परीक्षण र अन्तर्वार्ता दिन पाउँछन्।",
        "Only candidates selected from the written exam take the group test and interview.",
      ),
      citation: official(DOC, t("द्रष्टव्य ८", "Note 8")),
    },
  },
  subjects: [
    {
      id: "ga",
      number: "1",
      area: "general",
      title: t("सामान्य जानकारी र समसामयिक विषय", "General awareness and contemporary issues"),
      topics: [
        {
          id: "ga-1.2",
          code: "1.2",
          title: t("नेपालका प्रमुख प्राकृतिक स्रोत", "Major natural resources of Nepal"),
          keywords: ["natural resources", "प्राकृतिक स्रोत"],
        },
        {
          id: "ga-1.5",
          code: "1.5",
          title: t(
            "नेपाल र लुम्बिनी प्रदेशको चालु आवधिक योजना",
            "Current periodic plan of Nepal and Lumbini Province",
          ),
          keywords: ["periodic plan", "plan", "योजना", "aawadhik"],
        },
        {
          id: "ga-1.8",
          code: "1.8",
          title: t(
            "नेपालको संविधान (भाग १ देखि ५, २० र २६ तथा अनुसूचीहरू)",
            "The Constitution of Nepal (Parts 1 to 5, 20 and 26, and the schedules)",
          ),
          keywords: ["constitution", "sambidhan", "samvidhan", "संविधान", "amendment", "संशोधन"],
        },
        {
          id: "ga-1.9",
          code: "1.9",
          title: t(
            "शासन प्रणाली र सरकार (संघ, प्रदेश र स्थानीय)",
            "Governance system and government (federal, provincial and local)",
          ),
          keywords: ["governance", "federal", "province", "local level", "संघ", "स्थानीय तह"],
        },
      ],
    },
    {
      id: "rs",
      number: "2",
      area: "reasoning",
      title: t("सामान्य तार्किक परीक्षण", "General reasoning test"),
      topics: [
        {
          id: "rs-2.1",
          code: "2.1",
          title: t("तार्किक क्षमता (९ अङ्क)", "Logical reasoning (9 marks)"),
          keywords: ["logical", "coding", "decoding", "direction", "analogy", "तार्किक", "iq"],
        },
        {
          id: "rs-2.2",
          code: "2.2",
          title: t("संख्यात्मक क्षमता (८ अङ्क)", "Numerical reasoning (8 marks)"),
          keywords: ["numerical", "series", "arithmetic", "संख्यात्मक", "math", "ganit", "गणित"],
        },
        {
          id: "rs-2.3",
          code: "2.3",
          title: t("स्थानिक क्षमता (८ अङ्क)", "Spatial reasoning (8 marks)"),
          keywords: ["spatial", "figure", "mirror", "cube", "स्थानिक"],
        },
      ],
    },
    {
      id: "t1",
      number: "1",
      area: "technical",
      title: t(
        "नेपालमा कृषि क्षेत्रको इतिहास र वर्तमान अवस्था",
        "History and current status of agriculture in Nepal",
      ),
      topics: [
        {
          id: "t1-1.1",
          code: "1.1",
          title: t(
            "नेपालमा कृषि अनुसन्धान र विकासको इतिहास",
            "History of agricultural research and development in Nepal",
          ),
          keywords: ["history", "इतिहास"],
        },
        {
          id: "t1-1.4",
          code: "1.4",
          title: t(
            "कृषि दीर्घकालीन योजना (APP) र यसको प्रभाव",
            "Agriculture Perspective Plan (APP) and its impact",
          ),
          keywords: ["app", "perspective plan", "दीर्घकालीन योजना"],
        },
      ],
    },
    {
      id: "t2",
      number: "2",
      area: "technical",
      title: t("कृषि अनुसन्धान, प्रसार र शिक्षा", "Agricultural research, extension and education"),
      topics: [
        {
          id: "t2-2.2",
          code: "2.2",
          title: t(
            "नेपाल कृषि अनुसन्धान परिषद् (नार्क) र यसको दृष्टिकोण",
            "Nepal Agricultural Research Council (NARC) and its vision",
          ),
          keywords: ["narc", "नार्क", "research council"],
        },
        {
          id: "t2-2.4",
          code: "2.4",
          title: t(
            "कृषि शिक्षा दिने विश्वविद्यालय (AFU, PU, TU)",
            "Academic institutions such as AFU, PU and TU",
          ),
          keywords: ["afu", "university", "विश्वविद्यालय", "education"],
        },
      ],
    },
    {
      id: "t3",
      number: "3",
      area: "technical",
      title: t(
        "प्राकृतिक स्रोत, वातावरण, जलवायु परिवर्तन र विपद् जोखिम व्यवस्थापन",
        "Natural resources, environment, climate change and disaster risk",
      ),
      topics: [
        {
          id: "t3-3.4",
          code: "3.4",
          title: t(
            "एकीकृत शत्रुजीव, बाली र खाद्यतत्व व्यवस्थापन (IPM, ICM, IPNM)",
            "Integrated pest, crop and plant nutrient management (IPM, ICM, IPNM)",
          ),
          keywords: ["ipm", "icm", "ipnm", "integrated"],
        },
        {
          id: "t3-3.9",
          code: "3.9",
          title: t(
            "जलवायु परिवर्तन र कृषि क्षेत्रमा यसको असर",
            "Climate change and its impact on agriculture",
          ),
          keywords: ["climate", "जलवायु", "adaptation", "mitigation"],
        },
      ],
    },
    {
      id: "t4",
      number: "4",
      area: "technical",
      title: t(
        "कृषि सम्बन्धी कानुन, योजना, नीति, रणनीति र विश्व व्यापार",
        "Legislation, plans, policies, strategies and global trade in agriculture",
      ),
      topics: [
        {
          id: "t4-4.8",
          code: "4.8",
          title: t(
            "कृषि विकास रणनीति (ADS), २०१५–२०३५",
            "Agriculture Development Strategy (ADS), 2015–2035",
          ),
          keywords: ["ads", "strategy", "रणनीति"],
        },
        {
          id: "t4-4.12",
          code: "4.12",
          title: t(
            "बीउबिजन ऐन, २०४५ र बीउबिजन नियमावली, २०६९",
            "Seeds Act, 2045 and Seeds Regulation, 2069",
          ),
          keywords: ["seeds act", "बीउबिजन ऐन", "seed regulation"],
        },
        {
          id: "t4-4.13",
          code: "4.13",
          title: t(
            "बिरुवा संरक्षण ऐन, २०६४ र नियमावली, २०६६",
            "Plant Protection Act, 2064 and Rules, 2066",
          ),
          keywords: ["plant protection act", "बिरुवा संरक्षण ऐन", "quarantine"],
        },
      ],
    },
    {
      id: "t5",
      number: "5",
      area: "technical",
      title: t("कृषि प्रविधि र व्यवस्थापन", "Agricultural technology and management"),
      topics: [
        {
          id: "t5-5.3",
          code: "5.3",
          title: t(
            "नेपालमा जात उन्मोचन र दर्ता प्रणाली",
            "Variety release and registration system in Nepal",
          ),
          keywords: ["variety release", "dus", "जात उन्मोचन", "registration"],
        },
        {
          id: "t5-5.6",
          code: "5.6",
          title: t("IPM का अवधारणा र रणनीति", "IPM concepts and strategies"),
          keywords: ["ipm", "pest"],
        },
        {
          id: "t5-5.7",
          code: "5.7",
          title: t("बाली उत्पादनमा परागसेचकको भूमिका", "Roles of pollinators in crop production"),
          keywords: ["pollinator", "bee", "मौरी", "परागसेचक"],
        },
      ],
    },
    {
      id: "x1",
      number: "1",
      area: "technical",
      title: t("कृषि प्रसार", "Agricultural extension"),
      topics: [
        {
          id: "x1-1.1",
          code: "1.1",
          title: t(
            "प्रसार शिक्षा, तालिम र नेतृत्व विकास",
            "Extension education, training and leadership development",
          ),
          keywords: ["extension education", "training", "leadership"],
        },
        {
          id: "x1-1.2",
          code: "1.2",
          title: t(
            "सञ्चार, नवप्रवर्तन, प्रसार र प्रविधि हस्तान्तरण",
            "Communication, innovation, diffusion and technology transfer",
          ),
          keywords: ["communication", "diffusion", "technology transfer"],
        },
      ],
    },
    {
      id: "x2",
      number: "2",
      area: "technical",
      title: t("कृषि अर्थशास्त्र", "Agricultural economics"),
      topics: [
        {
          id: "x2-2.1",
          code: "2.1",
          title: t("अर्थशास्त्रका सिद्धान्त", "Principles of economics"),
          keywords: ["economics", "अर्थशास्त्र"],
        },
        {
          id: "x2-2.3",
          code: "2.3",
          title: t(
            "कृषि कार्यक्रम योजना, अनुगमन, मूल्याङ्कन र तथ्याङ्क व्यवस्थापन",
            "Agricultural programme planning, monitoring, evaluation and data management",
          ),
          keywords: ["planning", "monitoring", "evaluation"],
        },
      ],
    },
    {
      id: "x3",
      number: "3",
      area: "technical",
      title: t("माटो विज्ञान", "Soil science"),
      topics: [
        {
          id: "x3-3.2",
          code: "3.2",
          title: t("माटोको उर्वराशक्ति र बिरुवाको पोषण", "Soil fertility and plant nutrition"),
          keywords: ["soil fertility", "plant nutrition", "उर्वराशक्ति"],
        },
        {
          id: "x3-3.3",
          code: "3.3",
          title: t("माटो सर्वेक्षण र जल संरक्षण", "Soil survey and water conservation"),
          keywords: ["soil survey", "water conservation"],
        },
      ],
    },
    {
      id: "x4",
      number: "4",
      area: "technical",
      title: t("बाली विज्ञान", "Agronomy"),
      topics: [
        {
          id: "x4-4.2",
          code: "4.2",
          title: t("बाली उत्पादन प्रविधि", "Crop production technology"),
          keywords: ["crop production", "agronomy"],
        },
        {
          id: "x4-4.3",
          code: "4.3",
          title: t("बाली प्रजनन र अनुसन्धान डिजाइन", "Plant breeding and research design"),
          keywords: ["plant breeding", "research design"],
        },
      ],
    },
    {
      id: "x5",
      number: "5",
      area: "technical",
      title: t("बागवानी", "Horticulture"),
      topics: [
        {
          id: "x5-5.3",
          code: "5.3",
          title: t(
            "बागवानी बालीको उत्पादनोपरान्त व्यवस्थापन",
            "Post-harvest management of horticultural crops",
          ),
          keywords: ["post harvest", "postharvest"],
        },
        {
          id: "x5-5.4",
          code: "5.4",
          title: t(
            "फलफूल र तरकारीको नर्सरी व्यवस्थापन",
            "Nursery management in fruits and vegetables",
          ),
          keywords: ["nursery", "नर्सरी"],
        },
      ],
    },
    {
      id: "x6",
      number: "6",
      area: "technical",
      title: t("बाली संरक्षण", "Plant protection"),
      topics: [
        {
          id: "x6-6.1",
          code: "6.1",
          title: t("सामान्य बाली संरक्षण", "General plant protection"),
          keywords: ["plant protection"],
        },
        {
          id: "x6-6.2",
          code: "6.2",
          title: t("कीट विज्ञान", "Entomology"),
          keywords: ["entomology", "insect", "कीरा"],
        },
      ],
    },
  ],
};

export const notes: StudyNote[] = [
  {
    topicId: "t3-3.4",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "शत्रुजीव, बाली र खाद्यतत्वलाई प्रणालीका रूपमा व्यवस्थापन गर्ने तीन सम्बन्धित अवधारणा।",
      "Three related approaches that manage pests, crops and nutrients as systems.",
    ),
    explanation: [
      t(
        "IPM ले शत्रुजीवलाई आर्थिक थ्रेसहोल्डभन्दा तल राख्न खेती गर्ने तरिका, भौतिक उपाय, मित्रजीव र आवश्यक परे मात्र छनौटयुक्त विषादी मिलाउँछ, र यो नियमित अनुगमनमा आधारित हुन्छ।",
        "IPM keeps pests below the economic threshold by combining cultural practices, physical methods, natural enemies and, only when needed, selective pesticides, all based on regular monitoring.",
      ),
      t(
        "ICM (एकीकृत बाली व्यवस्थापन) ले जातको छनौट, बीउ, रोप्ने समय र दूरी, पानी, खाद्यतत्व र शत्रुजीव व्यवस्थापनलाई पूरै बालीका लागि एकसाथ योजना बनाउँछ, ताकि उत्पादकत्व दिगो रूपमा बढोस्।",
        "ICM (integrated crop management) plans variety choice, seed, planting time and spacing, water, nutrients and pest management together for the whole crop, to raise productivity sustainably.",
      ),
      t(
        "IPNM (एकीकृत खाद्यतत्व व्यवस्थापन) ले माटो जाँचका आधारमा प्राङ्गारिक मल, जैविक मल, बालीका अवशेष र रासायनिक मल मिलाएर माटोको उर्वराशक्ति कायम राख्छ र खाद्यतत्व उपयोग दक्षता बढाउँछ।",
        "IPNM (integrated plant nutrient management) combines organic manures, biofertilisers, crop residues and chemical fertilisers on the basis of soil tests, keeping soil fertile and making nutrient use more efficient.",
      ),
    ],
    keyPoints: [
      t(
        "IPM: अनुगमन र आर्थिक थ्रेसहोल्डमा आधारित शत्रुजीव व्यवस्थापन",
        "IPM: pest management based on monitoring and the economic threshold",
      ),
      t("ICM: पूरै बालीको एकीकृत योजना", "ICM: integrated planning of the whole crop"),
      t(
        "IPNM: माटो जाँचमा आधारित मिश्रित खाद्यतत्व स्रोत",
        "IPNM: mixed nutrient sources guided by soil tests",
      ),
    ],
    citations: [
      placeholder("aitc"),
      unit("प्रथम पत्र, भाग २, बुँदा ३.४", "Paper I, Part II, topic 3.4"),
    ],
  },
  {
    topicId: "rs-2.1",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "तार्किक क्षमता परीक्षणमा सोधिने प्रश्नका प्रकार र तिनलाई हल गर्ने तरिका।",
      "The kinds of question in logical reasoning, and how to approach them.",
    ),
    explanation: [
      t(
        "पाठ्यक्रमअनुसार सामान्य तार्किक परीक्षण २५ अङ्कको हुन्छ: तार्किक क्षमता ९, संख्यात्मक क्षमता ८ र स्थानिक क्षमता ८ अङ्क।",
        "According to the syllabus, the general reasoning test carries 25 marks: logical reasoning 9, numerical reasoning 8 and spatial reasoning 8.",
      ),
      t(
        "तार्किक क्षमतामा शाब्दिक क्षमता, अक्षर-संख्या श्रृङ्खला, समानता, वर्गीकरण, कोडिङ-डिकोडिङ, क्रम र स्थान, दिशा र दूरी, विश्लेषणात्मक तर्क, र कथन तथा कारण जस्ता प्रश्न पर्छन्।",
        "Logical reasoning covers verbal ability, alphanumeric series, analogies, classification, coding-decoding, order and ranking, direction and distance, analytical reasoning, and assertion and reason.",
      ),
      t(
        "यस्ता प्रश्न नियम पत्ता लगाउने अभ्यासले सुध्रिन्छन्: पहिले ढाँचा पहिचान गर्ने, त्यसपछि विकल्पमा जाँच्ने। थोरै समयमा धेरै प्रश्न गर्नुपर्ने भएकाले समय राखेर अभ्यास गर्नुहोस्।",
        "These questions improve with practice at spotting the rule: find the pattern first, then test it against the options. Time yourself, because there are many questions and little time.",
      ),
    ],
    keyPoints: [
      t(
        "२५ अङ्क: तार्किक ९, संख्यात्मक ८, स्थानिक ८",
        "25 marks: logical 9, numerical 8, spatial 8",
      ),
      t("पहिले ढाँचा, त्यसपछि विकल्प", "Pattern first, then the options"),
      t("समय राखेर अभ्यास", "Practise against the clock"),
    ],
    citations: [unit("प्रथम पत्र, भाग १, खण्ड २", "Paper I, Part I, section 2")],
  },
  {
    topicId: "t4-4.8",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "सन् २०१५ देखि २०३५ सम्मका लागि नेपालको कृषि क्षेत्रको दीर्घकालीन रणनीति।",
      "Nepal's long-term strategy for agriculture from 2015 to 2035.",
    ),
    explanation: [
      t(
        "कृषि विकास रणनीति (ADS) २० वर्षे रणनीति हो, जसले कृषि दीर्घकालीन योजना (APP) पछि कृषि क्षेत्रलाई दिशा दिन्छ।",
        "The Agriculture Development Strategy (ADS) is a 20-year strategy that guides the sector after the Agriculture Perspective Plan (APP).",
      ),
      t(
        "यसका चार मुख्य रणनीतिक पक्ष सुशासन, उत्पादकत्व, नाफामूलक व्यावसायीकरण र प्रतिस्पर्धा हुन्।",
        "Its four main strategic components are governance, productivity, profitable commercialisation and competitiveness.",
      ),
      t(
        "यसको लक्ष्यमा खाद्य तथा पोषण सुरक्षा, किसानको आम्दानी र रोजगारी वृद्धि, र समावेशी तथा दिगो विकास पर्छन्। विस्तृत लक्ष्य र कार्यक्रम मन्त्रालयको आधिकारिक दस्तावेजमा हेर्नुहोस्।",
        "Its aims include food and nutrition security, higher farm incomes and employment, and inclusive, sustainable growth. See the ministry's official document for targets and programmes.",
      ),
    ],
    keyPoints: [
      t("अवधि: सन् २०१५–२०३५", "Period: 2015–2035"),
      t(
        "सुशासन, उत्पादकत्व, व्यावसायीकरण, प्रतिस्पर्धा",
        "Governance, productivity, commercialisation, competitiveness",
      ),
      t("APP पछि आएको रणनीति", "Follows the APP"),
    ],
    citations: [
      official(DOC, t("प्रथम पत्र, भाग २, बुँदा ४.८", "Paper I, Part II, topic 4.8"), {
        text: "Agriculture Development Strategy (ADS), 2015-2035 AD",
        lang: "en",
      }),
      placeholder("moald"),
    ],
  },
  {
    topicId: "t5-5.7",
    provenance: "demo",
    review: "ai_assisted_pending_review",
    updatedOn: "2026-09-30",
    summary: t(
      "मौरी र अन्य परागसेचकले बाली उत्पादनमा दिने योगदान र तिनको संरक्षण।",
      "What bees and other pollinators contribute to crops, and how to protect them.",
    ),
    explanation: [
      t(
        "परागसेचकले एउटा फूलको परागकण अर्को फूलसम्म पुर्‍याउँछन्। मौरी मुख्य परागसेचक हुन्; पुतली, झिँगा, चरा र चमेरोले पनि परागसेचन गर्छन्।",
        "Pollinators carry pollen from flower to flower. Bees are the main pollinators; butterflies, flies, birds and bats also pollinate.",
      ),
      t(
        "तोरी, फर्सीजन्य बाली र स्याउ जस्ता पर-परागसेचन हुने बालीको उत्पादन र गुणस्तर परागसेचकमा धेरै निर्भर हुन्छ।",
        "The yield and quality of cross-pollinated crops such as mustard, cucurbits and apple depend heavily on pollinators.",
      ),
      t(
        "फूल फुलेको बेला विषादी नछर्ने, छर्नै परे मौरी नउड्ने साँझपख कम विषाक्त विषादी प्रयोग गर्ने, र फूल फुल्ने बिरुवा तथा वासस्थान जोगाउने परागसेचक संरक्षणका मुख्य उपाय हुन्।",
        "Avoid spraying during flowering; if spraying is unavoidable, use a less toxic product in the evening when bees are not flying; and conserve flowering plants and habitat.",
      ),
    ],
    keyPoints: [
      t("मौरी मुख्य परागसेचक", "Bees are the main pollinators"),
      t("पर-परागसेचन हुने बाली बढी निर्भर", "Cross-pollinated crops depend most"),
      t(
        "फूल फुल्दा विषादी नछर्ने; छर्नै परे साँझपख",
        "No spraying in bloom; if unavoidable, in the evening",
      ),
    ],
    citations: [
      official(DOC, t("प्रथम पत्र, भाग २, बुँदा ५.७", "Paper I, Part II, topic 5.7"), {
        text: "Roles of pollinators in crop production",
        lang: "en",
      }),
      placeholder("aitc"),
    ],
  },
];

const P = placeholder;
const reasoningUnit = (ne: string, en: string) => unit(ne, en);

export const questions: Question[] = [
  question({
    id: "l7-ga-01",
    syllabusId: syllabus.id,
    subjectId: "ga",
    topicId: "ga-1.8",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "नेपालको संविधान (पहिलो संशोधन), २०७२ कहिले प्रमाणीकरण र प्रकाशन भयो?",
      "When was the Constitution of Nepal (First Amendment), 2072 authenticated and published?",
    ),
    correct: t("२०७२/११/१६", "2072/11/16 BS"),
    wrong: [
      [
        t("२०७२/०६/०३", "2072/06/03 BS"),
        t(
          "यो संविधान नै राजपत्रमा प्रकाशन भएको मिति हो।",
          "That is when the Constitution itself was published in the Gazette.",
        ),
      ],
      [
        t("२०७७/०३/०४", "2077/03/04 BS"),
        t("यो दोस्रो संशोधनको मिति हो।", "That is the second amendment."),
      ],
      [
        t("२०७३/११/१६", "2073/11/16 BS"),
        t(
          "वर्ष मिलेन; पहिलो संशोधन २०७२ सालमै भएको हो।",
          "Wrong year; the first amendment is from 2072.",
        ),
      ],
    ],
    explanation: t(
      "कानुन आयोगको संस्करणमा 'नेपालको संविधान (पहिलो संशोधन), २०७२' को प्रमाणीकरण र प्रकाशन मिति २०७२।११।१६ उल्लेख छ।",
      "The Law Commission's edition lists the Constitution of Nepal (First Amendment), 2072, authenticated and published on 2072/11/16.",
    ),
    citation: official("REF-04", t("पहिलो पृष्ठ", "First page"), {
      text: "नेपालको संविधान (पहिलो संशोधन), २०७२ २०७२।११।१६",
      translation: t(
        "पहिलो संशोधन, २०७२: प्रमाणीकरण र प्रकाशन मिति २०७२/११/१६",
        "First Amendment, 2072: authenticated and published 2072/11/16",
      ),
    }),
  }),
  question({
    id: "l7-ga-02",
    syllabusId: syllabus.id,
    subjectId: "ga",
    topicId: "ga-1.8",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "नेपालको संविधानको कुन भागमा मौलिक हक र कर्तव्य छन्?",
      "Which Part of the Constitution of Nepal covers fundamental rights and duties?",
    ),
    correct: t("भाग ३", "Part 3"),
    wrong: [
      [t("भाग १", "Part 1"), t("भाग १ प्रारम्भिक भाग हो।", "Part 1 is the preliminary part.")],
      [
        t("भाग ४", "Part 4"),
        t(
          "भाग ४ राज्यका निर्देशक सिद्धान्त, नीति तथा दायित्व हो।",
          "Part 4 covers the directive principles, policies and obligations of the State.",
        ),
      ],
      [
        t("भाग ५", "Part 5"),
        t(
          "भाग ५ राज्यको संरचना र राज्यशक्तिको बाँडफाँट हो।",
          "Part 5 covers the structure of the State and distribution of state power.",
        ),
      ],
    ],
    explanation: t(
      "संविधानको भाग ३ (धारा १६ देखि ४८) मा मौलिक हक र कर्तव्य छन्।",
      "Part 3 of the Constitution (Articles 16 to 48) sets out fundamental rights and duties.",
    ),
    citation: P("lawcommission"),
  }),
  question({
    id: "l7-ga-03",
    syllabusId: syllabus.id,
    subjectId: "ga",
    topicId: "ga-1.9",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "नेपालको संविधानले राज्यको मूल संरचना कति तहको बनाएको छ?",
      "How many levels does the Constitution of Nepal set for the main structure of the State?",
    ),
    correct: t("तीन: संघ, प्रदेश र स्थानीय तह", "Three: federation, province and local level"),
    wrong: [
      [
        t("दुई: संघ र प्रदेश", "Two: federation and province"),
        t(
          "स्थानीय तह पनि राज्यको मूल संरचनाको तह हो।",
          "The local level is also one of the main levels.",
        ),
      ],
      [t("चार", "Four"), t("संविधानले तीन तह तोकेको छ।", "The Constitution sets three.")],
      [t("पाँच", "Five"), t("संविधानले तीन तह तोकेको छ।", "The Constitution sets three.")],
    ],
    explanation: t(
      "संविधानको धारा ५६ अनुसार संघीय लोकतान्त्रिक गणतन्त्र नेपालको मूल संरचना संघ, प्रदेश र स्थानीय गरी तीन तहको हुन्छ।",
      "Under Article 56, the main structure of the Federal Democratic Republic of Nepal has three levels: federation, province and local.",
    ),
    citation: P("lawcommission"),
  }),
  question({
    id: "l7-rs-01",
    syllabusId: syllabus.id,
    subjectId: "rs",
    topicId: "rs-2.2",
    origin: "reasoning",
    provenance: "demo",
    stem: t(
      "श्रृङ्खलामा अर्को संख्या कुन हो? २, ६, १२, २०, ३०, ?",
      "What comes next? 2, 6, 12, 20, 30, ?",
    ),
    correct: t("४२", "42"),
    wrong: [
      [
        t("४०", "40"),
        t(
          "फरक ४, ६, ८, १० हुँदै बढ्छ; अर्को फरक १२ हो।",
          "The gaps grow 4, 6, 8, 10; the next gap is 12.",
        ),
      ],
      [
        t("३६", "36"),
        t(
          "फरक ४, ६, ८, १० हुँदै बढ्छ; अर्को फरक १२ हो।",
          "The gaps grow 4, 6, 8, 10; the next gap is 12.",
        ),
      ],
      [
        t("४४", "44"),
        t(
          "फरक ४, ६, ८, १० हुँदै बढ्छ; अर्को फरक १२ हो।",
          "The gaps grow 4, 6, 8, 10; the next gap is 12.",
        ),
      ],
    ],
    explanation: t(
      "यी संख्या १×२, २×३, ३×४, ४×५, ५×६ हुन्; अर्को ६×७ = ४२।",
      "These are 1×2, 2×3, 3×4, 4×5 and 5×6; the next is 6×7 = 42.",
    ),
    citation: reasoningUnit(
      "प्रथम पत्र, भाग १, बुँदा २.२ संख्यात्मक क्षमता",
      "Paper I, Part I, topic 2.2 Numerical reasoning",
    ),
  }),
  question({
    id: "l7-rs-02",
    syllabusId: syllabus.id,
    subjectId: "rs",
    topicId: "rs-2.1",
    origin: "reasoning",
    provenance: "demo",
    stem: t(
      "कुनै संकेतमा KRISHI लाई LSJTIJ लेखिन्छ भने MAKAI लाई कसरी लेखिन्छ?",
      "In a code, KRISHI is written LSJTIJ. How is MAKAI written?",
    ),
    correct: t("NBLBJ", "NBLBJ"),
    wrong: [
      [
        t("LZJZH", "LZJZH"),
        t(
          "यसमा हरेक अक्षर एक स्थान पछाडि सारिएको छ; संकेतमा अगाडि सारिन्छ।",
          "This moves each letter back one place; the code moves it forward.",
        ),
      ],
      [
        t("NBLAJ", "NBLAJ"),
        t("चौथो अक्षर A लाई पनि B बनाउनुपर्छ।", "The fourth letter, A, must also become B."),
      ],
      [
        t("OCMCK", "OCMCK"),
        t(
          "यसमा दुई स्थान अगाडि सारिएको छ; संकेतमा एक स्थान मात्र।",
          "This moves each letter two places; the code moves one.",
        ),
      ],
    ],
    explanation: t(
      "संकेतमा हरेक अक्षर वर्णमालामा एक स्थान अगाडि सारिएको छ: K→L, R→S, I→J, S→T, H→I। त्यसैले M→N, A→B, K→L, A→B, I→J = NBLBJ।",
      "Each letter moves one place forward in the alphabet: K→L, R→S, I→J, S→T, H→I. So M→N, A→B, K→L, A→B, I→J gives NBLBJ.",
    ),
    citation: reasoningUnit(
      "प्रथम पत्र, भाग १, बुँदा २.१ तार्किक क्षमता",
      "Paper I, Part I, topic 2.1 Logical reasoning",
    ),
  }),
  question({
    id: "l7-rs-03",
    syllabusId: syllabus.id,
    subjectId: "rs",
    topicId: "rs-2.1",
    origin: "reasoning",
    provenance: "demo",
    stem: t(
      "राम ४ किमी उत्तर हिँड्छ, दायाँ मोडिएर ३ किमी हिँड्छ, फेरि दायाँ मोडिएर ४ किमी हिँड्छ। अब ऊ सुरुको ठाउँबाट कति टाढा र कुन दिशामा छ?",
      "Ram walks 4 km north, turns right and walks 3 km, then turns right again and walks 4 km. How far from the start is he, and in which direction?",
    ),
    correct: t("३ किमी पूर्व", "3 km east"),
    wrong: [
      [
        t("३ किमी पश्चिम", "3 km west"),
        t(
          "उत्तरतर्फ फर्केर दायाँ मोडिनु भनेको पूर्वतर्फ जानु हो।",
          "Turning right while facing north means heading east.",
        ),
      ],
      [
        t("११ किमी उत्तर", "11 km north"),
        t(
          "यो हिँडेको कुल दूरी हो, सुरुबाटको दूरी होइन।",
          "That is the total distance walked, not the distance from the start.",
        ),
      ],
      [
        t("५ किमी उत्तरपूर्व", "5 km north-east"),
        t(
          "पछिल्लो ४ किमी दक्षिणतर्फ हिँडेकाले उत्तरको दूरी सकियो।",
          "The last 4 km south cancels the 4 km north.",
        ),
      ],
    ],
    explanation: t(
      "४ किमी उत्तर, ३ किमी पूर्व, अनि ४ किमी दक्षिण हिँड्दा उत्तर-दक्षिणको दूरी सकिन्छ र ऊ सुरुको ठाउँबाट ३ किमी पूर्वमा पुग्छ।",
      "4 km north, 3 km east, then 4 km south: the north and south legs cancel, leaving him 3 km east of the start.",
    ),
    citation: reasoningUnit(
      "प्रथम पत्र, भाग १, बुँदा २.१ तार्किक क्षमता",
      "Paper I, Part I, topic 2.1 Logical reasoning",
    ),
  }),
  question({
    id: "l7-rs-04",
    syllabusId: syllabus.id,
    subjectId: "rs",
    topicId: "rs-2.2",
    origin: "reasoning",
    provenance: "demo",
    stem: t(
      "८ जना कामदारले एउटा खेत ६ दिनमा रोप्छन्। उही दरमा १२ जनाले कति दिनमा रोप्छन्?",
      "8 workers plant a field in 6 days. At the same rate, how many days do 12 workers take?",
    ),
    correct: t("४", "4"),
    wrong: [
      [
        t("९", "9"),
        t("कामदार बढ्दा दिन घट्छ, बढ्दैन।", "More workers means fewer days, not more."),
      ],
      [
        t("५", "5"),
        t(
          "कुल काम ८ × ६ = ४८ जना-दिन हो; ४८ ÷ १२ = ४।",
          "Total work is 8 × 6 = 48 worker-days; 48 ÷ 12 = 4.",
        ),
      ],
      [
        t("३", "3"),
        t(
          "कुल काम ८ × ६ = ४८ जना-दिन हो; ४८ ÷ १२ = ४।",
          "Total work is 8 × 6 = 48 worker-days; 48 ÷ 12 = 4.",
        ),
      ],
    ],
    explanation: t(
      "कुल काम = ८ × ६ = ४८ जना-दिन। १२ जनाले ४८ ÷ १२ = ४ दिन लगाउँछन्।",
      "Total work = 8 × 6 = 48 worker-days. Twelve workers take 48 ÷ 12 = 4 days.",
    ),
    citation: reasoningUnit(
      "प्रथम पत्र, भाग १, बुँदा २.२ संख्यात्मक क्षमता",
      "Paper I, Part I, topic 2.2 Numerical reasoning",
    ),
  }),
  question({
    id: "l7-t1-01",
    syllabusId: syllabus.id,
    subjectId: "t1",
    topicId: "t1-1.4",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "कृषि दीर्घकालीन योजना (APP) कति वर्षको योजना थियो?",
      "The Agriculture Perspective Plan (APP) was a plan for how many years?",
    ),
    correct: t("२० वर्ष", "20 years"),
    wrong: [
      [t("१० वर्ष", "10 years"), t("APP २० वर्षे योजना थियो।", "The APP was a 20-year plan.")],
      [
        t("५ वर्ष", "5 years"),
        t(
          "५ वर्षे योजना आवधिक योजना हो; APP २० वर्षे थियो।",
          "Five-year plans are the periodic plans; the APP ran 20 years.",
        ),
      ],
      [t("२५ वर्ष", "25 years"), t("APP २० वर्षे योजना थियो।", "The APP was a 20-year plan.")],
    ],
    explanation: t(
      "APP सन् १९९५/९६ देखि २०१४/१५ सम्मको २० वर्षे योजना थियो; त्यसपछि कृषि विकास रणनीति (२०१५–२०३५) आयो।",
      "The APP ran for 20 years, from 1995/96 to 2014/15, and was followed by the Agriculture Development Strategy (2015–2035).",
    ),
    citation: P("moald"),
  }),
  question({
    id: "l7-t2-01",
    syllabusId: syllabus.id,
    subjectId: "t2",
    topicId: "t2-2.2",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "नेपाल कृषि अनुसन्धान परिषद् (नार्क) कहिले स्थापना भयो?",
      "When was the Nepal Agricultural Research Council (NARC) established?",
    ),
    correct: t("सन् १९९१ (वि.सं. २०४८)", "1991 (2048 BS)"),
    wrong: [
      [t("सन् १९७२", "1972"), t("नार्क सन् १९९१ मा स्थापना भएको हो।", "NARC was set up in 1991.")],
      [t("सन् २००१", "2001"), t("नार्क सन् १९९१ मा स्थापना भएको हो।", "NARC was set up in 1991.")],
      [t("सन् २०१०", "2010"), t("नार्क सन् १९९१ मा स्थापना भएको हो।", "NARC was set up in 1991.")],
    ],
    explanation: t(
      "नार्क सन् १९९१ (वि.सं. २०४८) मा नेपाल कृषि अनुसन्धान परिषद् ऐनअन्तर्गत स्वायत्त संस्थाका रूपमा स्थापना भएको हो।",
      "NARC was established in 1991 (2048 BS) as an autonomous body under the Nepal Agricultural Research Council Act.",
    ),
    citation: P("narc"),
  }),
  question({
    id: "l7-t2-02",
    syllabusId: syllabus.id,
    subjectId: "t2",
    topicId: "t2-2.4",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "कृषि तथा वन विज्ञान विश्वविद्यालय कहाँ छ?",
      "Where is the Agriculture and Forestry University (AFU)?",
    ),
    correct: t("रामपुर, चितवन", "Rampur, Chitwan"),
    wrong: [
      [
        t("कीर्तिपुर, काठमाडौं", "Kirtipur, Kathmandu"),
        t(
          "कीर्तिपुरमा त्रिभुवन विश्वविद्यालयको केन्द्रीय क्याम्पस छ।",
          "Kirtipur is the central campus of Tribhuvan University.",
        ),
      ],
      [
        t("धुलिखेल, काभ्रे", "Dhulikhel, Kavre"),
        t("धुलिखेलमा काठमाडौं विश्वविद्यालय छ।", "Dhulikhel is home to Kathmandu University."),
      ],
      [
        t("पोखरा, कास्की", "Pokhara, Kaski"),
        t("पोखरामा पोखरा विश्वविद्यालय छ।", "Pokhara is home to Pokhara University."),
      ],
    ],
    explanation: t(
      "कृषि तथा वन विज्ञान विश्वविद्यालय रामपुर, चितवनमा छ।",
      "The Agriculture and Forestry University is at Rampur in Chitwan.",
    ),
    citation: P("university"),
  }),
  question({
    id: "l7-t3-01",
    syllabusId: syllabus.id,
    subjectId: "t3",
    topicId: "t3-3.4",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "एकीकृत खाद्यतत्व व्यवस्थापन (IPNM) लाई कुन भनाइले राम्रोसँग बुझाउँछ?",
      "Which best describes integrated plant nutrient management (IPNM)?",
    ),
    correct: t(
      "माटो जाँचका आधारमा रासायनिक मलसँगै प्राङ्गारिक मल र जैविक मल प्रयोग गर्ने",
      "Using chemical fertilisers together with organic manures and biofertilisers, guided by a soil test",
    ),
    wrong: [
      [
        t(
          "अधिकतम उत्पादनका लागि अधिकतम रासायनिक मल",
          "Maximum chemical fertiliser for maximum yield",
        ),
        t(
          "यसले लागत र माटोको क्षति बढाउँछ; IPNM सन्तुलनमा जोड दिन्छ।",
          "That raises cost and harms soil; IPNM is about balance.",
        ),
      ],
      [
        t("हरियो मल मात्र", "Green manure only"),
        t(
          "IPNM ले एउटै स्रोत होइन, धेरै स्रोत मिलाउँछ।",
          "IPNM combines sources rather than relying on one.",
        ),
      ],
      [
        t("पात्रोअनुसार तोकिएको मात्रामा मल", "A fixed dose on a calendar"),
        t(
          "IPNM माटो र बालीको आवश्यकतामा आधारित हुन्छ।",
          "IPNM follows what the soil and crop need.",
        ),
      ],
    ],
    explanation: t(
      "IPNM को उद्देश्य माटोको उर्वराशक्ति कायम राख्दै खाद्यतत्वको उपयोग दक्षता बढाउनु हो।",
      "IPNM aims to keep soil fertile while using nutrients more efficiently.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l7-t3-02",
    syllabusId: syllabus.id,
    subjectId: "t3",
    topicId: "t3-3.9",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "कृषिमा जलवायु परिवर्तनको अनुकूलन (न्यूनीकरण होइन) को उपाय कुन हो?",
      "Which is an adaptation measure (not mitigation) for climate change in agriculture?",
    ),
    correct: t("खडेरी सहने जात लगाउने", "Growing drought-tolerant varieties"),
    wrong: [
      [
        t("धानखेतबाट निस्कने मिथेन घटाउने", "Cutting methane from paddy fields"),
        t("हरितगृह ग्यास घटाउनु न्यूनीकरण हो।", "Cutting greenhouse gases is mitigation."),
      ],
      [
        t("कार्बन सञ्चय गर्न रूख रोप्ने", "Planting trees to store carbon"),
        t("कार्बन सञ्चय न्यूनीकरण हो।", "Storing carbon is mitigation."),
      ],
      [
        t("मलबाट निस्कने नाइट्रस अक्साइड घटाउने", "Reducing nitrous oxide from fertiliser"),
        t("उत्सर्जन घटाउनु न्यूनीकरण हो।", "Reducing emissions is mitigation."),
      ],
    ],
    explanation: t(
      "अनुकूलनले बदलिँदो जलवायुसँग जोगिन मद्दत गर्छ, जस्तै खडेरी वा बाढी सहने जात र पानीको राम्रो व्यवस्थापन। न्यूनीकरणले हरितगृह ग्यास उत्सर्जन घटाउँछ।",
      "Adaptation helps farms cope with a changing climate, such as drought- or flood-tolerant varieties and better water management. Mitigation reduces greenhouse gas emissions.",
    ),
    citation: P("moald"),
  }),
  question({
    id: "l7-t4-01",
    syllabusId: syllabus.id,
    subjectId: "t4",
    topicId: "t4-4.12",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "पाठ्यक्रमले बीउबिजन नियमावली, २०६९ सँगै कुन ऐन उल्लेख गरेको छ?",
      "Which Act does the syllabus name together with the Seeds Regulation, 2069?",
    ),
    correct: t("बीउबिजन ऐन, २०४५", "Seeds Act, 2045"),
    wrong: [
      [
        t("बिरुवा संरक्षण ऐन, २०६४", "Plant Protection Act, 2064"),
        t(
          "बिरुवा संरक्षण ऐन बिरुवा संरक्षण नियमावलीसँग उल्लेख छ।",
          "The Plant Protection Act is listed with the Plant Protection Rules.",
        ),
      ],
      [
        t("विषादी व्यवस्थापन ऐन, २०७६", "Pesticides Management Act, 2076"),
        t("यो छुट्टै बुँदामा उल्लेख छ।", "It is listed as a separate topic."),
      ],
      [
        t(
          "खाद्य अधिकार तथा खाद्य सम्प्रभुता ऐन, २०७५",
          "Food Right and Food Sovereignty Act, 2075",
        ),
        t("यो छुट्टै बुँदामा उल्लेख छ।", "It is listed as a separate topic."),
      ],
    ],
    explanation: t(
      "पाठ्यक्रमको प्रथम पत्र, भाग २ को बुँदा ४.१२ मा बीउबिजन ऐन, २०४५ र नियमावली, २०६९ उल्लेख छन्।",
      "Paper I, Part II, topic 4.12 names the Seeds Act, 2045 and the Seeds Regulation, 2069.",
    ),
    citation: official(DOC, t("प्रथम पत्र, भाग २, बुँदा ४.१२", "Paper I, Part II, topic 4.12"), {
      text: "Seeds Act, 2045 (1988) and Seeds Regulation, 2069 (2013)",
      lang: "en",
    }),
  }),
  question({
    id: "l7-t4-02",
    syllabusId: syllabus.id,
    subjectId: "t4",
    topicId: "t4-4.13",
    origin: "drafted",
    provenance: "official",
    stem: t(
      "पाठ्यक्रमले उल्लेख गरेको बिरुवा संरक्षण ऐन कुन सालको हो?",
      "Which year (BS) is the Plant Protection Act named in the syllabus?",
    ),
    correct: t("२०६४", "2064"),
    wrong: [
      [
        t("२०४५", "2045"),
        t(
          "पाठ्यक्रमले बिरुवा संरक्षण ऐन, २०६४ उल्लेख गरेको छ।",
          "The syllabus names the Plant Protection Act, 2064.",
        ),
      ],
      [
        t("२०७६", "2076"),
        t(
          "पाठ्यक्रमले बिरुवा संरक्षण ऐन, २०६४ उल्लेख गरेको छ।",
          "The syllabus names the Plant Protection Act, 2064.",
        ),
      ],
      [
        t("२०५५", "2055"),
        t(
          "पाठ्यक्रमले बिरुवा संरक्षण ऐन, २०६४ उल्लेख गरेको छ।",
          "The syllabus names the Plant Protection Act, 2064.",
        ),
      ],
    ],
    explanation: t(
      "पाठ्यक्रमको बुँदा ४.१३ मा बिरुवा संरक्षण ऐन, २०६४ र बिरुवा संरक्षण नियमावली, २०६६ उल्लेख छन्।",
      "Topic 4.13 names the Plant Protection Act, 2064 and the Plant Protection Rules, 2066.",
    ),
    citation: official(DOC, t("प्रथम पत्र, भाग २, बुँदा ४.१३", "Paper I, Part II, topic 4.13"), {
      text: "Plant Protection Act, 2064 (2007) and Plant Protection Rules, 2066 (2010)",
      lang: "en",
    }),
  }),
  question({
    id: "l7-t5-01",
    syllabusId: syllabus.id,
    subjectId: "t5",
    topicId: "t5-5.7",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "फूल फुलेको बालीमा विषादी छर्नैपर्दा परागसेचक जोगाउने राम्रो तरिका कुन हो?",
      "When a flowering crop must be sprayed, how are pollinators best protected?",
    ),
    correct: t(
      "मौरी नउड्ने साँझपख कम विषाक्त विषादी छर्ने",
      "Spray a less toxic product in the evening, when bees are not flying",
    ),
    wrong: [
      [
        t("पूरा फूल फुलेको बेला मध्यदिनमा छर्ने", "Spray at midday in full bloom"),
        t("मध्यदिनमा मौरी सबैभन्दा सक्रिय हुन्छन्।", "Bees are most active at midday."),
      ],
      [
        t("नजिकका फूल फुलेका झारमा पनि छर्ने", "Also spray nearby flowering weeds"),
        t("यसले थप परागसेचक मार्छ।", "That kills even more pollinators."),
      ],
      [
        t("एकै पटक धेरै कीटनाशक मिसाएर छर्ने", "Mix several insecticides into one spray"),
        t("मिश्रणले विषाक्तता बढाउन सक्छ।", "Mixtures can raise toxicity."),
      ],
    ],
    explanation: t(
      "मौरी दिउँसो सक्रिय हुन्छन्; साँझपख छर्दा र कम विषाक्त, छनौटयुक्त विषादी प्रयोग गर्दा तिनमाथिको असर घट्छ।",
      "Bees forage in daylight; spraying in the evening with a less toxic, selective product reduces the harm.",
    ),
    citation: P("aitc"),
  }),
  question({
    id: "l7-t5-02",
    syllabusId: syllabus.id,
    subjectId: "t5",
    topicId: "t5-5.3",
    origin: "drafted",
    provenance: "demo",
    stem: t(
      "नयाँ जात उन्मोचनअघि गरिने DUS परीक्षणको पूरा रूप के हो?",
      "What does DUS stand for in variety testing before release?",
    ),
    correct: t("Distinctness, Uniformity and Stability", "Distinctness, Uniformity and Stability"),
    wrong: [
      [
        t("Durability, Utility and Size", "Durability, Utility and Size"),
        t(
          "DUS ले जात फरक, एकरूप र स्थिर छ कि छैन जाँच्छ।",
          "DUS checks whether a variety is distinct, uniform and stable.",
        ),
      ],
      [
        t("Disease, Uniformity and Seed rate", "Disease, Uniformity and Seed rate"),
        t(
          "DUS ले जात फरक, एकरूप र स्थिर छ कि छैन जाँच्छ।",
          "DUS checks whether a variety is distinct, uniform and stable.",
        ),
      ],
      [
        t("Density, Uptake and Stress", "Density, Uptake and Stress"),
        t(
          "DUS ले जात फरक, एकरूप र स्थिर छ कि छैन जाँच्छ।",
          "DUS checks whether a variety is distinct, uniform and stable.",
        ),
      ],
    ],
    explanation: t(
      "DUS परीक्षणले नयाँ जात अरूभन्दा फरक, आफैंभित्र एकरूप र पुस्तौंसम्म स्थिर छ कि छैन भनी जाँच्छ।",
      "A DUS test checks that a new variety is distinct from others, uniform within itself and stable over generations.",
    ),
    citation: P("sqcc"),
  }),
];
