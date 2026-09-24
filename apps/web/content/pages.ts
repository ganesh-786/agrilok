// Long-form page text, in both languages. Kept apart from lib/i18n.ts, which
// holds the short interface strings.

export const howItWorks = {
  ne: {
    title: "यो कसरी काम गर्छ",
    lede: "एउटा नियमबाट सबै कुरा सुरु हुन्छ: उत्तर आधिकारिक कागजातबाट मात्र आउँछ। कागजातमा नभएको कुरा AI ले आफ्नो जानकारीबाट भर्दैन। भेटिएन भने भेटिएन भन्छ।",
    stepsTitle: "प्रश्न सोधेदेखि उत्तरसम्म",
    steps: [
      "हामी लोक सेवा आयोग, प्रदेश लोक सेवा आयोग र सम्बन्धित सरकारी निकायका साइटबाट पाठ्यक्रम र कानुनी कागजात लिन्छौं। हरेक फाइलको मूल लिंक, लिइएको मिति र चेकसम राखिन्छ, ताकि पछि पनि “सरकारले यही प्रकाशित गरेको थियो” भनेर देखाउन सकियोस्।",
      "कुनै कागजात नामै लेखिएको व्यक्तिले भर्ना (admit) नगरेसम्म कुनै प्रश्नको उत्तरमा प्रयोग हुँदैन। स्क्यान गरिएका वा पढ्न कठिन कागजात PDF सँगै दाँजेर मात्र भर्ना गरिन्छ।",
      "प्रश्न सोध्दा तपाईंको तह, प्रदेश र समूहका कागजातमध्ये मिल्दाजुल्दा भाग खोजिन्छ। तह ४ र तह ७ का पाठ्यक्रम कहिल्यै मिसिँदैनन्।",
      "AI लाई ती भाग मात्र दिइन्छ, स्पष्ट निर्देशनसहित: यिनमा लेखिएको कुरा मात्र भन्नु, र हरेक भनाइसँग स्रोतबाट शब्दशः उद्धरण दिनु।",
      "उत्तर देखाउनुअघि कम्प्युटरले जाँच्छ: हरेक भनाइ स्रोतको एउटै ठाउँमा साँच्चै लेखिएको छ कि छैन, अंकहरू मिल्छन् कि मिल्दैनन्, र छेउछाउका दुई बेग्लाबेग्लै बुँदा जोडेर नयाँ कुरा बनाइएको त छैन। कुनै भनाइ मिलेन भने पूरै उत्तर रोकिन्छ।",
      "उत्तर सुरक्षित गरिन्छ र उस्तै प्रश्न सोध्ने अर्को विद्यार्थीलाई सिधै देखाइन्छ। यसैले सेवा निःशुल्क चल्छ। मिल्दोजुल्दो प्रश्नको उत्तर देखाउँदा त्यो कुन प्रश्नका लागि लेखिएको थियो भन्ने पनि देखाइन्छ।",
    ],
    reviewTitle: "दुई चिन्ह, दुई अर्थ",
    reviewVerified:
      "कुनै व्यक्तिले मूल कागजातसँग दाँजेर जाँचेको। जाँच्ने व्यक्तिको नाम र मिति देखिन्छ। एउटै व्यक्तिले तयार पनि पारेको र जाँचेको भए त्यो पनि लेखिन्छ।",
    reviewPending:
      "अहिलेसम्म कुनै व्यक्तिले जाँचेको छैन। कागजात आधिकारिक हो, तर पाठ निकाल्दा वा उत्तर लेख्दा गल्ती हुन सक्छ। स्रोत आफैं हेर्नुहोस्।",
    measuredTitle: "अहिलेसम्म नापिएको",
    measured: [
      "२०२६ सेप्टेम्बर २४ मा तह ४ का २० वटा वास्तविक विगत प्रश्न र १३ वटा परीक्षण प्रश्नमा चलाइयो। सबै ३३ ले अपेक्षित व्यवहार गरे: उत्तर दिनुपर्नेमा स्रोतसहित उत्तर, नदिनुपर्नेमा इन्कार।",
      "देखाइएका उत्तर व्यक्तिले पढेर स्रोतसँग दाँजियो। एउटाले स्रोतमा नभएको सामान्यीकरण गर्‍यो। त्यस्तो तर्कको गल्ती कम्प्युटरको जाँचले समात्न सक्दैन, त्यसैले व्यक्तिको समीक्षा अझै आवश्यक छ।",
      "एउटा वास्तविक प्रश्नमा AI ले दुई छेउछाउका शीर्षक जोडेर गलत उत्तर बनाएको थियो। अब त्यस्तो उत्तर जाँचले रोक्छ, र तीन पटक प्रत्यक्ष चलाउँदा तीनै पटक रोकियो।",
      "तह ७ का उत्तर वास्तविक तह ७ को विगत प्रश्नपत्रसँग अहिलेसम्म नापिएका छैनन्।",
    ],
    aiTitle: "AI र तपाईंको जानकारी",
    ai: "उत्तर Google को Gemini AI ले निःशुल्क सेवामा लेख्छ। त्यो सेवामा पठाइएको सामग्री Google ले आफ्नो सेवा सुधार्न प्रयोग गर्न सक्छ र मानिसले पढ्न सक्छन्। त्यसैले प्रश्नबाहेक तपाईंको कुनै पनि व्यक्तिगत जानकारी त्यहाँ पठाइँदैन, र प्रश्नमा फोन नम्बर वा इमेल देखिए प्रश्न नै पठाइँदैन।",
    limitsTitle: "सीमा",
    limits: [
      "पाठ्यक्रमले विषयको नाम मात्र दिन्छ, व्याख्या गर्दैन। त्यसैले धेरै प्रश्नमा इन्कार आउँछ। अनुमानभन्दा इन्कार राम्रो।",
      "Gemini नेपालीमा अंग्रेजीभन्दा कमजोर छ। यही कारण उत्तर AI को आफ्नै ज्ञानबाट होइन, कागजातबाट मात्र आउँछ।",
      "पुराना फन्टमा टाइप गरिएका केही PDF को नेपाली पाठ पढ्न सकिँदैन। ती लाइन हटाइन्छन् र कति हटाइयो भन्ने देखाइन्छ।",
    ],
  },
  en: {
    title: "How it works",
    lede: "Everything follows from one rule: answers come only from official documents. When a document does not say something, the AI does not fill the gap from its own memory. If it is not found, it says so.",
    stepsTitle: "From question to answer",
    steps: [
      "We collect syllabi and legal documents from the websites of the Public Service Commission, the provincial commissions and the relevant government bodies. Each file keeps its original link, the date we fetched it and a checksum, so we can always show exactly what the government published.",
      "No document is used to answer anything until a named person admits it. Scanned or hard-to-read documents are admitted only after the text has been compared against the PDF itself.",
      "When you ask, the matching passages are found among the documents for your level, province and group. Level 4 and Level 7 syllabi never mix.",
      "The AI is given only those passages, with plain instructions: say only what they say, and back every statement with a word-for-word quote.",
      "Before an answer is shown, a program checks that each statement really is written in one place in a source, that its numbers match, and that it was not built by joining two separate neighbouring items. If any statement fails, the whole answer is withheld.",
      "Answers are saved and shown directly to the next student who asks the same thing. That is how the service stays free. When an answer to a similar question is shown, the question it was written for is shown too.",
    ],
    reviewTitle: "Two labels, two meanings",
    reviewVerified:
      "A person has compared it against the original document. Their name and the date are shown. If the same person prepared it and checked it, that is said too.",
    reviewPending:
      "No person has checked it yet. The document is official, but text extraction or the written answer can still be wrong. Look at the source yourself.",
    measuredTitle: "What has been measured",
    measured: [
      "On 24 September 2026 it was run on 20 real Level 4 past-paper questions and 13 test questions. All 33 behaved as expected: a cited answer where one was expected, a refusal where the sources do not say.",
      "Every answer shown was read against its sources by a person. One generalised beyond what its source says. A program cannot catch that kind of reasoning slip, which is why human review is still needed.",
      "On one real question the AI once built a wrong answer by joining two neighbouring headings. That kind of answer is now stopped by the check, and in three live runs it was stopped all three times.",
      "Level 7 answers have not yet been measured against a real Level 7 past paper.",
    ],
    aiTitle: "The AI and your information",
    ai: "Answers are written by Google's Gemini AI on its free tier. Content sent to that tier may be used by Google to improve its products and may be read by people. So nothing about you is sent except your question, and a question that looks like it contains a phone number or email is not sent at all.",
    limitsTitle: "Limits",
    limits: [
      "A syllabus names topics; it does not explain them. So many questions are refused. A refusal is better than a guess.",
      "Gemini is weaker in Nepali than in English. That is exactly why answers come from documents, not from the AI's own knowledge.",
      "Some PDFs are typed in old Nepali fonts whose text cannot be read. Those lines are left out, and the count is shown.",
    ],
  },
};

