export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  direction?: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", script: "Latin" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", script: "Bengali" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", script: "Telugu" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", script: "Devanagari" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", script: "Gujarati" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", script: "Malayalam" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", script: "Gurmukhi" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", script: "Odia" },
  { code: "ur", name: "Urdu", nativeName: "اردو", script: "Arabic", direction: "rtl" },
];

export const DEFAULT_LANGUAGE = "en";
