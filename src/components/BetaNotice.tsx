import { useLanguage } from '../contexts/LanguageContext';

export function BetaNotice() {
  const { t } = useLanguage();
  return (
    <div className="beta-disclaimer">
      {t('betaNotice')}
    </div>
  );
}
