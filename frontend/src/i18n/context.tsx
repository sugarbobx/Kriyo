import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_KEY, type Dictionary, type Locale, getDictionary, isLocale } from './translations';

interface LanguageContextValue {
  locale: Locale;
  dict: Dictionary;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readInitialLocale);

  const toggleLocale = useCallback(() => {
    setLocale((current) => {
      const next = current === 'fr' ? 'en' : 'fr';
      localStorage.setItem(LOCALE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({ locale, dict: getDictionary(locale), toggleLocale }), [locale, toggleLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
