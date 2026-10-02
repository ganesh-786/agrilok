// Names of commissions and service groups, in both languages. Copied from
// infra/seed/reference_data.sql so the web app and the database use the same
// words; the order is the seed's sort order. A test checks they stay in step.

import type { GroupCode, ProvinceCode, Text } from "@/lib/contracts";

export const provinceNames: Record<ProvinceCode, { short: Text; full: Text }> = {
  federal: {
    short: { ne: "संघ", en: "Federal" },
    full: { ne: "संघीय लोक सेवा आयोग", en: "Federal Public Service Commission" },
  },
  koshi: {
    short: { ne: "कोशी", en: "Koshi" },
    full: { ne: "कोशी प्रदेश", en: "Koshi Province" },
  },
  madhesh: {
    short: { ne: "मधेश", en: "Madhesh" },
    full: { ne: "मधेश प्रदेश", en: "Madhesh Province" },
  },
  bagmati: {
    short: { ne: "बागमती", en: "Bagmati" },
    full: { ne: "बागमती प्रदेश", en: "Bagmati Province" },
  },
  gandaki: {
    short: { ne: "गण्डकी", en: "Gandaki" },
    full: { ne: "गण्डकी प्रदेश", en: "Gandaki Province" },
  },
  lumbini: {
    short: { ne: "लुम्बिनी", en: "Lumbini" },
    full: { ne: "लुम्बिनी प्रदेश", en: "Lumbini Province" },
  },
  karnali: {
    short: { ne: "कर्णाली", en: "Karnali" },
    full: { ne: "कर्णाली प्रदेश", en: "Karnali Province" },
  },
  sudurpaschim: {
    short: { ne: "सुदूरपश्चिम", en: "Sudurpaschim" },
    full: { ne: "सुदूरपश्चिम प्रदेश", en: "Sudurpaschim Province" },
  },
};

/** Each commission's own site, for empty states. Only verified official hosts. */
export const commissionSites: Record<ProvinceCode, string> = {
  federal: "https://psc.gov.np/",
  koshi: "https://psc.koshi.gov.np/",
  madhesh: "https://ppsc.madhesh.gov.np/",
  bagmati: "https://spsc.bagamati.gov.np/",
  gandaki: "https://ppsc.gandaki.gov.np/",
  lumbini: "https://ppsc.lumbini.gov.np/",
  karnali: "https://ppsc.karnali.gov.np/",
  sudurpaschim: "https://psc.sudurpashchim.gov.np/",
};

export const groupNames: Record<GroupCode, Text> = {
  agri_extension: { ne: "कृषि प्रसार", en: "Agriculture Extension" },
  agronomy: { ne: "बाली विज्ञान", en: "Agronomy" },
  horticulture: { ne: "बागवानी", en: "Horticulture" },
  plant_protection: { ne: "वनस्पति संरक्षण", en: "Plant Protection" },
  crop_protection: { ne: "बाली संरक्षण", en: "Crop Protection" },
  soil_science: { ne: "माटो विज्ञान", en: "Soil Science" },
  agri_economics_marketing: { ne: "कृषि अर्थशास्त्र तथा बजार", en: "Agri Economics and Marketing" },
  agriculture: { ne: "कृषि (सामान्य)", en: "Agriculture (general)" },
  veterinary: { ne: "भेटेरिनरी", en: "Veterinary" },
  livestock: { ne: "पशु विकास", en: "Livestock" },
  livestock_poultry_dairy: {
    ne: "पशुपन्छी तथा डेरी विकास",
    en: "Livestock, Poultry and Dairy Development",
  },
  fisheries: { ne: "मत्स्य", en: "Fisheries" },
  food_nutrition_quality_control: {
    ne: "खाद्य, पोषण तथा गुण नियन्त्रण",
    en: "Food, Nutrition and Quality Control",
  },
};
