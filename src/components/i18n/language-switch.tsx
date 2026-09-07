"use client";

import { useLanguage } from '@/lib/i18n/context';

export function LanguageSwitch() {
  const { locale, toggleLocale, dict } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={dict.common.languageLabel}
      className="flex items-center gap-1 rounded-full border border-kriyo-borderSoft bg-kriyo-elevated px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-kriyo-dim transition hover:border-kriyo-cyan/40 hover:text-kriyo-text"
    >
      <span className={locale === 'fr' ? 'text-kriyo-cyan' : ''}>FR</span>
      <span className="text-kriyo-borderSoft">/</span>
      <span className={locale === 'en' ? 'text-kriyo-cyan' : ''}>EN</span>
    </button>
  );
}
