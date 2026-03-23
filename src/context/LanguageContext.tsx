"use client";

import { createContext, useContext, useEffect, useState } from "react";
import en, { type TranslationKey } from "@/locales/en";
import ar from "@/locales/ar";

export type Language = "en" | "ar";

interface LanguageContextValue {
  lang: Language;
  dir: "ltr" | "rtl";
  t: (key: TranslationKey | string) => string;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  dir: "ltr",
  t: (k) => String(k),
  toggleLang: () => {},
});

function applyLang(lang: Language) {
  const html = document.documentElement;
  html.setAttribute("lang", lang);
  html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const stored = (localStorage.getItem("td-lang") as Language | null) ?? "en";
    setLang(stored);
    applyLang(stored);
  }, []);

  const toggleLang = () => {
    setLang((prev) => {
      const next: Language = prev === "en" ? "ar" : "en";
      localStorage.setItem("td-lang", next);
      applyLang(next);
      return next;
    });
  };

  const t = (key: TranslationKey | string): string => {
    if (lang === "ar") {
      return ar[key] ?? (en as Record<string, string>)[key] ?? String(key);
    }
    return (en as Record<string, string>)[key] ?? String(key);
  };

  return (
    <LanguageContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
