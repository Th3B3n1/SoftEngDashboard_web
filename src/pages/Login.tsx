import { useState } from 'react';
import {
  MANAGE_TOKEN_URL,
  createLaunchUrl,
  parseRedirect,
  setToken,
} from '../moodle/auth';
import { callWs } from '../moodle/client';
import { GraduationCap, ExternalLink, AlertCircle, Loader2, Info, ClipboardPaste } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { HeaderActions } from '../components/HeaderActions';

export function LoginPage() {
  const { t } = useLanguage();
  const [pasted, setPasted] = useState('');
  const [errorManual, setErrorManual] = useState<string | null>(null);
  const [busyManual, setBusyManual] = useState(false);

  const handleLaunchSso = () => {
    setErrorManual(null);
    const url = createLaunchUrl();
    window.open(url, '_blank', 'noopener');
  };

  const loginWithRawInput = async (rawInput: string) => {
    setBusyManual(true);
    setErrorManual(null);
    try {
      const token = parseRedirect(rawInput);
      await callWs(token, 'core_webservice_get_site_info');
      setToken(token);
      window.location.reload();
    } catch (err) {
      setErrorManual(err instanceof Error ? err.message : String(err));
      setBusyManual(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!pasted.trim()) return;
    await loginWithRawInput(pasted);
  };

  const handlePasteFromClipboard = async () => {
    setErrorManual(null);
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error('A böngésző nem engedélyezi a vágólap közvetlen olvasását. Illeszd be kézzel a szövegmezőbe!');
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        throw new Error('A vágólap üres.');
      }
      setPasted(clipText);
      await loginWithRawInput(clipText);
    } catch (err) {
      setErrorManual(err instanceof Error ? err.message : String(err));
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

        {/* Manual Token Card */}
        <div className="card" style={{ padding: '24px' }}>
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
                placeholder="32 karakteres token vagy https://token=..."
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleManualSubmit}
                disabled={busyManual || !pasted.trim()}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
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

              <button
                type="button"
                className="btn-secondary"
                onClick={handlePasteFromClipboard}
                disabled={busyManual}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <ClipboardPaste size={16} />
                <span>{t('ssoPasteClipboardBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
