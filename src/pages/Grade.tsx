import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { GRADE_DOT_COLOR } from '../format';
import { rules } from '../engine/engine';
import { forecast, proposedGrade, cumXp } from '../engine/levels';

export function GradePage() {
  const { model: m } = useDashboard();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const levelNum = m.level.level;
  const maxLevel = m.levels?.length || rules.levels.length || 22;

  // Selected level in slider (default: levelNum + 1 or levelNum)
  const [selectedLevel, setSelectedLevel] = useState<number>(Math.min(maxLevel, levelNum < maxLevel ? levelNum + 1 : levelNum));

  const gradeInfo = m.gradeInfo || rules.gradeInfo;
  const maxMidtermPoints = 100 - (gradeInfo.pointsCollectableOnTheExam || 70);

  // XP needed to reach selectedLevel
  const totalNeededXp = cumXp(rules.levels, selectedLevel);
  const xpNeeded = Math.max(0, totalNeededXp - m.xp.tracked);

  // Compute forecast columns
  const curForecast = forecast(rules, levelNum);
  const selForecast = forecast(rules, selectedLevel);
  const maxForecast = forecast(rules, maxLevel);

  const curProposed = proposedGrade(rules.levels, levelNum);
  const selProposed = proposedGrade(rules.levels, selectedLevel);
  const maxProposed = proposedGrade(rules.levels, maxLevel);

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
    offered: number | null
  ) => {
    if (reqIdx === 0) {
      return '< 50%';
    }
    // If offered grade exists for this level (e.g. grade 5 offered at level 22)
    if (offered && offered === 5) {
      if (reqIdx === 4) {
        return (
          <span className="grade-pill-offered">
            ✦ {t('offeredGrade')}
          </span>
        );
      }
      return <span style={{ color: 'var(--text-dimmed)' }}>{t('notReachable')}</span>;
    }

    const item = fc[reqIdx];
    if (!item || !item.reachable || item.neededPct == null) {
      return <span style={{ color: 'var(--text-dimmed)' }}>{t('notReachable')}</span>;
    }
    return `${item.neededPct}%`;
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

      {/* Main 2-column Grid Layout (matching original exactly) */}
      <div className="grade-outlook-grid">
        {/* LEFT COLUMN: Summary Card */}
        <div className="dashboard-card" style={{ padding: '24px' }}>
          {/* Centered Level Bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '22px' }}>
            <div className="bubble-circle bubble-level" style={{ width: '70px', height: '70px' }}>
              <span className="bubble-label-small">LEVEL</span>
              <span className="bubble-value-level" style={{ fontSize: '26px' }}>{levelNum}</span>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
              {t('levelNumText', { level: levelNum })}
            </span>
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Row 1 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
              }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)', maxWidth: '200px' }}>
                {t('collectedPoints')}
              </span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
                {m.points.exam}
              </span>
            </div>

            {/* Row 2 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('midtermPoints')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t('midtermSub')}
                </div>
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                {m.points.midterm} / {maxMidtermPoints}
              </span>
            </div>

            {/* Row 3 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('bonusPoints')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t('bonusSub')}
                </div>
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                {m.points.bonus} / {maxMidtermPoints}
              </span>
            </div>

            {/* Row 4 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('maxExamPoints')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t('maxExamSub')}
                </div>
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                {gradeInfo.pointsCollectableOnTheExam}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Level Comparison & Forecast Table */}
        <div className="dashboard-card" style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '17.5px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {t('compareWithLevel')}
            </h2>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'rgb(77, 99, 201)' }}>
              {t('levelNumText', { level: selectedLevel })}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
            {t('dragSlider')}
          </p>

          {xpNeeded > 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-blue)', fontWeight: 600, marginBottom: '16px' }}>
              {t('xpNeededForLevel', { xp: xpNeeded })}
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-green)', fontWeight: 600, marginBottom: '16px' }}>
              {t('levelAlreadyCompleted')}
            </p>
          )}

          {/* Range Slider */}
          <div style={{ marginBottom: '24px', padding: '0 2px' }}>
            <input
              type="range"
              min={1}
              max={maxLevel}
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                accentColor: 'rgb(28, 126, 214)',
                cursor: 'pointer',
              }}
            />
            {/* Markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span>Level 1</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {lang === 'hu' ? `Jelenleg: Level ${levelNum}` : `Current: Level ${levelNum}`}
              </span>
              <span>Level {maxLevel}</span>
            </div>
          </div>

          {/* Comparison Table */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div className="table-scroll-wrapper">
              <div className="grade-table-4col">
                {/* Table Header */}
                <div className="grade-table-header" style={{ marginBottom: '12px' }}>
                  <span className="grade-header-col-title">
                    {t('colFinalGrade')}
                  </span>
                  <div className="grade-header-col">
                    <div className="mini-level-bubble current">{levelNum}</div>
                    <span className="grade-col-subtext">{t('colCurrent')}</span>
                  </div>
                  <div className="grade-header-col">
                    <div className="mini-level-bubble next">{selectedLevel}</div>
                    <span className="grade-col-subtext highlight">{t('colSelected')}</span>
                  </div>
                  <div className="grade-header-col">
                    <div className="mini-level-bubble max">{maxLevel}</div>
                    <span className="grade-col-subtext" style={{ color: 'rgb(174, 62, 201)' }}>{t('colMax')}</span>
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
                        {getCellContent(r.index, curForecast, curProposed)}
                      </span>
                      <span className="grade-val-col highlight">
                        {getCellContent(r.index, selForecast, selProposed)}
                      </span>
                      <span className="grade-val-col">
                        {getCellContent(r.index, maxForecast, maxProposed)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
