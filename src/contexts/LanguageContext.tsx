import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { translations, type Language } from '../i18n/translations';
import { fmtDate, fmtDateTime, fmtLabDate, relDays } from '../format';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: keyof typeof translations.hu, params?: Record<string, string | number>) => string;
  formatDate: (ms: number | string | Date) => string;
  formatDateTime: (ms: number | string | Date) => string;
  formatLabDate: (ms: number | string | Date) => string;
  formatRelDays: (target: number | string | Date, now?: number) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('softdev_lang');
      return saved === 'en' ? 'en' : 'hu';
    } catch {
      return 'hu';
    }
  });

  const setLang = useCallback((newLang: Language) => {
    try {
      localStorage.setItem('softdev_lang', newLang);
    } catch {
      // ignore
    }
    setLangState(newLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'hu' ? 'en' : 'hu');
  }, [lang, setLang]);

  const t = useCallback(
    (key: keyof typeof translations.hu, params?: Record<string, string | number>): string => {
      const dict = translations[lang] || translations.hu;
      let text: string = (dict as Record<string, string>)[key] || (translations.hu as Record<string, string>)[key] || String(key);
      if (params) {
        for (const [pKey, pVal] of Object.entries(params)) {
          text = text.replaceAll(`{${pKey}}`, String(pVal));
        }
      }
      return text;
    },
    [lang]
  );

  const formatDate = useCallback((ms: number | string | Date) => fmtDate(ms, lang), [lang]);
  const formatDateTime = useCallback((ms: number | string | Date) => fmtDateTime(ms, lang), [lang]);
  const formatLabDate = useCallback((ms: number | string | Date) => fmtLabDate(ms, lang), [lang]);
  const formatRelDays = useCallback(
    (target: number | string | Date, now = Date.now()) => relDays(target, now, lang),
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      formatDate,
      formatDateTime,
      formatLabDate,
      formatRelDays,
    }),
    [lang, setLang, toggleLang, t, formatDate, formatDateTime, formatLabDate, formatRelDays]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
