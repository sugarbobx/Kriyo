import { useEffect, useState } from 'react';
import { api } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';

// Stable, locale-independent ids -- dict.education.modules is translated
// text with no machine key of its own, so this array (same order/length as
// the modules array in both locales) is what the backend actually stores.
const MODULE_KEYS = ['loss_aversion', 'fomo', 'revenge_trading', 'process_over_outcome', 'routine_recovery'];

export default function Education({ onBack }: { onBack: () => void }) {
  const { dict } = useLanguage();
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.education
      .progress()
      .then((res) => setReadKeys(new Set(res.read_module_keys)))
      .catch(() => {});
  }, []);

  async function markRead(moduleKey: string) {
    setReadKeys((current) => new Set(current).add(moduleKey));
    try {
      await api.education.markRead(moduleKey);
    } catch {
      setReadKeys((current) => {
        const next = new Set(current);
        next.delete(moduleKey);
        return next;
      });
    }
  }

  return (
    <AppShell title={dict.education.title} subtitle={dict.education.subtitle}>
      <div className="kriyo-palier">
        <p className="kriyo-palier-eyebrow">V1</p>
        <p className="kriyo-palier-title">{dict.education.heroTitle}</p>
        <p className="kriyo-palier-note">{dict.education.heroDescription}</p>
      </div>

      <div className="kriyo-stack">
        {dict.education.pillars.map((pillar) => (
          <div key={pillar.title} className="kriyo-palier">
            <p className="kriyo-palier-eyebrow">{pillar.badge}</p>
            <p className="kriyo-palier-title">{pillar.title}</p>
            <p className="kriyo-palier-note">{pillar.text}</p>
          </div>
        ))}
      </div>

      <div className="kriyo-palier" style={{ borderColor: 'rgba(232,163,61,0.3)' }}>
        <p className="kriyo-palier-eyebrow" style={{ color: 'var(--kriyo-amber)' }}>
          {dict.education.programTitle}
        </p>
        <p className="kriyo-palier-note">{dict.education.programIntro}</p>
      </div>

      <div className="kriyo-stack">
        {dict.education.modules.map((module, index) => {
          const moduleKey = MODULE_KEYS[index];
          const isRead = readKeys.has(moduleKey);
          return (
            <div key={module.title} className="kriyo-palier">
              <p className="kriyo-palier-eyebrow">{`0${index + 1}`}</p>
              <p className="kriyo-palier-title">{module.title}</p>
              <p className="kriyo-palier-note">{module.summary}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0.6rem 0 0', display: 'grid', gap: '0.4rem' }}>
                {module.tips.map((tip) => (
                  <li
                    key={tip}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      fontSize: '0.78rem',
                      color: 'var(--kriyo-dim)',
                      border: '1px solid var(--kriyo-border-soft)',
                      borderRadius: '0.75rem',
                      padding: '0.5rem 0.7rem'
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--kriyo-cyan)', marginTop: '0.35rem', flexShrink: 0 }} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="kriyo-btn kriyo-btn--secondary"
                style={{ marginTop: '0.6rem' }}
                disabled={isRead}
                data-active={isRead}
                onClick={() => markRead(moduleKey)}
              >
                {isRead ? dict.education.alreadyRead : dict.education.markRead}
              </button>
            </div>
          );
        })}
      </div>

      <div className="kriyo-palier">
        <p className="kriyo-palier-title">{dict.education.glossaryTitle}</p>
        <div className="kriyo-stack" style={{ marginTop: '0.6rem' }}>
          {dict.education.glossary.map(([term, definition]) => (
            <div key={term}>
              <p style={{ margin: 0, fontWeight: 500 }}>{term}</p>
              <p className="kriyo-dim" style={{ margin: '0.15rem 0 0' }}>
                {definition}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        {dict.common.back}
      </button>
    </AppShell>
  );
}