export const sourcesPage = {
  ne: {
    title: "स्रोतहरू",
    lede: "यहाँका सबै उत्तर तलका कागजातबाट मात्र आउँछन्। हरेक कागजात सरकारी निकायले प्रकाशित गरेको हो, र हरेकको मूल लिंक छ।",
    ruleTitle: "कुन स्रोत मान्य छ",
    rule: "लोक सेवा आयोग, सात वटा प्रदेश लोक सेवा आयोग, नेपाल कृषि अनुसन्धान परिषद्, कृषि हेर्ने मन्त्रालय र नेपाल कानून आयोग। कोचिङ सेन्टरका नोट, ब्लग, फेसबुक वा युट्युब होइन, जतिसुकै सही भए पनि। कसौटी सही हुनु होइन, आधिकारिक निकायसँग दाँजेर जाँच्न सकिनु हो।",
    collectedTitle: "कसरी संकलन गरियो",
    collected:
      "पहिलो संग्रह हातैले, हरेक आयोगको आफ्नै साइटबाट एक एक गरी डाउनलोड गरिएको हो। स्वचालित संकलन स्वीकृत स्रोतबाट मात्र हुन्छ, robots.txt मानेर, बिस्तारै, र आफ्नो परिचय दिएर।",
    levelTitle: "तहअनुसार कागजात",
    takedownTitle: "हटाउन अनुरोध",
    takedown:
      "कुनै निकाय वा अधिकारवालाले सामग्री हटाउन भन्नुभयो भने पहिले हटाइन्छ, छलफल पछि हुन्छ। सम्पर्क: ganeshchaudhary4400@gmail.com",
  },
  en: {
    title: "Sources",
    lede: "Every answer here comes only from the documents below. Each one was published by a government body, and each links to its original.",
    ruleTitle: "What counts as a source",
    rule: "The Public Service Commission, the seven provincial public service commissions, the Nepal Agricultural Research Council, the ministry responsible for agriculture, and the Nepal Law Commission. Not coaching-centre notes, blogs, Facebook or YouTube, however accurate. The test is not whether something is right; it is whether you can check it against an authority.",
    collectedTitle: "How they were collected",
    collected:
      "The first collection was downloaded by hand, one file at a time, from each commission's own website. Automated collection only ever touches approved sources, obeys robots.txt, goes slowly and identifies itself.",
    levelTitle: "Documents by level",
    takedownTitle: "Takedown requests",
    takedown:
      "If a body or rights holder asks for something to be removed, it is removed first and discussed afterwards. Contact: ganeshchaudhary4400@gmail.com",
  },
};

