import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type Language } from '../i18n/translations';

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
      let text = (dict as any)[key] || (translations.hu as any)[key] || String(key);
      if (params) {
        for (const [pKey, pVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }
      }
      return text;
    },
    [lang]
  );

  const formatDate = useCallback(
    (ms: number | string | Date) => {
      const d = typeof ms === 'number' ? new Date(ms) : typeof ms === 'string' ? new Date(ms) : ms;
      return new Intl.DateTimeFormat(lang === 'hu' ? 'hu-HU' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(d);
    },
    [lang]
  );

  const formatDateTime = useCallback(
    (ms: number | string | Date) => {
      const d = typeof ms === 'number' ? new Date(ms) : typeof ms === 'string' ? new Date(ms) : ms;
      return new Intl.DateTimeFormat(lang === 'hu' ? 'hu-HU' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    },
    [lang]
  );

  const formatLabDate = useCallback(
    (ms: number | string | Date) => {
      const d = typeof ms === 'number' ? new Date(ms) : typeof ms === 'string' ? new Date(ms) : ms;
      return new Intl.DateTimeFormat(lang === 'hu' ? 'hu-HU' : 'en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    },
    [lang]
  );

  const formatRelDays = useCallback(
    (target: number | string | Date, now = Date.now()) => {
      const targetMs = typeof target === 'number' ? target : new Date(target).getTime();
      const d = Math.ceil((targetMs - now) / 86_400_000);
      if (lang === 'hu') {
        if (d < 0) return `${-d} napja lejárt`;
        if (d === 0) return 'ma';
        if (d === 1) return '1 nap múlva';
        return `${d} nap múlva`;
      } else {
        if (d < 0) return `${-d}d ago`;
        if (d === 0) return 'today';
        if (d === 1) return 'in 1 day';
        return `in ${d} days`;
      }
    },
    [lang]
  );

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        formatDate,
        formatDateTime,
        formatLabDate,
        formatRelDays,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
