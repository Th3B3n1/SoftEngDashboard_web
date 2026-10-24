import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { RARITY_INFO, RARITY_INFO_EN, getRarityTier } from '../format';
import { rules } from '../engine/engine';

export function LevelsPage() {
  const { model: m } = useDashboard();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [showEarlierLevels, setShowEarlierLevels] = useState(false);

  const levelNum = m.level.level;
  const rarityTier = getRarityTier(m.level.rarityPct);
  const rarityDict = lang === 'en' ? RARITY_INFO_EN : RARITY_INFO;
  const rarityInfo = rarityDict[rarityTier] || rarityDict.rare;

  const allLevels = m.levels || rules.levels;

  return (
    <div className="page-shell-stack">
      {/* Back button */}
      <div>
        <button
          type="button"
          className="back-link"
          onClick={() => navigate('/')}
        >
          {t('backToOverview')}
        </button>
      </div>

      {/* Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 className="page-title">{t('levelsTitle')}</h1>
        <div className="page-subtitle-row">
          <p className="page-subtitle">
            {t('lastUpdatedMoodle')}: {m.moodleLastUpdated || t('live')} · {t('lastUpdatedHf')}: {m.hfLastUpdated || t('notSynced')}
          </p>
          <div className="help-icon-bubble" title={t('refreshInfo')}>?</div>
        </div>
      </div>

      {/* Top Performance Card */}
      <div className="dashboard-card performance-card">
        <div className="level-rarity-row">
          <div className="level-badge-container">
            <div className="bubble-circle bubble-level">
              <span className="bubble-label-small">Level</span>
              <span className="bubble-value-level">{levelNum}</span>
            </div>
            <div className="level-text-info">
              <span className="level-name">{t('levelNumText', { level: levelNum })}</span>
              <span className="level-xp-needed">
                {t('xpToLevel', { xp: m.level.remaining, level: levelNum + 1 })}
              </span>
            </div>
          </div>

          <div className="bubble-circle bubble-rarity" style={{ background: rarityInfo.color }}>
            <span className="bubble-label-small">{t('levelRarity')}</span>
            <span className="bubble-value-rarity">{rarityInfo.label}</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('xpProgress')}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {m.level.currentXp} / {m.level.needed} XP
            </span>
          </div>
          <div className="xp-progress-bar-bg">
            <div
              className="xp-progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, m.level.percent))}%` }}
            />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {t('xpEarnedThisSemester', { xp: m.xp.tracked })}
          </span>
        </div>

        {/* Rewards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--text-dimmed)',
              textTransform: 'uppercase',
            }}
          >
            {t('rewardsEarnedThisSemester')}
          </span>
          <div className="rewards-grid">
            <div className="reward-mini-card">
              <span className="reward-mini-label">{t('midtermAndBonusPoints')}</span>
              <span className="reward-mini-value">{m.points.exam}</span>
            </div>
            <div className="reward-mini-card">
              <span className="reward-mini-label">{t('imscPoints')}</span>
              <span className="reward-mini-value">{m.points.imsc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Point Carryover Card */}
      <div className="dashboard-card">
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
          {t('pointCarryover')}
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
          {t('pointCarryoverDesc')}
        </p>

        <div className="rewards-grid">
          <div
            style={{
              background: 'var(--bg-card-subtle)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              {t('thisSemesterEarned')}
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('pointsLabel')}</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                {m.points.exam}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('imscPointsLabel')}</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                {m.points.imsc}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card-subtle)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              {t('nextSemesterCarried')}
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('pointsLabel')}</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                {m.points.carried}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('imscPointsLabel')}</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                {m.points.imsc}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Level Ladder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            {t('levelLadder')}
          </h2>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setShowEarlierLevels((v) => !v)}
          >
            {showEarlierLevels ? t('hideEarlierLevels') : t('showEarlierLevels')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allLevels.map((lvlData: any, idx: number) => {
            const currentIdx = idx + 1;
            const isUnlocked = currentIdx <= levelNum;
            const isCurrent = currentIdx === levelNum;

            if (!showEarlierLevels && currentIdx < Math.max(1, levelNum - 1)) {
              return null;
            }

            const rarity = getRarityTier(lvlData.rarityPct);
            const rInfo = rarityDict[rarity] || rarityDict.common;
            const rewards = (lvlData.levelRewards || []).map((r: any) =>
              r.type === 'exam_point'
                ? t('examPointsBadge', { amount: r.amount })
                : r.type === 'imsc_point'
                ? t('imscPointsBadge', { amount: r.amount })
                : t('offeredGrade')
            ).join(', ');

            return (
              <div
                key={currentIdx}
                className="level-ladder-row"
                style={{
                  background: isCurrent ? 'var(--bg-card-perf)' : 'var(--bg-card)',
                  border: isCurrent
                    ? '1.5px solid rgb(77, 99, 201)'
                    : '1px solid var(--border-card)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isUnlocked
                        ? 'linear-gradient(135deg, rgb(128, 165, 247), rgb(71, 102, 203))'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: isUnlocked ? '#ffffff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {currentIdx}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {t('levelNumText', { level: currentIdx })} {isCurrent && <span style={{ color: 'rgb(77, 99, 201)', fontSize: '12px' }}>{t('currentLevelTag')}</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t('requirement', { xp: lvlData.xpToLevelUp })}
                    </span>
                  </div>
                </div>

                <div className="level-ladder-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {rewards && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-body)',
                      }}
                    >
                      {rewards}
                    </span>
                  )}
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: rInfo.bg,
                      color: rInfo.color,
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {rInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
