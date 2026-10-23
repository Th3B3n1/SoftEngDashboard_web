import { useState, useEffect } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getHfToken, setHfToken, fetchHfStatus, parseHfJson } from '../moodle/hfClient';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    if (initial === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return { theme, toggleTheme };
}

export function LangToggleBtn() {
  const { lang, toggleLang, t } = useLanguage();
  return (
    <button
      type="button"
      className="action-icon-btn lang-btn"
      aria-label={t('langToggle')}
      title={t('langToggle')}
      onClick={toggleLang}
    >
      <span>🌐</span>
      <span className="lang-code-text">{lang.toUpperCase()}</span>
    </button>
  );
}

export function ThemeToggleBtn() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className="action-icon-btn"
      aria-label={t('themeToggle')}
      title={t('themeToggle')}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? '☀' : '🌙'}
    </button>
  );
}

function AuthenticatedActions() {
  const { logout, refresh, updateHfStatus } = useDashboard();
  const { t } = useLanguage();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState(getHfToken() || '');
  const [tokenSavedMsg, setTokenSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveToken = async () => {
    const raw = tokenInput.trim();
    if (!raw) {
      setHfToken('');
      updateHfStatus(null);
      setTokenSavedMsg('HF Portál szinkronizáció törölve.');
      setTimeout(() => {
        setTokenSavedMsg('');
        setShowTokenModal(false);
        refresh();
      }, 1000);
      return;
    }

    setSaving(true);
    setTokenSavedMsg('Szinkronizálás folyamatban…');

    // 1. Direct JSON support (e.g. pasted from /api/course-instances/... tab)
    const jsonParsed = parseHfJson(raw);
    if (jsonParsed) {
      updateHfStatus(jsonParsed);
      setSaving(false);
      setTokenSavedMsg('✓ Házi feladat adatok (JSON) sikeresen betöltve!');
      setTimeout(() => {
        setTokenSavedMsg('');
        setShowTokenModal(false);
      }, 1200);
      return;
    }

    // 2. Token or URL support
    setHfToken(raw);
    try {
      const hf = await fetchHfStatus(raw);
      if (hf) {
        updateHfStatus(hf);
        setTokenSavedMsg('✓ HF Portál sikeresen szinkronizálva!');
      } else {
        setTokenSavedMsg('A token elmentve, de az élő kapcsolat sikertelen. Kérlek ellenőrizd a tokent vagy illeszd be a JSON adatot.');
      }
    } catch {
      setTokenSavedMsg('A token elmentve.');
    } finally {
      setSaving(false);
      setTimeout(() => {
        setTokenSavedMsg('');
        setShowTokenModal(false);
        refresh();
      }, 1400);
    }
  };

  return (
    <>
      <div className="header-actions no-print">
        <button
          type="button"
          className="action-icon-btn"
          aria-label={t('hwPortalToken')}
          title={t('hwPortalToken')}
          onClick={() => setShowTokenModal(true)}
        >
          🔑
        </button>
        <LangToggleBtn />
        <ThemeToggleBtn />
        <button
          type="button"
          className="action-icon-btn"
          aria-label={t('logout')}
          title={t('logout')}
          onClick={logout}
        >
          🚪
        </button>
      </div>

      {/* LTI Token Modal */}
      {showTokenModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowTokenModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{t('ltiTitle')}</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
              {t('ltiHelp')}
            </p>
            <textarea
              className="input-field"
              rows={4}
              placeholder="https://softeng-hw.ftsrg.org/?ltik=eyJ... vagy nyers JSON válasz"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              style={{ marginBottom: '14px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
            />
            {tokenSavedMsg && (
              <div style={{ color: tokenSavedMsg.includes('hiba') || tokenSavedMsg.includes('sikertelen') ? 'var(--color-yellow)' : 'var(--color-green)', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>
                {tokenSavedMsg}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setShowTokenModal(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={handleSaveToken}
              >
                {saving ? t('syncing') : t('saveAndSync')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function HeaderActions({ mode = 'default' }: { mode?: 'default' | 'login' }) {
  if (mode === 'login') {
    return (
      <div className="header-actions login-header-actions no-print">
        <LangToggleBtn />
        <ThemeToggleBtn />
      </div>
    );
  }
  return <AuthenticatedActions />;
}