export const privacyPage = {
  ne: {
    title: "गोपनीयता",
    points: [
      "तपाईंको व्यक्तिगत जानकारी AI मा कहिल्यै पठाइँदैन। पठाइने कुरा सार्वजनिक पाठ्यक्रमको पाठ र तपाईंको प्रश्न मात्र हो।",
      "प्रश्नमा फोन नम्बर वा इमेल देखिए त्यो प्रश्न नै पठाइँदैन, र तपाईंलाई त्यो हटाउन भनिन्छ।",
      "खाता चाहिँदैन। हामी तपाईंको नाम, इमेल वा फोन राख्दैनौं।",
      "सोधिएका प्रश्न र उत्तर अरू विद्यार्थीलाई देखाउन सुरक्षित गरिन्छन्। त्यसैले प्रश्नमा आफ्नो बारेमा केही नलेख्नुहोस्।",
      "धेरै छिटो प्रश्न सोधिएको रोक्न तपाईंको इन्टरनेट ठेगानाबाट बनेको, उल्टाउन नमिल्ने छोटो पहिचान केही समय मेमोरीमा राखिन्छ। यो कहीँ लेखिँदैन, र हरेक दिन फेरिन्छ।",
      "विज्ञापन वा ट्र्याकर छैन। दिनको कुल प्रश्न संख्या जस्ता गन्ती मात्र राखिन्छ।",
      "मुख्य अध्ययन सामग्री सधैं निःशुल्क रहन्छ।",
    ],
    contact: "प्रश्न वा अनुरोध: ganeshchaudhary4400@gmail.com",
  },
  en: {
    title: "Privacy",
    points: [
      "Your personal information is never sent to the AI. What is sent is public syllabus text and your question, nothing else.",
      "A question that looks like it contains a phone number or email is not sent at all, and you are asked to remove it.",
      "No account is needed. We do not keep your name, email or phone number.",
      "Questions and answers are saved so other students can see them. So do not write anything about yourself in a question.",
      "To stop questions being sent too fast, a short, non-reversible id derived from your internet address is kept in memory for a while. It is never written anywhere, and it changes every day.",
      "No advertising and no trackers. Only counts, such as how many questions were asked today, are kept.",
      "Core study content is always free.",
    ],
    contact: "Questions or requests: ganeshchaudhary4400@gmail.com",
  },
};

