import { useState, useEffect } from 'react';
import { MANAGE_TOKEN_URL, createLaunchUrl, parseRedirect, setToken } from '../moodle/auth';
import { GraduationCap, ExternalLink, AlertCircle, Loader2, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { HeaderActions } from '../components/HeaderActions';

export function LoginPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'direct' | 'manual'>('direct');

  // Direct backend login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busyDirect, setBusyDirect] = useState(false);
  const [errorDirect, setErrorDirect] = useState<string | null>(null);

  // Manual token / link paste state
  const [pasted, setPasted] = useState('');
  const [errorManual, setErrorManual] = useState<string | null>(null);
  const [busyManual, setBusyManual] = useState(false);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);

  // Auto-detect token in URL query params if redirected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
    const candidate = params.get('token') || params.get('url') || hashParams.get('token') || hashParams.get('url');

    if (candidate) {
      try {
        const token = parseRedirect(candidate);
        setToken(token);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      } catch {
        // Ignore non-matching parameters
      }
    }
  }, []);

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setBusyDirect(true);
    setErrorDirect(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'A bejelentkezés sikertelen volt.');
      }

      if (!data.token) {
        throw new Error('Nem érkezett érvényes token a szervertől.');
      }

      setToken(data.token);
      if (data.ltik) {
        localStorage.setItem('softeng.ltik', data.ltik);
      }
      window.location.reload();
    } catch (err) {
      setErrorDirect(err instanceof Error ? err.message : String(err));
      setBusyDirect(false);
    }
  };

  const handleManualSubmit = () => {
    if (!pasted.trim()) return;
    setBusyManual(true);
    setErrorManual(null);

    try {
      const token = parseRedirect(pasted);
      setToken(token);
      window.location.reload();
    } catch (err) {
      setErrorManual(err instanceof Error ? err.message : String(err));
      setBusyManual(false);
    }
  };

  return (
    <div className="login-page-container">
      <HeaderActions mode="login" />
      <div className="login-card-wrapper">

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="login-brand-icon">
            <GraduationCap size={30} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            {t('loginTitle')}
          </h1>
          <p style={{ fontSize: '0.88rem', marginTop: '6px', color: 'var(--text-muted)' }}>
            {t('loginSubtitle')}
          </p>
        </div>

        {/* VPN / Intranet notice */}
        <div
          style={{
            background: 'rgba(28, 126, 214, 0.08)',
            border: '1px solid rgba(28, 126, 214, 0.3)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <Info size={19} color="rgb(28, 126, 214)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12.5px', lineHeight: '1.45', color: 'var(--text-body)' }}>
            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
              {t('vpnWarningTitle')}
            </strong>
            {t('vpnWarningBody')}
          </div>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: '24px' }}>
          {/* Tabs Navigation */}
          <div className="login-tabs-header">
            <button
              type="button"
              className={`login-tab-btn ${activeTab === 'direct' ? 'active' : ''}`}
              onClick={() => setActiveTab('direct')}
            >
              {t('tabDirect')}
            </button>
            <button
              type="button"
              className={`login-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              {t('tabManual')}
            </button>
          </div>

          {/* Direct Login Form */}
          {activeTab === 'direct' && (
            <form onSubmit={handleDirectLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  {t('usernameLabel')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id="username"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    style={{ maxWidth: '320px', flex: '1 1 320px' }}
                    placeholder=""
                    required
                    value={username}
                    onKeyDown={(e) => {
                      if (
                        ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) ||
                        (e.ctrlKey || e.metaKey)
                      ) {
                        return;
                      }
                      if (!/^\d$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.currentTarget.value.replace(/\D/g, '');
                      setUsername(val);
                      setErrorDirect(null);
                    }}
                    autoComplete="username"
                  />
                  <span style={{ fontSize: '15px', color: 'var(--text-body)', fontWeight: 500, userSelect: 'none' }}>
                    @bme.hu
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  {t('passwordLabel')}
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder=""
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.currentTarget.value);
                    setErrorDirect(null);
                  }}
                  autoComplete="current-password"
                />
              </div>

              {errorDirect && (
                <div className="alert alert-danger">
                  <AlertCircle size={18} className="alert-icon" />
                  <div>{errorDirect}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busyDirect || !username.trim() || !password}
                  style={{ width: '100%' }}
                >
                  {busyDirect ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>{t('loggingIn')}</span>
                    </>
                  ) : (
                    <span>{t('loginBtn')}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Manual Token Paste */}
          {activeTab === 'manual' && (
            <div className="flex-col gap-4">
              <p className="text-sm text-secondary" style={{ lineHeight: 1.5 }}>
                {t('manualNotice')}
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={MANAGE_TOKEN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{t('manageTokensBtn')}</span>
                  <ExternalLink size={14} />
                </a>

                {launchUrl ? (
                  <a
                    href={launchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <span>SSO Megnyitása</span>
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn btn-subtle btn-sm"
                    onClick={() => setLaunchUrl(createLaunchUrl())}
                  >
                    SSO link generálása
                  </button>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="manual-token">
                  {t('pasteLabel')}
                </label>
                <textarea
                  id="manual-token"
                  rows={3}
                  className="form-textarea"
                  placeholder="32 karakteres token vagy moodlemobile://token=..."
                  value={pasted}
                  onChange={(e) => {
                    setPasted(e.target.value);
                    setErrorManual(null);
                  }}
                />
              </div>

              {errorManual && (
                <div className="alert alert-danger">
                  <AlertCircle size={18} className="alert-icon" />
                  <div>{errorManual}</div>
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleManualSubmit}
                disabled={busyManual || !pasted.trim()}
              >
                {busyManual ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>{t('loggingIn')}</span>
                  </>
                ) : (
                  <span>{t('saveTokenBtn')}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
