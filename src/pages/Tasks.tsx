import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTaskInfo, getRarityInfo } from '../format';
import type { TaskModel } from '../engine/types';

interface GroupProgress {
  completedXp: number;
  currentXp: number;
  missedXp: number;
  totalXp: number;
}

export function TasksPage() {
  const { model: m } = useDashboard();
  const { lang, t, formatDate, formatRelDays } = useLanguage();
  const navigate = useNavigate();
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardKey: string) => {
    setCollapsedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  // Subgroup name translations
  const subgroupLabels: Record<string, string> = {
    overall: lang === 'en' ? 'OVERALL' : 'ÖSSZESEN',
    devProcessLabs: lang === 'en' ? 'DEVELOPMENT PROCESS LABS' : 'FEJLESZTÉSI GYAKORLATOK LABOROK',
    umlLabs: lang === 'en' ? 'UML LABS' : 'UML LABOROK',
    registration: lang === 'en' ? 'REGISTRATION' : 'REGISZTRÁCIÓ',
    onboarding: lang === 'en' ? 'ONBOARDING' : 'BETANÍTÁS (ONBOARDING)',
    coding: lang === 'en' ? 'CODING' : 'KÓDOLÁS',
    testing: lang === 'en' ? 'TESTING' : 'TESZTELÉS',
    review: lang === 'en' ? 'REVIEW' : 'REVIEW',
  };

  // Group tasks by category
  const categorizedTasks = useMemo(() => {
    const categories: Record<string, TaskModel[]> = {
      labs: [],
      homeAssignment: [],
      recapQuizzes: [],
      extraAssignments: [],
      misc: [],
    };

    for (const t of m.tasks) {
      if (categories[t.group]) {
        categories[t.group].push(t);
      } else {
        categories.misc.push(t);
      }
    }
    return categories;
  }, [m.tasks]);

  const calcProgress = (tasksList: TaskModel[]): GroupProgress => {
    let completedXp = 0;
    let currentXp = 0;
    let missedXp = 0;
    let totalXp = 0;

    for (const t of tasksList) {
      totalXp += t.xp;
      if (t.status === 'completed') {
        completedXp += t.xp;
      } else if (t.status === 'missed') {
        missedXp += t.xp;
      } else if (t.isCurrent) {
        currentXp += t.xp;
      }
    }

    return { completedXp, currentXp, missedXp, totalXp: totalXp || 1 };
  };

  // Overall progress across all 68 tasks (total: 885 XP)
  const overallProg = useMemo(() => {
    return calcProgress(m.tasks);
  }, [m.tasks]);

  // Section descriptions matching reference
  const sectionDescriptions: Record<string, string> = {
    labs: t('sectionLabs'),
    homeAssignment: t('sectionHomework'),
    recapQuizzes: t('sectionQuizzes'),
    extraAssignments: t('sectionExtra'),
    misc: t('sectionMisc'),
  };

  // Render 3-colored progress bar
  const renderMultiColorBar = (prog: GroupProgress, isLarge = false) => {
    const compW = Math.max(0, Math.min(100, (prog.completedXp / prog.totalXp) * 100));
    const currW = Math.max(0, Math.min(100 - compW, (prog.currentXp / prog.totalXp) * 100));
    const missW = Math.max(0, Math.min(100 - compW - currW, (prog.missedXp / prog.totalXp) * 100));

    return (
      <div>
        <div className={`multi-color-bar-container ${isLarge ? 'lg' : ''}`}>
          {compW > 0 && (
            <div style={{ width: `${compW}%`, height: '100%', background: 'rgb(47, 158, 68)' }} />
          )}
          {currW > 0 && (
            <div style={{ width: `${currW}%`, height: '100%', background: 'rgb(28, 126, 214)' }} />
          )}
          <div style={{ flex: 1 }} />
          {missW > 0 && (
            <div style={{ width: `${missW}%`, height: '100%', background: 'rgb(224, 49, 49)' }} />
          )}
        </div>
        <div className="multi-color-bar-labels">
          <span style={{ color: 'rgb(47, 158, 68)' }}>
            {t('xpCompleted', { completed: prog.completedXp, total: prog.totalXp })}
          </span>
          <span style={{ color: 'rgb(28, 126, 214)', textAlign: 'center' }}>
            {t('xpCurrent', { current: prog.currentXp, total: prog.totalXp })}
          </span>
          <span style={{ color: 'rgb(224, 49, 49)', textAlign: 'right' }}>
            {t('xpMissed', { missed: prog.missedXp, total: prog.totalXp })}
          </span>
        </div>
      </div>
    );
  };

  // Render task item row
  const renderTaskRow = (tItem: TaskModel) => {
    const isCompleted = tItem.status === 'completed';
    const isMissed = tItem.status === 'missed';
    const isCurrent = !!tItem.isCurrent;
    const info = getTaskInfo(tItem.key, tItem.group, lang);

    // Status dot color
    const dotColor = isCompleted
      ? 'rgb(47, 158, 68)'
      : isMissed
      ? 'rgb(224, 49, 49)'
      : isCurrent
      ? 'rgb(28, 126, 214)'
      : 'rgb(173, 181, 189)';

    // Status text label
    const statusLabel = isCompleted
      ? t('statusCompleted')
      : isMissed
      ? t('statusMissed')
      : isCurrent
      ? t('statusCurrent')
      : t('statusUpcoming');

    const dueLabel = tItem.dueAt > 0 ? `${t('due')}: ${formatDate(tItem.dueAt)} (${formatRelDays(tItem.dueAt)})` : null;

    // Rarity tier
    const rInfo = getRarityInfo(tItem.rarityPct, lang, 'common');

    return (
      <div key={tItem.key} className="task-row-official">
        {/* Left dot & title column */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
            <span
              className="task-row-title-text"
              title={info.title}
            >
              {info.title}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: dotColor }}>
              {statusLabel}
              {dueLabel && ` · ${dueLabel}`}
            </span>
          </div>
        </div>

        {/* Right badges column */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {tItem.rarityPct !== undefined && (
            <span
              className="task-rarity-pill"
              style={{
                background: rInfo.bg,
                color: rInfo.color,
              }}
            >
              {rInfo.label}
            </span>
          )}
          <span
            className="task-xp-pill-official"
            style={{
              color: isCompleted ? 'rgb(47, 158, 68)' : 'rgb(28, 126, 214)',
              background: isCompleted ? 'rgb(235, 251, 238)' : 'rgb(231, 245, 255)',
            }}
          >
            +{tItem.xp} XP
          </span>
        </div>
      </div>
    );
  };

  // Group tasks by subcategory
  const renderSubgroupedTasks = (tasksList: TaskModel[]) => {
    // If filtering by current only
    const filtered = showCurrentOnly
      ? tasksList.filter((t) => t.isCurrent)
      : tasksList;

    // Collect subgroups in order of appearance
    const subMap: Record<string, TaskModel[]> = {};
    for (const t of filtered) {
      const sub = t.sub || 'overall';
      if (!subMap[sub]) subMap[sub] = [];
      subMap[sub].push(t);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
        {Object.entries(subMap).map(([subKey, subTasks]) => (
          <div key={subKey}>
            <div className="task-subgroup-title">
              {subgroupLabels[subKey] || subKey.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {subTasks.map(renderTaskRow)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCard = (
    cardKey: string,
    title: string,
    description: string,
    tasksList: TaskModel[]
  ) => {
    const isCollapsed = collapsedCards[cardKey];
    const prog = calcProgress(tasksList);

    return (
      <div key={cardKey} className="card" style={{ marginBottom: '18px' }}>
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => toggleCard(cardKey)}
        >
          <span style={{ fontSize: '19px', fontWeight: 700, color: 'rgb(233, 236, 239)' }}>
            {title}
          </span>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgb(166, 167, 171)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {isCollapsed ? '+' : '–'}
          </button>
        </div>

        {/* Card Description */}
        {!isCollapsed && (
          <p style={{ fontSize: '12.5px', color: 'rgb(166, 167, 171)', margin: '8px 0 12px 0' }}>
            {description}
          </p>
        )}

        {/* Mini 3-color progress bar */}
        <div style={{ marginBottom: !isCollapsed ? '14px' : '0' }}>
          {renderMultiColorBar(prog, false)}
        </div>

        {/* Task rows */}
        {!isCollapsed && renderSubgroupedTasks(tasksList)}
      </div>
    );
  };

  // Level calculations
  const currentLvl = m.level.level ?? 1;
  const currentXp = m.level.currentXp ?? 0;
  const neededXp = m.level.needed ?? 16;
  const maxLvl = m.levels?.length || 22;
  const nextLvl = Math.min(maxLvl, currentLvl + 1);
  const pct = Math.max(0, Math.min(100, (currentXp / Math.max(1, neededXp)) * 100));

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

      {/* Title & Filter Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 className="page-title">{t('tasksTitle')}</h1>
          <div className="page-subtitle-row">
            <p className="page-subtitle">
              {t('lastUpdatedMoodle')}: {m.moodleLastUpdated || t('live')} · {t('lastUpdatedHf')}: {m.hfLastUpdated || t('notSynced')}
            </p>
            <div
              className="help-icon-bubble"
              title={t('taskHelp')}
            >
              ?
            </div>
          </div>
        </div>

        <button
          type="button"
          className="toggle-filter-btn"
          onClick={() => setShowCurrentOnly((v) => !v)}
        >
          <div className={`toggle-track ${showCurrentOnly ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
          <span className="toggle-label">{t('showCurrentTasksOnly')}</span>
        </button>
      </div>

      {/* Top Card: Összesített haladás */}
      <div className="card" style={{ padding: '22px 22px 20px' }}>
        <p style={{ fontSize: '19px', fontWeight: 700, color: 'rgb(233, 236, 239)', marginBottom: '14px' }}>
          {t('overallProgress')}
        </p>

        {/* 3-color overall progress bar */}
        {renderMultiColorBar(overallProg, true)}

        {/* Level Progression Row */}
        <div
          className="tasks-level-progression"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            marginTop: '20px',
            flexWrap: 'wrap',
          }}
        >
          {/* Current Level bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="level-bubble-circle solid">
              <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.85, letterSpacing: '0.05em' }}>
                LEVEL
              </span>
              <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.1 }}>
                {currentLvl}
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgb(233, 236, 239)', marginTop: '4px' }}>
              {t('currentLevel')}
            </span>
          </div>

          {/* Progress bar connecting */}
          <div className="tasks-level-bar-col" style={{ flex: 1, minWidth: '140px', paddingTop: '24px' }}>
            <div
              style={{
                height: '8px',
                borderRadius: '4px',
                background: 'rgb(55, 58, 64)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, rgb(28, 126, 214) 0%, rgb(77, 171, 247) 100%)',
                  width: `${pct}%`,
                }}
              />
            </div>
            <p style={{ fontSize: '10.5px', color: 'rgb(166, 167, 171)', textAlign: 'center', marginTop: '4px' }}>
              {currentXp} / {neededXp} XP
            </p>
          </div>

          {/* Next Level bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="level-bubble-circle dashed">
              <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.85, letterSpacing: '0.05em' }}>
                LEVEL
              </span>
              <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.1 }}>
                {nextLvl}
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgb(28, 126, 214)', marginTop: '4px' }}>
              {t('nextLevel')}
            </span>
          </div>

          {/* Max Level bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="level-bubble-circle dashed">
              <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.85, letterSpacing: '0.05em' }}>
                LEVEL
              </span>
              <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.1 }}>
                {maxLvl}
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgb(28, 126, 214)', marginTop: '4px' }}>
              {t('maxReachableLevel')}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="tasks-two-col-layout">
        {/* Left Column: Laborok */}
        <div>
          {renderCard(
            'labs',
            t('labs'),
            sectionDescriptions.labs,
            categorizedTasks.labs
          )}
        </div>

        {/* Right Column: Házi feladat, Ellenőrző kérdések, Fakultatív, Egyéb */}
        <div>
          {renderCard(
            'homeAssignment',
            t('homeAssignment'),
            sectionDescriptions.homeAssignment,
            categorizedTasks.homeAssignment
          )}

          {renderCard(
            'recapQuizzes',
            t('recapQuizzes'),
            sectionDescriptions.recapQuizzes,
            categorizedTasks.recapQuizzes
          )}

          {renderCard(
            'extraAssignments',
            t('extraAssignments'),
            sectionDescriptions.extraAssignments,
            categorizedTasks.extraAssignments
          )}

          {renderCard(
            'misc',
            t('misc'),
            sectionDescriptions.misc,
            categorizedTasks.misc
          )}
        </div>
      </div>
    </div>
  );
}