export const creditsPage = {
  ne: {
    title: "फोटो र सफ्टवेयर",
    photosTitle: "फोटोहरू",
    photosLead:
      "सबै फोटो Wikimedia Commons मा खुला इजाजतपत्रमा उपलब्ध छन्। वेबका लागि आकार घटाइएको मात्र हो।",
    fontsTitle: "फन्ट",
    fonts: "Mukta (Ek Type) र Martel (Dan Reynolds), दुवै SIL Open Font License अन्तर्गत।",
    softwareTitle: "सफ्टवेयर",
    software:
      "Next.js, React, Tailwind CSS, FastAPI, PostgreSQL, pgvector, Scrapy, pypdfium2 र अन्य खुला स्रोत सफ्टवेयर, प्रत्येक आफ्नै इजाजतपत्रमा।",
    documentsTitle: "सरकारी कागजात",
    documents:
      "पाठ्यक्रम, ऐन र नीतिको प्रतिलिपि अधिकार नेपाल सरकारमा छ। यहाँ ती अध्ययनका लागि उद्धृत गरिन्छन्, पूरै प्रकाशित गरिँदैनन्, र मूल लिंक सधैं दिइन्छ।",
    source: "स्रोत",
  },
  en: {
    title: "Photos and software",
    photosTitle: "Photographs",
    photosLead:
      "All photographs are openly licensed on Wikimedia Commons. They were only resized for the web.",
    fontsTitle: "Fonts",
    fonts: "Mukta (Ek Type) and Martel (Dan Reynolds), both under the SIL Open Font License.",
    softwareTitle: "Software",
    software:
      "Next.js, React, Tailwind CSS, FastAPI, PostgreSQL, pgvector, Scrapy, pypdfium2 and other open-source software, each under its own license.",
    documentsTitle: "Government documents",
    documents:
      "The syllabi, Acts and policies remain the copyright of the Government of Nepal. They are quoted here for study, never republished in full, and always linked to their originals.",
    source: "Source",
  },
};
