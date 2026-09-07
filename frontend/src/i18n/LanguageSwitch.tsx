import { useLanguage } from './context';

export function LanguageSwitch() {
  const { locale, toggleLocale, dict } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={dict.common.languageLabel}
      className="kriyo-badge"
      style={{ cursor: 'pointer', fontFamily: 'inherit', border: '1px solid var(--kriyo-border-soft)' }}
    >
      <span style={{ color: locale === 'fr' ? 'var(--kriyo-cyan)' : undefined }}>FR</span>
      <span style={{ margin: '0 0.3em' }}>/</span>
      <span style={{ color: locale === 'en' ? 'var(--kriyo-cyan)' : undefined }}>EN</span>
    </button>
  );
}
