import React, { createContext, useContext, useState } from 'react';
import { tr } from '../locales/tr';
import { en } from '../locales/en';

export type Language = 'tr' | 'en';

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('velox_language');
  if (saved === 'tr' || saved === 'en') return saved;
  const winLang = navigator.language || '';
  if (winLang.toLowerCase().includes('tr')) {
    return 'tr';
  }
  return 'en';
};

export const translations = {
  tr,
  en
};

interface I18nContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.tr) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('velox_language', newLang);
  };

  const t = (key: keyof typeof translations.tr): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return React.createElement(I18nContext.Provider, { value: { lang, setLanguage, t } }, children);
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if not wrapped in provider (to avoid breaking tests or isolated components)
    const [lang, setLangState] = useState<Language>(getInitialLanguage);
    const setLanguage = (newLang: Language) => {
      setLangState(newLang);
      localStorage.setItem('velox_language', newLang);
    };
    const t = (key: keyof typeof translations.tr): string => {
      return translations[lang][key] || translations['en'][key] || key;
    };
    return { t, lang, setLanguage };
  }
  return context;
};
