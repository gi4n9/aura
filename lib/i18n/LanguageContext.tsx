"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "aura_learning_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem(STORAGE_KEY) as Language;
    if (savedLang && (savedLang === "vi" || savedLang === "en")) {
      setLanguageState(savedLang);
    } else {
      const browserLang = navigator.language.startsWith("vi") ? "vi" : "en";
      setLanguageState(browserLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
      document.cookie = `aura_lang=${lang}; path=/; max-age=31536000`;
    }
  };

function getNestedValue(obj: any, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === "object") {
      if (key in current) {
        current = current[key];
      } else {
        // Case-insensitive lookup fallback
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(current).find((k) => k.toLowerCase() === lowerKey);
        if (foundKey) {
          current = current[foundKey];
        } else {
          return undefined;
        }
      }
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

  // Helper to resolve nested keys like "nav.courses"
  const t = (keyPath: string, fallback?: string): string => {
    if (!keyPath) return fallback || "";
    const activeLang = (language === "en" || language === "vi") ? language : "vi";
    const keys = keyPath.split(".");
    
    // 1. Try active language
    let result = getNestedValue(translations[activeLang], keys);
    
    // 2. Fallback to Vietnamese dictionary
    if (result === undefined && activeLang !== "vi") {
      result = getNestedValue(translations.vi, keys);
    }
    
    // 3. Fallback to English dictionary
    if (result === undefined && activeLang !== "en") {
      result = getNestedValue(translations.en, keys);
    }

    return result !== undefined ? result : fallback || keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return graceful default if used outside provider
    return {
      language: "vi" as Language,
      setLanguage: () => {},
      t: (keyPath: string, fallback?: string) => fallback || keyPath,
    };
  }
  return context;
}
