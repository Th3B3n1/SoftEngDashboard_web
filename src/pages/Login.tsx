import { useState, useEffect } from 'react';
import {
  MANAGE_TOKEN_URL,
  createLaunchUrl,
  parseRedirect,
  setToken,
  ensureProtectedToken,
  consumeUrlSsoToken,
  isProtocolHandlerSupported,
  registerSsoProtocolHandler,
} from '../moodle/auth';
import { setHfToken } from '../moodle/hfClient';
import { GraduationCap, ExternalLink, AlertCircle, Loader2, Info, ShieldCheck, ClipboardPaste } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { HeaderActions } from '../components/HeaderActions';
import { BACKEND_URL } from '../config';

export function LoginPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'direct' | 'sso' | 'manual'>('direct');

  // SSO state
  const [protocolPromptShown, setProtocolPromptShown] = useState(false);
  const [errorSso, setErrorSso] = useState<string | null>(null);
  const [busyClipboard, setBusyClipboard] = useState(false);

  // Direct backend login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busyDirect, setBusyDirect] = useState(false);
  const [errorDirect, setErrorDirect] = useState<string | null>(null);

  // Manual token / link paste state
  const [pasted, setPasted] = useState('');
  const [errorManual, setErrorManual] = useState<string | null>(null);
  const [busyManual, setBusyManual] = useState(false);

  const supportsProtocolHandler = isProtocolHandlerSupported();

  // Auto-detect token in URL query params or from secondary SSO tab via BroadcastChannel / storage
  useEffect(() => {
    const token = consumeUrlSsoToken();
    if (token) {
      window.location.reload();
      return;
    }

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('softeng_auth');
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'SSO_TOKEN' && ev.data?.token) {
            setToken(ev.data.token);
            window.location.reload();
          }
        };
      }
    } catch {
      // ignore BroadcastChannel errors
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'moodle.token' && ev.newValue) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      bc?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleEnableProtocolHandler = () => {
    setErrorSso(null);
    const ok = registerSsoProtocolHandler();
    if (ok) {
      setProtocolPromptShown(true);
    }
  };

  const handleLaunchSso = () => {
    setErrorSso(null);
    const url = createLaunchUrl();
    window.open(url, '_blank', 'noopener');
  };

  const handlePasteFromClipboard = async () => {
    setErrorSso(null);
    setBusyClipboard(true);
    try {
      if (!navigator.clipboard?.readText) {
        setActiveTab('manual');
        setBusyClipboard(false);
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        throw new Error('A vágólap üres. Másold ki a linket a Moodle oldalról, vagy használd a Kézi token fület!');
      }
      const token = parseRedirect(clipText);
      await ensureProtectedToken(token);
      window.location.reload();
    } catch (err) {
      setErrorSso(err instanceof Error ? err.message : String(err));
      setBusyClipboard(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setBusyDirect(true);
    setErrorDirect(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `Szerverhiba (${res.status})`;
        try {
          const json = JSON.parse(text);
          if (json.error || json.message) {
            message = json.error || json.message;
          }
        } catch {
          if (res.status === 400 || res.status === 401) {
            message = 'Érvénytelen felhasználónév vagy jelszó.';
          } else if (res.status === 429) {
            message = 'Túl sok próbálkozás. Kérjük, várj 1 percet!';
          } else if (res.status === 503 || res.status === 504) {
            message = `A backend szerver nem válaszolt időben (HTTP ${res.status}). Próbáld újra pár másodperc múlva.`;
          } else if (res.status === 404) {
            message = `A bejelentkezési végpont nem található (HTTP 404). Ellenőrizd a backend URL-t.`;
          } else if (text.trim()) {
            message = `Szerverhiba (${res.status}): ${text.slice(0, 100)}`;
          }
        }
        throw new Error(message);
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('A szerver válasza nem érvényes JSON formátumú.');
      }

      if (!data.token) {
        throw new Error('Nem érkezett érvényes token a szervertől.');
      }

      setToken(data.token);
      if (data.ltik) {
        setHfToken(data.ltik);
      }
      window.location.reload();
    } catch (err) {
      setErrorDirect(err instanceof Error ? err.message : String(err));
      setBusyDirect(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!pasted.trim()) return;
    setBusyManual(true);
    setErrorManual(null);

    try {
      const token = parseRedirect(pasted);
      await ensureProtectedToken(token);
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
          {/* 3-Tab Navigation (Direct first) */}
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
              className={`login-tab-btn ${activeTab === 'sso' ? 'active' : ''}`}
              onClick={() => setActiveTab('sso')}
            >
              {t('tabSso')}
            </button>
            <button
              type="button"
              className={`login-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              {t('tabManual')}
            </button>
          </div>

          {/* TAB 1: EduID SSO Redirect Flow */}
          {activeTab === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13.5px', color: 'var(--text-body)', lineHeight: 1.5, margin: 0 }}>
                {t('ssoIntro')}
              </p>

              {supportsProtocolHandler && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleEnableProtocolHandler}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>{t('ssoEnableRedirectBtn')}</span>
                  </button>
                  {protocolPromptShown && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'rgb(81, 207, 102)',
                        background: 'rgba(47, 158, 68, 0.12)',
                        border: '1px solid rgba(47, 158, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        lineHeight: 1.4,
                      }}
                    >
                      {t('ssoRedirectRegisteredMsg')}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn-primary"
                onClick={handleLaunchSso}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  fontSize: '14px',
                }}
              >
                <span>{supportsProtocolHandler ? t('ssoLaunchBtn') : t('ssoLaunchBtnMobile')}</span>
                <ExternalLink size={16} />
              </button>

              {/* Fallback 1-click clipboard login for Brave / mobile */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '14px',
                  marginTop: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                  {t('ssoFallbackHint')}
                </p>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePasteFromClipboard}
                  disabled={busyClipboard}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {busyClipboard ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>{t('loggingIn')}</span>
                    </>
                  ) : (
                    <>
                      <ClipboardPaste size={16} />
                      <span>{t('ssoPasteClipboardBtn')}</span>
                    </>
                  )}
                </button>
              </div>

              {errorSso && (
                <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>{errorSso}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Direct Backend EduID Login Form */}
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
                    style={{ maxWidth: '320px', flex: '1 1 320px', minWidth: 0 }}
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
                  <span style={{ fontSize: '15px', color: 'var(--text-body)', fontWeight: 500, userSelect: 'none', flexShrink: 0 }}>
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
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>{errorDirect}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busyDirect || !username.trim() || !password}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
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

          {/* TAB 3: Manual Token Paste */}
          {activeTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13.5px', color: 'var(--text-body)', lineHeight: 1.5, margin: 0 }}>
                {t('manualNotice')}
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={MANAGE_TOKEN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <span>{t('manageTokensBtn')}</span>
                  <ExternalLink size={14} />
                </a>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleLaunchSso}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Moodle SSO</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="manual-token">
                  {t('pasteLabel')}
                </label>
                <textarea
                  id="manual-token"
                  rows={3}
                  className="form-textarea"
                  placeholder="32 karakteres token vagy web+softengbme://token=..."
                  value={pasted}
                  onChange={(e) => {
                    setPasted(e.target.value);
                    setErrorManual(null);
                  }}
                />
              </div>

              {errorManual && (
                <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>{errorManual}</div>
                </div>
              )}

              <button
                type="button"
                className="btn-primary"
                onClick={handleManualSubmit}
                disabled={busyManual || !pasted.trim()}
                style={{ width: '100%' }}
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
