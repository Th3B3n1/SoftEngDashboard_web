import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getRarityInfo, getLevelColor, hexAlpha, mixHex, GRADE_DOT_COLOR } from '../format';
import { rules } from '../engine/engine';
import { levelForXp } from '../engine/levels';
import { GRADE_KEYS, type Level, type Reward } from '../engine/types';

export function LevelsPage() {
  const { model: m } = useDashboard();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [showEarlier, setShowEarlier] = useState(false);
  const [showLater, setShowLater] = useState(false);

  const levelNum = m.level.level;
  const allLevels = m.levels || rules.levels;
  const totalLevels = allLevels.length || 22;
  const maxReachableLevel = m.level.maxReachableLevel ?? levelForXp(allLevels, m.xp.maxReachable);

  const curLevelData = allLevels[levelNum - 1];
  const rarityPct = m.level.rarityPct ?? curLevelData?.rarityPct ?? 0;
  const rarityInfo = getRarityInfo(rarityPct, lang, 'rare');
  const curColor = getLevelColor(levelNum, totalLevels);

  // Build level timeline items matching reference app
  const levelItems = useMemo(() => {
    let cumXp = 0;
    let cumExam = 0;
    let cumImsc = 0;

    return allLevels.map((lvl: Level, idx: number) => {
      const n = idx + 1;
      const rewards: Reward[] = lvl.rewards || lvl.levelRewards || [];
      const examUnlock = rewards
        .filter((r) => r.type === 'exam_point')
        .reduce((s, r) => s + (r.amount ?? 0), 0);
      const imscUnlock = rewards
        .filter((r) => r.type === 'imsc_point')
        .reduce((s, r) => s + (r.amount ?? 0), 0);
      const propGrade = rewards.find((r) => r.type === 'proposed_grade');

      cumXp += lvl.xpToLevelUp;
      cumExam += examUnlock;
      cumImsc += imscUnlock;

      const hasRarity = lvl.rarityPct != null && lvl.rarityPct > 0;
      const rarity = hasRarity ? getRarityInfo(lvl.rarityPct, lang, 'common') : null;

      return {
        level: n,
        color: getLevelColor(n, totalLevels).solid,
        rarity,
        rarityPct: lvl.rarityPct ?? 0,
        xpToLevelUp: lvl.xpToLevelUp,
        examUnlock,
        imscUnlock,
        proposedGradeTier: propGrade?.grade ? propGrade.grade - 1 : null,
        cumXp,
        cumExam,
        cumImsc,
        unreachable: n > maxReachableLevel,
      };
    });
  }, [allLevels, lang, maxReachableLevel, totalLevels]);

  // Default 5-level window centered on levelNum (levelNum - 2 .. levelNum + 2)
  const half = 2;
  let winStart = levelNum - half;
  let winEnd = levelNum + half;
  if (winStart < 1) {
    winEnd += 1 - winStart;
    winStart = 1;
  }
  if (winEnd > totalLevels) {
    winStart -= winEnd - totalLevels;
    winEnd = totalLevels;
  }
  winStart = Math.max(1, winStart);
  winEnd = Math.min(totalLevels, winEnd);

  const visibleStart = showEarlier ? 1 : winStart;
  const visibleEnd = showLater ? totalLevels : winEnd;
  const visibleLevels = levelItems.filter((item) => item.level >= visibleStart && item.level <= visibleEnd);

  const gradeNames = [
    t('failGrade'),
    t('passGrade'),
    t('satisfactoryGrade'),
    t('goodGrade'),
    t('excellentGrade'),
  ];

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

      {/* 2-Column Layout matching reference Course Dashboard_per.html */}
      <div className="levels-two-col-layout">
        {/* LEFT COLUMN: Performance Summary + Point Carryover */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'flex-start' }}>
          {/* Top Performance Card */}
          <div
            className="dashboard-card"
            style={{
              height: 'auto',
              padding: '22px 22px 20px',
              background: mixHex(curColor.solid, '#25262b', 0.93),
              border: `1px solid ${mixHex(curColor.solid, '#25262b', 0.72)}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: curColor.gradient,
                    boxShadow: `0 4px 10px ${curColor.shadow}`,
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
                    Level
                  </span>
                  <span style={{ fontSize: '35px', fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
                    {levelNum}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {t('levelNumText', { level: levelNum })}
                  </span>
                  {levelNum < totalLevels && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t('xpToLevel', { xp: m.level.remaining, level: levelNum + 1 })}
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: rarityInfo.color,
                  boxShadow: `0 4px 10px ${hexAlpha(rarityInfo.color, 0.35)}`,
                  textAlign: 'center',
                  padding: '3px',
                }}
              >
                <span style={{ fontSize: '8.5px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, marginBottom: '3px' }}>
                  {t('levelRarity')}
                </span>
                <span style={{ fontSize: '14.7px', fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
                  {rarityInfo.label}
                </span>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('xpProgress')}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {m.level.currentXp} / {m.level.needed} XP
                </span>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: 'rgb(55, 58, 64)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '5px',
                    background: curColor.barGradient,
                    width: `${Math.min(100, Math.max(0, m.level.percent))}%`,
                  }}
                />
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-dimmed)', marginTop: '6px' }}>
                {t('xpEarnedThisSemester', { xp: m.xp.tracked })}
              </p>
            </div>

            <div style={{ height: '1px', background: 'rgb(55, 58, 64)', marginBottom: '14px' }} />

            {/* Rewards */}
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
                {t('rewardsEarnedThisSemester')}
              </p>
              <div className="rewards-grid">
                <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '8px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {t('midtermAndBonusPoints')}
                  </p>
                  <p style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: 700, marginTop: '2px' }}>
                    {m.points.exam}
                  </p>
                </div>
                <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '8px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {t('imscPoints')}
                  </p>
                  <p style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: 700, marginTop: '2px' }}>
                    {m.points.imsc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Point Carryover Card */}
          <div className="dashboard-card" style={{ height: 'auto', padding: '20px 22px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              {t('pointCarryover')}
            </p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
              {t('pointCarryoverDesc')}
            </p>

            <div className="rewards-grid">
              <div
                style={{
                  background: 'var(--bg-card-subtle)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-main)', marginBottom: '8px' }}>
                  {t('thisSemesterEarned')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('pointsLabel')}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {m.points.exam}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('imscPointsLabel')}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {m.points.imsc}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgb(26, 27, 30)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {t('nextSemesterCarried')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('pointsLabel')}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {m.points.carried}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('imscPointsLabel')}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                      0
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: All Levels Timeline */}
        <div className="dashboard-card" style={{ padding: '20px 22px', alignSelf: 'stretch' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            {t('levelLadder')}
          </p>

          {visibleStart > 1 && (
            <button
              type="button"
              onClick={() => setShowEarlier(true)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#1c7ed6',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0 10px',
              }}
            >
              {t('showEarlierLevels')}
            </button>
          )}

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visibleLevels.map((item, idx) => {
              const isReached = item.level <= levelNum;
              const nextItem = visibleLevels[idx + 1];
              const isLast = idx === visibleLevels.length - 1;
              const lineIsReached = nextItem ? nextItem.level <= levelNum : false;
              const lineIsUnreachable = item.unreachable || Boolean(nextItem?.unreachable);

              const bulletBorderColor = item.unreachable
                ? '#e03131'
                : isReached
                ? item.color
                : 'rgb(55, 58, 64)';

              const lineColor = lineIsUnreachable
                ? '#e03131'
                : lineIsReached
                ? item.color
                : 'rgb(55, 58, 64)';

              return (
                <div
                  key={item.level}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '14px',
                  }}
                >
                  {/* Left Timeline Bullet & Connecting Line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '14px', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: `2px solid ${bulletBorderColor}`,
                        background: isReached && !item.unreachable ? '#ffffff' : 'rgb(37, 38, 43)',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        marginTop: '3px',
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          flex: 1,
                          width: 0,
                          borderLeft: `2px ${lineIsUnreachable ? 'dashed' : 'solid'} ${lineColor}`,
                          marginTop: '2px',
                          marginBottom: '-3px',
                        }}
                      />
                    )}
                  </div>

                  {/* Right Timeline Content */}
                  <div style={{ flex: 1, paddingBottom: isLast ? '4px' : '18px', minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: item.unreachable ? '#e03131' : 'var(--text-main)',
                        marginBottom: '6px',
                        lineHeight: 1.3,
                      }}
                    >
                      {t('levelNumText', { level: item.level })}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {item.unreachable && (
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#e03131',
                            background: hexAlpha('#e03131', 0.1),
                            padding: '3px 9px',
                            borderRadius: '10px',
                            width: 'fit-content',
                          }}
                        >
                          {t('levelUnreachable')}
                        </span>
                      )}

                      {/* XP & Rarity Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {item.xpToLevelUp > 0 && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              background: 'var(--bg-card-subtle)',
                              padding: '3px 9px',
                              borderRadius: '10px',
                            }}
                          >
                            {t('xpToLevelUpPill', { xp: item.xpToLevelUp })}
                          </span>
                        )}
                        {item.rarity && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: item.rarity.color,
                              background: item.rarity.bg,
                              padding: '3px 9px',
                              borderRadius: '10px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.rarity.label}
                          </span>
                        )}
                      </div>

                      {/* Rewards Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {item.examUnlock > 0 && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#1c7ed6',
                              background: '#e7f5ff',
                              padding: '3px 9px',
                              borderRadius: '10px',
                            }}
                          >
                            {t('examReward', { amount: item.examUnlock })}
                          </span>
                        )}
                        {item.imscUnlock > 0 && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#9c36b5',
                              background: '#f8f0fc',
                              padding: '3px 9px',
                              borderRadius: '10px',
                            }}
                          >
                            {t('imscReward', { amount: item.imscUnlock })}
                          </span>
                        )}
                        {item.proposedGradeTier !== null && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: GRADE_DOT_COLOR[GRADE_KEYS[item.proposedGradeTier]] ?? '#2f9e44',
                              color: '#ffffff',
                              borderRadius: '999px',
                              padding: '3px 9px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ fontSize: '9.5px' }}>★</span>
                            <span>
                              {t('offeredGrade')}: {gradeNames[item.proposedGradeTier]}
                            </span>
                          </span>
                        )}
                        {item.examUnlock === 0 && item.imscUnlock === 0 && item.proposedGradeTier === null && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontStyle: 'italic',
                              color: 'var(--text-dimmed)',
                            }}
                          >
                            {t('noReward')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleEnd < totalLevels && (
            <button
              type="button"
              onClick={() => setShowLater(true)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#1c7ed6',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 0 4px',
              }}
            >
              {t('showLaterLevels')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

