"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type LanguageOption } from "@/lib/i18n/languages";
import { TRANSLATIONS, type Translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "o2plus:patient:language";
const FIRST_SEEN_KEY = "o2plus:patient:language_configured";

export interface LanguageContextValue {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: keyof Translations, fallback?: string) => string;
  bilingual: (enText: string, key: keyof Translations, separator?: string) => string;
  bilingualNode: (enText: string, key: keyof Translations, className?: string) => ReactNode;
  isRTL: boolean;
  languages: LanguageOption[];
  currentLanguage: LanguageOption;
  showLanguageModal: boolean;
  setShowLanguageModal: (show: boolean) => void;
  isFirstVisit: boolean;
  markLanguageConfigured: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem(STORAGE_KEY);
      const configured = window.localStorage.getItem(FIRST_SEEN_KEY);

      if (storedLang && TRANSLATIONS[storedLang]) {
        setLanguageState(storedLang);
      }

      if (!configured && !storedLang) {
        setIsFirstVisit(true);
        setShowLanguageModal(true);
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, []);

  const setLanguage = (code: string) => {
    if (!TRANSLATIONS[code]) return;
    setLanguageState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
      window.localStorage.setItem(FIRST_SEEN_KEY, "true");
    } catch {
      // Storage unavailable
    }
    setIsFirstVisit(false);
  };

  const markLanguageConfigured = () => {
    try {
      window.localStorage.setItem(FIRST_SEEN_KEY, "true");
    } catch {
      // Storage unavailable
    }
    setIsFirstVisit(false);
    setShowLanguageModal(false);
  };

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0]!;

  const isRTL = currentLanguage.direction === "rtl";

  const t = (key: keyof Translations, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const defaultDict = TRANSLATIONS[DEFAULT_LANGUAGE];
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback ?? key;
  };

  const bilingual = (enText: string, key: keyof Translations, separator = " · "): string => {
    if (language === "en") return enText;
    const translated = t(key);
    if (!translated || translated === enText) return enText;
    return `${enText}${separator}${translated}`;
  };

  const bilingualNode = (enText: string, key: keyof Translations, className?: string): ReactNode => {
    if (language === "en") return <>{enText}</>;
    const translated = t(key);
    if (!translated || translated === enText) return <>{enText}</>;
    return (
      <>
        {enText} <span className={className}>{translated}</span>
      </>
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        bilingual,
        bilingualNode,
        isRTL,
        languages: SUPPORTED_LANGUAGES,
        currentLanguage,
        showLanguageModal,
        setShowLanguageModal,
        isFirstVisit,
        markLanguageConfigured,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback safe context if rendered outside provider
    const defaultLang = SUPPORTED_LANGUAGES[0]!;
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key: keyof Translations, fallback?: string) => TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ?? fallback ?? key,
      bilingual: (enText: string) => enText,
      bilingualNode: (enText: string) => <>{enText}</>,
      isRTL: false,
      languages: SUPPORTED_LANGUAGES,
      currentLanguage: defaultLang,
      showLanguageModal: false,
      setShowLanguageModal: () => {},
      isFirstVisit: false,
      markLanguageConfigured: () => {},
    };
  }
  return context;
}
