import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { computeDashboard, rules } from '../engine/engine';
import { applyHfDataToModel } from '../engine/hfIntegration';
import type { DashboardModel } from '../engine/types';
import { clearToken, getToken } from '../moodle/auth';
import { MoodleError } from '../moodle/client';
import { fetchSnapshot } from '../moodle/snapshot';
import type { MoodleSnapshot } from '../moodle/types';
import { clearHfToken, fetchHfStatus, type HfStatus } from '../moodle/hfClient';
import { Loader2, AlertCircle, LogOut } from 'lucide-react';

const CACHE_KEY = 'moodle.snapshot';

interface DashboardContextType {
  model: DashboardModel;
  refresh: () => void;
  refreshing: boolean;
  progress: string;
  error: string | null;
  logout: () => void;
  updateHfStatus: (status: HfStatus | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within a DashboardProvider');
  return ctx;
};

function readCache(): MoodleSnapshot | null {
  try {
    const rawSnap = sessionStorage.getItem(CACHE_KEY);
    return rawSnap ? (JSON.parse(rawSnap) as MoodleSnapshot) : null;
  } catch {
    return null;
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<MoodleSnapshot | null>(readCache);
  const [hfStatus, setHfStatus] = useState<HfStatus | null>(() => {
    try {
      const raw = sessionStorage.getItem('hf.status');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const lastRefreshTime = useRef<number>(Date.now());

  const updateHfStatus = useCallback((newHf: HfStatus | null) => {
    if (newHf) {
      sessionStorage.setItem('hf.status', JSON.stringify(newHf));
    } else {
      sessionStorage.removeItem('hf.status');
    }
    setHfStatus(newHf);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearHfToken();
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem('hf.status');
    window.location.reload();
  }, []);

  const refresh = useCallback(async () => {
    lastRefreshTime.current = Date.now();
    setRefreshing(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;

      const hfPromise = fetchHfStatus().catch((err) => {
        console.warn('HF status sync warning:', err);
        return null;
      });

      const [s, hf] = await Promise.all([
        fetchSnapshot(token, rules.courseId, setProgress),
        hfPromise,
      ]);

      sessionStorage.setItem(CACHE_KEY, JSON.stringify(s));
      setSnap(s);

      if (hf) {
        sessionStorage.setItem('hf.status', JSON.stringify(hf));
        setHfStatus(hf);
      }
    } catch (e) {
      if (e instanceof MoodleError && e.isAuth) return logout();
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      // Re-fetch in background if more than 30s have passed since last refresh
      if (Date.now() - lastRefreshTime.current > 30_000) {
        lastRefreshTime.current = Date.now();
        void refresh();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const model = useMemo<DashboardModel | null>(() => {
    if (!snap) return null;
    const baseModel = computeDashboard(snap);
    if (hfStatus) {
      return applyHfDataToModel(baseModel, hfStatus);
    }
    return baseModel;
  }, [snap, hfStatus]);

  const contextValue = useMemo(
    () => (model ? { model, refresh, refreshing, progress, error, logout, updateHfStatus } : null),
    [model, refresh, refreshing, progress, error, logout, updateHfStatus]
  );

  if (!model || !contextValue) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '420px', padding: '20px', textAlign: 'center' }}>
          {error ? (
            <>
              <AlertCircle size={44} color="var(--color-red)" />
              <div style={{ color: 'var(--color-red)', fontWeight: 700, fontSize: '1.1rem' }}>
                Hiba az adatok betöltésekor
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{error}</div>
              <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={logout}>
                <LogOut size={16} style={{ marginRight: '6px' }} />
                <span>Kijelentkezés és visszatérés</span>
              </button>
            </>
          ) : (
            <>
              <Loader2 size={38} color="var(--color-blue)" className="spin" />
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {progress || 'Adatok betöltése…'}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}
