import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { GRADE_DOT_COLOR, getLevelColor, hexAlpha, mixHex } from '../format';
import { rules } from '../engine/engine';
import { forecast, proposedGrade, cumXp, levelForXp, nextRewardLevel } from '../engine/levels';

export function GradePage() {
  const { model: m } = useDashboard();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const levelNum = m.level.level;
  const levelsList = m.levels || rules.levels;
  const totalLevels = levelsList.length || 22;
  const maxLevel = m.level.maxReachableLevel ?? levelForXp(levelsList, m.xp.maxReachable);

  // Selected level in slider (default: next reward level, clamped to maxLevel)
  const [selectedLevel, setSelectedLevel] = useState<number>(() =>
    Math.min(maxLevel, nextRewardLevel(levelsList, levelNum))
  );
  const effectiveSelectedLevel = Math.min(selectedLevel, maxLevel);

  const curColor = getLevelColor(levelNum, totalLevels);
  const selColor = getLevelColor(effectiveSelectedLevel, totalLevels);
  const maxColor = getLevelColor(maxLevel, totalLevels);

  const gradeInfo = m.gradeInfo || rules.gradeInfo;
  const maxMidtermPoints = 100 - (gradeInfo.pointsCollectableOnTheExam || 70);

  // XP needed to reach effectiveSelectedLevel
  const totalNeededXp = cumXp(levelsList, effectiveSelectedLevel);
  const xpNeeded = Math.max(0, totalNeededXp - m.xp.tracked);

  // Compute forecast columns
  const curForecast = forecast(rules, levelNum);
  const selForecast = forecast(rules, effectiveSelectedLevel);
  const maxForecast = forecast(rules, maxLevel);

  const curProposed = proposedGrade(levelsList, levelNum);
  const selProposed = proposedGrade(levelsList, effectiveSelectedLevel);
  const maxProposed = proposedGrade(levelsList, maxLevel);

  const sliderMax = Math.max(1, maxLevel);
  const sliderPct = sliderMax > 1 ? ((effectiveSelectedLevel - 1) / (sliderMax - 1)) * 100 : 100;
  const curPct = sliderMax > 1 ? Math.min(100, ((levelNum - 1) / (sliderMax - 1)) * 100) : 0;

  const gradeDefs = [
    { name: t('failGrade'), dotColor: GRADE_DOT_COLOR.fail, index: 0 },
    { name: t('passGrade'), dotColor: GRADE_DOT_COLOR.pass, index: 1 },
    { name: t('satisfactoryGrade'), dotColor: GRADE_DOT_COLOR.satisfactory, index: 2 },
    { name: t('goodGrade'), dotColor: GRADE_DOT_COLOR.good, index: 3 },
    { name: t('excellentGrade'), dotColor: GRADE_DOT_COLOR.excellent, index: 4 },
  ];

  const getCellContent = (
    reqIdx: number,
    fc: ReturnType<typeof forecast>,
    offered: number | null,
    colTextColor: string,
    colSolidColor: string
  ) => {
    if (reqIdx === 0) {
      return <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>&lt; 50%</span>;
    }
    if (offered && offered - 1 === reqIdx) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: colSolidColor,
            color: '#ffffff',
            borderRadius: '999px',
            padding: '2px 10px',
            fontSize: '12.5px',
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          <span style={{ fontSize: '10px' }}>★</span>
          <span>{t('offeredGrade')}</span>
        </span>
      );
    }

    const item = fc[reqIdx];
    if (!item || !item.reachable || item.neededPct == null) {
      return <span style={{ color: 'var(--text-dimmed)', fontWeight: 600 }}>{t('notReachable')}</span>;
    }
    return <span style={{ color: colTextColor, fontWeight: 600 }}>{item.neededPct}%</span>;
  };

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
        <h1 className="page-title">{t('gradeTitle')}</h1>
        <div className="page-subtitle-row">
          <p className="page-subtitle">
            {t('lastUpdatedMoodle')}: {m.moodleLastUpdated || t('live')} · {t('lastUpdatedHf')}: {m.hfLastUpdated || t('notSynced')}
          </p>
          <div className="help-icon-bubble" title={t('help')}>?</div>
        </div>
      </div>

      {/* Main 2-column Grid Layout (matching original reference exactly) */}
      <div className="grade-outlook-grid">
        {/* LEFT COLUMN: Summary Card */}
        <div
          className="dashboard-card"
          style={{
            padding: '22px 22px 20px',
            background: mixHex(curColor.solid, '#25262b', 0.93),
            border: `1px solid ${mixHex(curColor.solid, '#25262b', 0.72)}`,
          }}
        >
          {/* Centered Level Bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: curColor.gradient,
                boxShadow: `0 4px 10px ${curColor.shadow}`,
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
                LEVEL
              </span>
              <span style={{ fontSize: '35px', fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
                {levelNum}
              </span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {t('levelNumText', { level: levelNum })}
            </span>
          </div>

          {/* Inner Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Box 1 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-card-subtle)',
                borderRadius: '10px',
                padding: '14px 16px',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>
                {t('collectedPoints')}
              </span>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', flexShrink: 0 }}>
                {m.points.exam}
              </span>
            </div>

            {/* Box 2 & 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {t('midtermPoints')}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {t('midtermSub')}
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', flexShrink: 0 }}>
                  {m.points.midterm} / {maxMidtermPoints}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {t('bonusPoints')}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {t('bonusSub')}
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', flexShrink: 0 }}>
                  {m.points.bonus} / {maxMidtermPoints}
                </span>
              </div>
            </div>

            {/* Box 4 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-card-subtle)',
                borderRadius: '10px',
                padding: '14px 16px',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('maxExamPoints')}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {t('maxExamSub')}
                </div>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', flexShrink: 0 }}>
                {gradeInfo.pointsCollectableOnTheExam}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Level Comparison & Forecast Table */}
        <div className="dashboard-card" style={{ padding: '22px 22px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('compareWithLevel')}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: selColor.solid }}>
              {t('levelNumText', { level: effectiveSelectedLevel })}
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.45 }}>
            {t('dragSlider')}
          </p>

          {effectiveSelectedLevel <= levelNum ? (
            <p style={{ fontSize: '14px', color: '#2f9e44', fontWeight: 700, marginBottom: '14px' }}>
              {t('levelAlreadyCompleted')}
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: selColor.solid, fontWeight: 700, marginBottom: '14px' }}>
              {t('xpNeededForLevel', { xp: xpNeeded })}
            </p>
          )}

          {/* Custom Range Slider with Current Level Badge on Track */}
          <div style={{ position: 'relative', padding: '0 2px', marginBottom: '8px' }}>
            <div style={{ height: '28px', display: 'flex', alignItems: 'center', position: 'relative' }}>
              {/* Background Track */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgb(55, 58, 64)',
                }}
              />
              {/* Filled Track */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  width: `${sliderPct}%`,
                  height: '6px',
                  borderRadius: '3px',
                  background: selColor.solid,
                }}
              />
              {/* Current Level Badge on Track */}
              <div
                title={`Level ${levelNum}`}
                style={{
                  position: 'absolute',
                  left: `${curPct}%`,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: curColor.gradient,
                  border: '2px solid #ffffff',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                  transform: 'translate(-50%, -50%)',
                  top: '50%',
                  zIndex: 2,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {levelNum}
              </div>
              <input
                type="range"
                min={1}
                max={sliderMax}
                step={1}
                value={effectiveSelectedLevel}
                onChange={(e) => setSelectedLevel(Math.min(maxLevel, Number(e.target.value)))}
                className="gd-slider"
                style={{
                  position: 'relative',
                  width: '100%',
                  zIndex: 3,
                  '--slider-thumb-border': selColor.solid,
                } as CSSProperties}
              />
            </div>
            {/* Markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-dimmed)' }}>
              <span>Level 1</span>
              <span>Level {maxLevel}</span>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgb(55, 58, 64)', margin: '14px 0 16px' }} />

          {/* Comparison Table */}
          <div className="table-scroll-wrapper">
            <div className="grade-table-4col">
              {/* Table Header */}
              <div className="grade-table-header" style={{ marginBottom: '8px' }}>
                <span className="grade-header-col-title">
                  {t('colFinalGrade')}
                </span>
                <div className="grade-header-col">
                  <div
                    className="mini-level-bubble"
                    style={{
                      background: curColor.gradient,
                      boxShadow: `0 4px 10px ${curColor.shadow}`,
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {levelNum}
                  </div>
                  <span className="grade-col-subtext">{t('colCurrent')}</span>
                </div>
                <div className="grade-header-col">
                  <div
                    className="mini-level-bubble"
                    style={{
                      background: hexAlpha(selColor.solid, 0.08),
                      border: `2px dashed ${selColor.solid}`,
                      color: selColor.solid,
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {effectiveSelectedLevel}
                  </div>
                  <span className="grade-col-subtext" style={{ color: selColor.solid }}>
                    {t('colSelected')}
                  </span>
                </div>
                <div className="grade-header-col">
                  <div
                    className="mini-level-bubble"
                    style={{
                      background: hexAlpha(maxColor.solid, 0.08),
                      border: `2px dashed ${maxColor.solid}`,
                      color: maxColor.solid,
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {maxLevel}
                  </div>
                  <span className="grade-col-subtext" style={{ color: maxColor.solid }}>
                    {t('colMax')}
                  </span>
                </div>
              </div>

              {/* Table Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {gradeDefs.map((r) => (
                  <div key={r.index} className="grade-row">
                    <div className="grade-row-name-col">
                      <span className="grade-dot" style={{ background: r.dotColor }} />
                      <span className="grade-name-text">{r.name}</span>
                    </div>
                    <span className="grade-val-col">
                      {getCellContent(r.index, curForecast, curProposed, 'var(--text-main)', curColor.solid)}
                    </span>
                    <span className="grade-val-col">
                      {getCellContent(r.index, selForecast, selProposed, selColor.solid, selColor.solid)}
                    </span>
                    <span className="grade-val-col">
                      {getCellContent(r.index, maxForecast, maxProposed, maxColor.solid, maxColor.solid)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

