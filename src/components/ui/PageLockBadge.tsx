import { useState, useEffect } from 'react';
import { isPageLocked, togglePageLock, canManageLocks } from '@/hooks/usePageLock';

interface PageLockBadgeProps {
  pageKey: string;
}

const PageLockBadge = ({ pageKey }: PageLockBadgeProps) => {
  const [locked, setLocked]   = useState(() => isPageLocked(pageKey));
  const [tooltip, setTooltip] = useState(false);
  const [saving, setSaving]   = useState(false);
  const canManage             = canManageLocks();

  useEffect(() => {
    // При смене вкладки сразу обновляем состояние из кэша
    setLocked(isPageLocked(pageKey));
    const sync = () => setLocked(isPageLocked(pageKey));
    window.addEventListener('page-lock-changed', sync);
    window.addEventListener('page-locks-updated', sync);
    return () => {
      window.removeEventListener('page-lock-changed', sync);
      window.removeEventListener('page-locks-updated', sync);
    };
  }, [pageKey]);

  const handleClick = async () => {
    if (canManage) {
      setSaving(true);
      await togglePageLock(pageKey);
      setLocked(isPageLocked(pageKey));
      setSaving(false);
    } else {
      setTooltip(v => !v);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleClick}
        disabled={saving}
        title={locked ? 'Защита включена — нажмите чтобы снять' : 'Защита выключена — нажмите чтобы включить'}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all select-none shadow-sm',
          locked
            ? 'bg-red-600 border border-red-500 text-white hover:bg-red-500'
            : 'bg-green-600 border border-green-500 text-white hover:bg-green-500',
          saving ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        {saving ? '...' : locked ? 'Защищено' : 'Открыто'}
      </button>

      {!canManage && tooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTooltip(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4">
            <p className={`text-xs font-bold mb-1 ${locked ? 'text-red-400' : 'text-green-400'}`}>
              {locked ? '🔒 Страница защищена' : '🔓 Страница открыта'}
            </p>
            <p className="text-slate-400 text-xs mb-3 leading-snug">
              {locked
                ? 'Импорт Excel не затронет данные этой страницы. Изменения только вручную.'
                : 'При загрузке Excel данные этой страницы могут быть перезаписаны.'}
            </p>
            <p className="text-slate-500 text-xs text-center italic">
              Только администратор или начальник отдела ОТиПБ могут изменить защиту
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default PageLockBadge;