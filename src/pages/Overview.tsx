import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTaskInfo, RARITY_INFO, RARITY_INFO_EN, getRarityTier } from '../format';
import { rules } from '../engine/engine';
import { forecast, proposedGrade } from '../engine/levels';

export function OverviewPage() {
  const { model: m } = useDashboard();
  const { lang, t, formatDate, formatRelDays } = useLanguage();
  const navigate = useNavigate();

  // Signature data
  const labs = m.labs.labs;
  const passedLabsCount = m.labs.passedCount;
  const totalLabsCount = labs.length || 7;

  // Homework phases
  const hwPhases = m.homeAssignment?.phases
    ? Object.entries(m.homeAssignment.phases)
    : [];

  const passedHwCount = hwPhases.filter(([, p]: any) => p.result === 'completed').length;
  const totalHwCount = hwPhases.length;

  // Tokens
  const tokensTotal = m.labs.tokensTotal || 2;
  const tokensLeft = m.labs.tokensLeft ?? 1;

  // Upcoming items for signature (next upcoming lab + next upcoming homework phase)
  const nextLab = labs.find((l) => l.result === 'upcoming');
  const nextHwPhase = hwPhases.map(([, p]: any) => p).find((p: any) => p.result === 'upcoming');

  const upcomingSignatureItems: { title: string; due: string }[] = [];
  if (nextLab && nextLab.original.date) {
    upcomingSignatureItems.push({
      title: `LAB${nextLab.n}: ${nextLab.title}`,
      due: new Date(nextLab.original.date).toISOString(),
    });
  }
  if (nextHwPhase && nextHwPhase.dueDate) {
    upcomingSignatureItems.push({
      title: nextHwPhase.name,
      due: nextHwPhase.dueDate,
    });
  }
  upcomingSignatureItems.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  // Performance / Level
  const levelNum = m.level.level;
  const rarityTier = getRarityTier(m.level.rarityPct);
  const rarityInfo = (lang === 'en' ? RARITY_INFO_EN : RARITY_INFO)[rarityTier] || RARITY_INFO.rare;

  // Available tasks (top 4 uncompleted and fulfillable tasks that are currently active)
  const availableToCompleteTasks = m.tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'missed' && t.isCurrent)
    .sort((a, b) => (a.dueAt || Infinity) - (b.dueAt || Infinity));

  const availableTasks = availableToCompleteTasks.slice(0, 4).map((t) => {
    const isHw = t.group === 'homeAssignment';
    const isLab = t.group === 'labs';
    const isRecap = t.group === 'recapQuizzes';
    const typeLetter = isHw ? 'P' : isLab ? 'L' : isRecap ? 'E' : 'Q';
    const typeClass = isHw ? 'task-type-p' : isLab ? 'task-type-l' : 'task-type-q';
    const category = isHw
      ? lang === 'en' ? 'Homework' : 'Házi feladat'
      : isLab
      ? lang === 'en' ? 'Labs' : 'Laborok'
      : isRecap
      ? lang === 'en' ? 'Recap quiz' : 'Ellenőrző kvíz'
      : lang === 'en' ? 'Lecture quiz' : 'Előadás kvíz';
    const dueStr = Array.isArray(t.due) ? t.due[1] : t.due;
    return {
      key: t.key,
      typeLetter,
      typeClass,
      category,
      xp: t.xp,
      due: dueStr,
    };
  });
  const remainingTasksCount = Math.max(0, availableToCompleteTasks.length - availableTasks.length);

  // Grade Outlook Calculations (synchronized with Grade page)
  const maxLevel = rules.levels.length || 22;
  const nextLevelNum = Math.min(maxLevel, levelNum + 1);
  const curForecast = forecast(rules, levelNum);
  const nextForecast = forecast(rules, nextLevelNum);
  const curProposed = proposedGrade(rules.levels, levelNum);
  const nextProposed = proposedGrade(rules.levels, nextLevelNum);

  const getCellContent = (
    reqIdx: number,
    fc: ReturnType<typeof forecast>,
    offered: number | null
  ) => {
    if (reqIdx === 0) {
      return '< 50%';
    }
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

  const gradeRows = [
    { name: `1 (${t('failGrade')})`, dotColor: 'rgb(224, 49, 49)', cur: getCellContent(0, curForecast, curProposed), next: getCellContent(0, nextForecast, nextProposed) },
    { name: `2 (${t('passGrade')})`, dotColor: 'rgb(253, 126, 20)', cur: getCellContent(1, curForecast, curProposed), next: getCellContent(1, nextForecast, nextProposed) },
    { name: `3 (${t('satisfactoryGrade')})`, dotColor: 'rgb(252, 196, 25)', cur: getCellContent(2, curForecast, curProposed), next: getCellContent(2, nextForecast, nextProposed) },
    { name: `4 (${t('goodGrade')})`, dotColor: 'rgb(32, 201, 151)', cur: getCellContent(3, curForecast, curProposed), next: getCellContent(3, nextForecast, nextProposed) },
    { name: `5 (${t('excellentGrade')})`, dotColor: 'rgb(81, 207, 102)', cur: getCellContent(4, curForecast, curProposed), next: getCellContent(4, nextForecast, nextProposed) },
  ];



  return (
    <div className="page-shell-stack">
      {/* Page Title & Last Updated */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 className="page-title">{t('dashboardTitle')}</h1>
        <div className="page-subtitle-row">
          <p className="page-subtitle">
            {t('lastUpdatedMoodle')}: {m.moodleLastUpdated || t('live')} · {t('lastUpdatedHf')}: {m.hfLastUpdated || t('notSynced')}
          </p>
          <div className="help-icon-bubble" title={t('help')}>?</div>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="overview-grid">
        {/* CARD 1: Aláírás */}
        <div className="dashboard-card">
          <div className="card-header-row">
            <h2 className="card-title">{t('signatureCardTitle')}</h2>
            <button
              type="button"
              className="nav-arrow-btn"
              title={t('signatureCardTitle')}
              onClick={() => navigate('/signature')}
            >
              ↗
            </button>
          </div>

          {/* Status Row */}
          <div className="status-bar">
            <span className="status-label">{t('status')}</span>
            <div className="status-value-pill">
              <span
                className="status-dot"
                style={{
                  background:
                    m.labs.signature === 'failed'
                      ? 'rgb(122, 31, 31)'
                      : m.labs.signature === 'at_risk'
                      ? 'var(--color-red)'
                      : 'var(--color-green)',
                }}
              />
              <span
                style={{
                  color:
                    m.labs.signature === 'failed' || m.labs.signature === 'at_risk'
                      ? 'var(--color-red)'
                      : 'var(--color-green)',
                }}
              >
                {m.labs.signature === 'failed'
                  ? t('failed')
                  : m.labs.signature === 'at_risk'
                  ? t('atRisk')
                  : t('onTrack')}
              </span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="progress-section">
            {/* Labs Bar */}
            <div className="segmented-group">
              <div className="segmented-header">
                <span className="segmented-title">{t('labs')}</span>
                <span className="segmented-count">{passedLabsCount}/{totalLabsCount} {t('completed')}</span>
              </div>
              <div className="segmented-bar">
                {labs.map((l) => {
                  let bg = 'rgb(134, 142, 150)';
                  if (l.result === 'completed') bg = 'rgb(47, 158, 68)';
                  else if (l.result === 'at_risk') bg = 'rgb(224, 49, 49)';
                  else if (l.result === 'failed') bg = 'rgb(122, 31, 31)';
                  return (
                    <div
                      key={l.n}
                      className="bar-segment"
                      title={`LAB${l.n}: ${l.title || ''}`}
                      style={{ background: bg }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Homework Bar */}
            <div className="segmented-group">
              <div className="segmented-header">
                <span className="segmented-title">{t('homeAssignment')}</span>
                <span className="segmented-count">{passedHwCount}/{totalHwCount} {t('completed')}</span>
              </div>
              <div className="segmented-bar">
                {hwPhases.map(([key, p]: any) => {
                  let bg = 'rgb(134, 142, 150)';
                  if (p.result === 'completed') bg = 'rgb(47, 158, 68)';
                  else if (p.result === 'at_risk') bg = 'rgb(224, 49, 49)';
                  else if (p.result === 'failed') bg = 'rgb(122, 31, 31)';
                  return (
                    <div
                      key={key}
                      className="bar-segment"
                      title={key}
                      style={{ background: bg }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="legend-row">
            <div className="legend-item">
              <span style={{ color: 'rgb(47, 158, 68)' }}>●</span>
              <span>{t('statusCompleted')}</span>
            </div>
            <div className="legend-item">
              <span style={{ color: 'rgb(134, 142, 150)' }}>●</span>
              <span>{t('upcoming')}</span>
            </div>
            <div className="legend-item">
              <span style={{ color: 'rgb(224, 49, 49)' }}>●</span>
              <span>{t('atRisk')}</span>
            </div>
            <div className="legend-item">
              <span style={{ color: 'rgb(122, 31, 31)' }}>●</span>
              <span>{t('failed')}</span>
            </div>
          </div>

          {/* Retake Tokens */}
          <div className="token-section">
            <div className="token-header">
              <span className="segmented-title">{t('retakeTokens')}</span>
              <span className="segmented-count">{tokensLeft} {t('left')}</span>
            </div>
            <div className="token-list">
              {Array.from({ length: tokensTotal }).map((_, idx) => {
                const isAvail = idx < tokensLeft;
                return (
                  <div
                    key={idx}
                    className={`token-circle ${isAvail ? 'available' : 'used'}`}
                    title={isAvail ? (lang === 'hu' ? 'Elérhető token' : 'Available token') : (lang === 'hu' ? 'Felhasznált token' : 'Used token')}
                  >
                    {isAvail ? '●' : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Items (Next 2 Weeks) */}
          <div className="upcoming-section">
            <span className="upcoming-header">{t('upcomingTwoWeeks')}</span>
            {upcomingSignatureItems.map((item, idx) => (
              <div key={idx} className="upcoming-item">
                <span className="upcoming-dot" />
                <span className="upcoming-title">{item.title}</span>
                <span className="upcoming-due">
                  {t('due')}: {formatDate(item.due)} ({formatRelDays(item.due)})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 2: Féléves teljesítmény */}
        <div className="dashboard-card performance-card">
          <div className="card-header-row">
            <h2 className="card-title">{t('performanceCardTitle')}</h2>
            <button
              type="button"
              className="nav-arrow-btn"
              title={t('performanceCardTitle')}
              onClick={() => navigate('/levels')}
            >
              ↗
            </button>
          </div>

          {/* Level & Rarity Bubbles */}
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

          {/* XP Progress */}
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
              {t('rewardsEarned')}
            </span>
            <div className="rewards-grid">
              <div className="reward-mini-card">
                <span className="reward-mini-label">{t('examPoints')}</span>
                <span className="reward-mini-value">{m.points.exam}</span>
              </div>
              <div className="reward-mini-card">
                <span className="reward-mini-label">{t('imscPoints')}</span>
                <span className="reward-mini-value">{m.points.imsc}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Elérhető feladatok */}
        <div className="dashboard-card">
          <div className="card-header-row">
            <h2 className="card-title">{t('availableTasksCardTitle')}</h2>
            <button
              type="button"
              className="nav-arrow-btn"
              title={t('availableTasksCardTitle')}
              onClick={() => navigate('/tasks')}
            >
              ↗
            </button>
          </div>

          {/* Task Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableTasks.map((tItem) => {
              const info = getTaskInfo(tItem.key, tItem.category, lang);
              return (
                <div key={tItem.key} className="task-row-item">
                  <div className={`task-type-square ${tItem.typeClass}`}>
                    {tItem.typeLetter}
                  </div>
                  <div className="task-info-mid">
                    <span className="task-title-text" title={info.title}>
                      {info.title}
                    </span>
                    <span className="task-category-text">{tItem.category}</span>
                  </div>
                  <div className="task-right-col">
                    <span className="task-xp-pill">+{tItem.xp} XP</span>
                    <div className="task-due-bullet-row">
                      <span className="task-due-bullet" />
                      <span className="task-due-text">
                        {t('due')}: {formatDate(tItem.due)} ({formatRelDays(tItem.due)})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="more-tasks-btn"
            onClick={() => navigate('/tasks')}
          >
            {t('moreTasks', { count: remainingTasksCount })}
          </button>
        </div>

        {/* CARD 4: Jegy előrejelzés */}
        <div className="dashboard-card">
          <div className="card-header-row">
            <h2 className="card-title">{t('gradeOutlookCardTitle')}</h2>
            <button
              type="button"
              className="nav-arrow-btn"
              title={t('gradeOutlookCardTitle')}
              onClick={() => navigate('/grade')}
            >
              ↗
            </button>
          </div>

          {/* Collected Points Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '18px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-body)' }}>
              {t('collectedPoints')}
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
              {m.points.exam}
            </span>
          </div>

          {/* Grade Table (3 columns, scrollable on narrow mobile) */}
          <div className="table-scroll-wrapper">
            <div className="grade-table-3col">
              {/* Grade Table Header */}
              <div className="grade-table-header">
                <span className="grade-header-col-title">{t('finalGradeExam')}</span>
                <div className="grade-header-col">
                  <div className="mini-level-bubble current">{levelNum}</div>
                  <span className="grade-col-subtext">{t('now')}</span>
                </div>
                <div className="grade-header-col">
                  <div className="mini-level-bubble next">{nextLevelNum}</div>
                  <span className="grade-col-subtext highlight">{t('levelUp')}</span>
                </div>
              </div>

              {/* Grade Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {gradeRows.map((r, idx) => (
                  <div key={idx} className="grade-row">
                    <div className="grade-row-name-col">
                      <span className="grade-dot" style={{ background: r.dotColor }} />
                      <span className="grade-name-text">{r.name}</span>
                    </div>
                    <span className="grade-val-col">{r.cur}</span>
                    <span className="grade-val-col highlight">{r.next}</span>
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
