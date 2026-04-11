import { useState, useEffect } from 'react';
import { isPageLocked, togglePageLock } from '@/hooks/usePageLock';

interface PageLockBadgeProps {
  pageKey: string;
  defaultLocked?: boolean;
}

const PageLockBadge = ({ pageKey, defaultLocked = false }: PageLockBadgeProps) => {
  const [locked, setLocked] = useState(() => {
    const stored = localStorage.getItem('page_locks');
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        if (arr.includes(pageKey)) return true;
        // Если страница не в localStorage вообще — применяем defaultLocked
        return false;
      } catch { return defaultLocked; }
    }
    // Первый запуск — применяем default
    if (defaultLocked) {
      const locks = [];
      locks.push(pageKey);
      localStorage.setItem('page_locks', JSON.stringify(locks));
      return true;
    }
    return false;
  });

  const [tooltip, setTooltip] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.pageKey === pageKey) {
        setLocked(isPageLocked(pageKey));
      }
    };
    window.addEventListener('page-lock-changed', handler);
    return () => window.removeEventListener('page-lock-changed', handler);
  }, [pageKey]);

  const handleToggle = () => {
    togglePageLock(pageKey);
    setLocked(isPageLocked(pageKey));
    setTooltip(false);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setTooltip(v => !v)}
        title={locked ? 'Страница защищена от внешнего импорта' : 'Страница не защищена'}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all select-none',
          locked
            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
            : 'bg-slate-700/60 border border-slate-600 text-slate-400 hover:bg-slate-700',
        ].join(' ')}
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          {locked ? (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </>
          ) : (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </>
          )}
        </svg>
        {locked ? 'Защищено' : 'Открыто'}
      </button>

      {tooltip && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setTooltip(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4">
            <p className="text-white text-xs font-semibold mb-1">
              {locked ? '🔒 Страница защищена' : '🔓 Страница открыта'}
            </p>
            <p className="text-slate-400 text-xs mb-3 leading-snug">
              {locked
                ? 'Импорт Excel не затронет данные этой страницы. Изменения только вручную.'
                : 'При загрузке Excel данные этой страницы могут быть перезаписаны.'}
            </p>
            <button
              onClick={handleToggle}
              className={[
                'w-full py-2 rounded-lg text-xs font-semibold transition',
                locked
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-900',
              ].join(' ')}
            >
              {locked ? '🔓 Снять защиту' : '🔒 Включить защиту'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PageLockBadge;
