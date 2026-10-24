import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { rules } from '../engine/engine';

export function SignaturePage() {
  const { model: m } = useDashboard();
  const { lang, t, formatLabDate } = useLanguage();
  const navigate = useNavigate();
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);

  const labs = m.labs.labs;
  const passedLabsCount = m.labs.passedCount;
  const totalLabsCount = labs.length || rules.labs.count || 7;

  const getPhaseName = (key: string, defaultName: string) => {
    if (lang === 'en') {
      const enNames: Record<string, string> = {
        registration: 'Phase 0: Registration',
        onboarding: 'Phase 1: Onboarding',
        coding: 'Phase 2: Coding',
        testing: 'Phase 3: Testing',
        review: 'Phase 4: Review',
      };
      return enNames[key] || defaultName;
    }
    return defaultName;
  };

  // Homework phases
  const hwPhases = m.homeAssignment?.phases
    ? Object.entries(m.homeAssignment.phases).map(([key, val]: [string, any], idx) => ({
        key,
        index: idx,
        name: getPhaseName(key, val.name || key),
        result: val.result,
        availableFrom: val.availableFrom,
        dueDate: val.dueDate,
        lateSubmissionDate: val.lateSubmissionDate,
        completedOn: val.completedOn,
      }))
    : [];

  const passedHwCount = hwPhases.filter((p) => p.result === 'completed').length;
  const totalHwCount = hwPhases.length;

  const tokensTotal = m.labs.tokensTotal || 2;
  const tokensLeft = m.labs.tokensLeft ?? 1;
  const feeCount = hwPhases.filter((p) => (p as any).lateSubmissionFeeCharged).length;

  const nextUpcomingLab = labs.find((l) => l.result === 'upcoming' || l.result === 'at_risk');
  const nextUpcomingHw = hwPhases.find((p) => p.result === 'upcoming' || p.result === 'at_risk');

  const filteredLabs = showCurrentOnly
    ? labs.filter((l) => l.result === 'upcoming' || l.result === 'at_risk')
    : labs;

  const filteredHw = showCurrentOnly
    ? hwPhases.filter((p) => p.result === 'upcoming' || p.result === 'at_risk')
    : hwPhases;

  // Timeline percentage geometry calculator for 5 phases across semester
  const semesterStart = new Date(m.homeAssignment?.windowStartDate || rules.homeAssignment?.windowStartDate || 0).getTime();
  const semesterEnd = new Date(m.homeAssignment?.windowEndDate || rules.homeAssignment?.windowEndDate || 0).getTime();
  const semesterDuration = semesterEnd - semesterStart;
  const nowTs = Date.now();
  const todayPct = Math.max(0, Math.min(100, ((nowTs - semesterStart) / semesterDuration) * 100));

  const getTimelineGeometry = (phase: (typeof hwPhases)[0]) => {
    const availTs = phase.availableFrom ? new Date(phase.availableFrom).getTime() : semesterStart;
    const dueTs = phase.dueDate ? new Date(phase.dueDate).getTime() : availTs + 7 * 86400000;
    const lateTs = phase.lateSubmissionDate ? new Date(phase.lateSubmissionDate).getTime() : dueTs + 7 * 86400000;

    const normalLeft = Math.max(0, Math.min(100, ((availTs - semesterStart) / semesterDuration) * 100));
    const normalWidth = Math.max(2, Math.min(100 - normalLeft, ((dueTs - availTs) / semesterDuration) * 100));

    const lateLeft = Math.max(0, Math.min(100, ((dueTs - semesterStart) / semesterDuration) * 100));
    const lateWidth = Math.max(2, Math.min(100 - lateLeft, ((lateTs - dueTs) / semesterDuration) * 100));

    let compPct: number | null = null;
    if (phase.completedOn) {
      const cTs = new Date(phase.completedOn).getTime();
      compPct = Math.max(0, Math.min(100, ((cTs - semesterStart) / semesterDuration) * 100));
    }

    return { normalLeft, normalWidth, lateLeft, lateWidth, compPct };
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
          <h1 className="page-title">{t('signatureDetailsTitle')}</h1>
          <div className="page-subtitle-row">
            <p className="page-subtitle">
              {t('lastUpdatedMoodle')}: {m.moodleLastUpdated || t('live')} · {t('lastUpdatedHf')}: {m.hfLastUpdated || t('notSynced')}
            </p>
            <div
              className="help-icon-bubble"
              title={t('help')}
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
          <span className="toggle-label">{t('showCurrentOnly')}</span>
        </button>
      </div>

      {/* Top Status Card */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(166, 167, 171)', marginBottom: '8px' }}>
          {t('status')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                background:
                  m.labs.signature === 'failed'
                    ? 'rgb(122, 31, 31)'
                    : m.labs.signature === 'at_risk'
                    ? 'rgb(224, 49, 49)'
                    : 'rgb(47, 158, 68)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '20px', color: '#f1f3f5', fontWeight: 800 }}>
              {m.labs.signature === 'failed'
                ? t('failed')
                : m.labs.signature === 'at_risk'
                ? t('atRisk')
                : t('onTrack')}
            </span>
          </div>
          <span style={{ fontSize: '13px', color: 'rgb(166, 167, 171)' }}>
            {t('completedCount', { passed: passedLabsCount, total: totalLabsCount, passedHw: passedHwCount, totalHw: totalHwCount })}
          </span>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgb(55, 58, 64)', margin: '16px 0 14px 0' }} />

        {/* Upcoming 2 weeks */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(233, 236, 239)', marginBottom: '10px' }}>
            {t('upcomingTwoWeeks')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px 24px' }}>
            {nextUpcomingLab && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgb(247, 103, 7)', flexShrink: 0 }} />
                <span style={{ fontSize: '13.5px', color: 'rgb(233, 236, 239)', flex: 1 }}>
                  LAB{nextUpcomingLab.n}: {nextUpcomingLab.title || (rules.labs as any).titles?.[String(nextUpcomingLab.n)] || `Labor ${nextUpcomingLab.n}`}
                </span>
                <span style={{ fontSize: '12px', color: 'rgb(166, 167, 171)' }}>
                  {nextUpcomingLab.original.date ? `${t('time')}: ${formatLabDate(nextUpcomingLab.original.date)}` : t('soon')}
                </span>
              </div>
            )}

            {nextUpcomingHw && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgb(28, 126, 214)', flexShrink: 0 }} />
                <span style={{ fontSize: '13.5px', color: 'rgb(233, 236, 239)', flex: 1 }}>
                  {nextUpcomingHw.name}
                </span>
                <span style={{ fontSize: '12px', color: 'rgb(166, 167, 171)' }}>
                  {t('due')}: {nextUpcomingHw.dueDate ? formatLabDate(nextUpcomingHw.dueDate) : t('soon')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="tasks-two-col-layout">
        {/* Left Column: Laborok */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(233, 236, 239)' }}>
              {t('labs')}
            </span>
            <span style={{ fontSize: '12px', color: 'rgb(166, 167, 171)' }}>
              {passedLabsCount}/{totalLabsCount} {t('completed')}
            </span>
          </div>

          {/* 7-segment progress bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {labs.map((l) => (
              <div
                key={l.n}
                style={{
                  flex: '1 1 0%',
                  height: '9px',
                  borderRadius: '4.5px',
                  background:
                    l.result === 'completed'
                      ? 'rgb(47, 158, 68)'
                      : l.result === 'at_risk'
                      ? 'rgb(224, 49, 49)'
                      : 'rgb(134, 142, 150)',
                }}
              />
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', fontSize: '11px', color: 'rgb(166, 167, 171)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(47, 158, 68)' }} />
              <span>{t('statusCompleted')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(134, 142, 150)' }} />
              <span>{t('upcoming')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(224, 49, 49)' }} />
              <span>{t('atRisk')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(122, 31, 31)' }} />
              <span>{t('failed')}</span>
            </div>
          </div>

          {/* Tokens box */}
          <div className="fee-card">
            <div>
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgb(233, 236, 239)', margin: 0 }}>
                {t('retakeTokens')}
              </p>
              <p style={{ fontSize: '12px', color: 'rgb(166, 167, 171)', margin: '2px 0 0 0' }}>
                {tokensLeft} {t('left')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: tokensTotal }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: idx < tokensLeft ? 'rgb(231, 245, 255)' : 'transparent',
                    border: idx < tokensLeft ? '1.5px solid rgb(28, 126, 214)' : '1.5px solid rgb(173, 181, 189)',
                  }}
                >
                  {idx < tokensLeft && <span style={{ fontSize: '11px', color: 'rgb(28, 126, 214)' }}>●</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Labs List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredLabs.map((l) => {
              const isCompleted = l.result === 'completed';
              const title = l.title || (rules.labs as any).titles?.[String(l.n)] || `Labor ${l.n}`;
              const hasRetake = !!l.retake;
              const defaultDate = (rules.labs as any).defaultDates?.[String(l.n)];
              const dateStr = l.original.date
                ? formatLabDate(l.original.date)
                : defaultDate
                ? formatLabDate(defaultDate)
                : 'Sze 14:00';
              const room = l.original.room;
              const retakeRoom = l.retake?.room;

              return (
                <div
                  key={l.n}
                  style={{
                    background: 'rgb(44, 46, 51)',
                    borderRadius: '10px',
                    padding: '13px 16px',
                  }}
                >
                  {/* Top lab row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'rgb(241, 243, 245)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      LAB{l.n}: {title}
                    </p>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: isCompleted ? 'rgb(235, 251, 238)' : 'rgb(241, 243, 245)',
                        color: isCompleted ? 'rgb(47, 158, 68)' : 'rgb(134, 142, 150)',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <span>{isCompleted ? '✓' : '–'}</span>
                      <span>{isCompleted ? t('statusCompleted') : t('upcoming')}</span>
                    </div>
                  </div>

                  {/* Subrow details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {isCompleted ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                        {l.original.entryPassed !== null && (
                          <span style={{ color: l.original.entryPassed ? 'rgb(47, 158, 68)' : 'rgb(224, 49, 49)', fontWeight: 600 }}>
                            {l.original.entryPassed ? `✓ ${t('entryPassed')}` : `✕ ${t('entryFailed')}`}
                          </span>
                        )}
                        {l.original.exitMet !== null && (
                          <span style={{ color: l.original.exitMet ? 'rgb(47, 158, 68)' : 'rgb(224, 49, 49)', fontWeight: 600 }}>
                            {l.original.exitMet ? `✓ ${t('exitPassed')}` : `✕ ${t('exitFailed')}`}
                          </span>
                        )}
                        {l.original.grade && (
                          <span style={{ color: l.original.grade === 'fail' ? 'rgb(224, 49, 49)' : 'rgb(47, 158, 68)', fontWeight: 800 }}>
                            {t('gradeLabel')}: {l.original.grade === 'excellent' ? t('gradeExcellent') : l.original.grade === 'pass' ? t('gradePassed') : t('gradeFailed')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'rgb(166, 167, 171)', margin: 0 }}>
                        {t('time')}: {dateStr}
                      </p>
                    )}

                    {/* Room pill or hint */}
                    {room ? (
                      <span className="room-pill">{room}</span>
                    ) : (
                      <span className="room-hidden-text">{t('registerForRoom')}</span>
                    )}
                  </div>

                  {/* Retake subbox if present */}
                  {hasRetake && (
                    <div style={{ borderTop: '1px dashed rgb(222, 226, 230)', marginTop: '9px', paddingTop: '9px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'rgb(232, 89, 12)', fontWeight: 800 }}>↻ {t('retake')}</span>
                        <span style={{ fontSize: '11px', color: 'rgb(232, 89, 12)', background: 'rgb(255, 244, 230)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          1 {t('tokenUsed')}
                        </span>
                        {l.retake?.date && (
                          <span style={{ fontSize: '11px', color: 'rgb(166, 167, 171)' }}>
                            {formatLabDate(l.retake.date)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                          {l.retake?.entryPassed !== null && (
                            <span style={{ color: l.retake?.entryPassed ? 'rgb(47, 158, 68)' : 'rgb(224, 49, 49)', fontWeight: 600 }}>
                              {l.retake?.entryPassed ? `✓ ${t('entryPassed')}` : `✕ ${t('entryFailed')}`}
                            </span>
                          )}
                          {l.retake?.exitMet !== null && (
                            <span style={{ color: l.retake?.exitMet ? 'rgb(47, 158, 68)' : 'rgb(224, 49, 49)', fontWeight: 600 }}>
                              {l.retake?.exitMet ? `✓ ${t('exitPassed')}` : `✕ ${t('exitFailed')}`}
                            </span>
                          )}
                          {l.retake?.grade && (
                            <span style={{ color: l.retake?.grade === 'fail' ? 'rgb(224, 49, 49)' : 'rgb(47, 158, 68)', fontWeight: 800 }}>
                              {t('gradeLabel')}: {l.retake?.grade === 'excellent' ? t('gradeExcellent') : l.retake?.grade === 'pass' ? t('gradePassed') : t('gradeFailed')}
                            </span>
                          )}
                        </div>
                        {retakeRoom && <span className="room-pill">{retakeRoom}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Házi feladat */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(233, 236, 239)' }}>
              {t('homeAssignment')}
            </span>
            <span style={{ fontSize: '12px', color: 'rgb(166, 167, 171)' }}>
              {passedHwCount}/{totalHwCount} {t('completed')}
            </span>
          </div>

          {/* 5-segment progress bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {hwPhases.map((p) => (
              <div
                key={p.key}
                style={{
                  flex: '1 1 0%',
                  height: '9px',
                  borderRadius: '4.5px',
                  background:
                    p.result === 'completed'
                      ? 'rgb(47, 158, 68)'
                      : p.result === 'at_risk'
                      ? 'rgb(224, 49, 49)'
                      : 'rgb(134, 142, 150)',
                }}
              />
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', fontSize: '11px', color: 'rgb(166, 167, 171)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(47, 158, 68)' }} />
              <span>{t('statusCompleted')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(134, 142, 150)' }} />
              <span>{t('upcoming')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(224, 49, 49)' }} />
              <span>{t('atRisk')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgb(122, 31, 31)' }} />
              <span>{t('failed')}</span>
            </div>
          </div>

          {/* Fee Box */}
          <div className="fee-card">
            <div>
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgb(233, 236, 239)', margin: 0 }}>
                {t('lateFeeTitle')}
              </p>
              <p style={{ fontSize: '12px', color: 'rgb(166, 167, 171)', margin: '2px 0 0 0' }}>
                {feeCount > 0 ? t('feeCharged', { count: feeCount }) : t('noLateFee')}
              </p>
            </div>
            <span className="fee-count">{feeCount}×</span>
          </div>

          {/* Phases List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredHw.map((p) => {
              const isCompleted = p.result === 'completed';
              const geom = getTimelineGeometry(p);

              return (
                <div
                  key={p.key}
                  style={{
                    background: 'rgb(44, 46, 51)',
                    borderRadius: '10px',
                    padding: '14px 16px 16px',
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'rgb(241, 243, 245)', margin: 0 }}>
                      {p.name}
                    </p>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: isCompleted ? 'rgb(235, 251, 238)' : 'rgb(241, 243, 245)',
                        color: isCompleted ? 'rgb(47, 158, 68)' : 'rgb(134, 142, 150)',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <span>{isCompleted ? '✓' : '–'}</span>
                      <span>{isCompleted ? t('statusCompleted') : t('upcoming')}</span>
                    </div>
                  </div>

                  {/* Horizontal Timeline Bar */}
                  <div className="timeline-bar-wrapper">
                    {/* Normal window */}
                    <div
                      className="timeline-bar-segment"
                      style={{
                        left: `${geom.normalLeft}%`,
                        width: `${geom.normalWidth}%`,
                        background: 'rgb(206, 212, 218)',
                      }}
                    />
                    {/* Late window */}
                    <div
                      className="timeline-bar-segment"
                      style={{
                        left: `${geom.lateLeft}%`,
                        width: `${geom.lateWidth}%`,
                        background: 'rgb(224, 49, 49)',
                      }}
                    />
                    {/* Today marker tick */}
                    <div
                      className="timeline-today-tick"
                      style={{ left: `${todayPct}%` }}
                    />
                    {/* Completed marker dot */}
                    {isCompleted && geom.compPct !== null && (
                      <div
                        className="timeline-dot-completed"
                        style={{ left: `${geom.compPct}%` }}
                      />
                    )}
                  </div>

                  {/* Milestones row */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '8px', fontSize: '11px', color: 'rgb(166, 167, 171)' }}>
                    <p style={{ margin: 0 }}>
                      <span style={{ color: 'rgb(233, 236, 239)', fontWeight: 600 }}>{t('timelineAvailable')}: </span>
                      {p.availableFrom ? formatLabDate(p.availableFrom) : '–'}
                    </p>
                    <p style={{ margin: 0 }}>
                      <span style={{ color: 'rgb(233, 236, 239)', fontWeight: 600 }}>{t('timelineDue')}: </span>
                      {p.dueDate ? formatLabDate(p.dueDate) : '–'}
                    </p>
                    <p style={{ margin: 0 }}>
                      <span style={{ color: 'rgb(233, 236, 239)', fontWeight: 600 }}>{t('timelineLate')}: </span>
                      {p.lateSubmissionDate ? formatLabDate(p.lateSubmissionDate) : '–'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom note & legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', fontSize: '11px', color: 'rgb(166, 167, 171)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgb(28, 126, 214)', border: '2px solid white', boxShadow: '0 0 0 1px rgb(28, 126, 214)' }} />
              <span>{t('timelineCompleted')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '2px', height: '11px', background: 'rgb(52, 58, 64)' }} />
              <span>{t('today')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
