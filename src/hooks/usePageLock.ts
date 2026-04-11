const LOCK_KEY = 'page_locks';
const INIT_KEY = 'page_locks_initialized';

// Инициализируем дефолты ОДИН раз (при первом запуске приложения)
export function initDefaultLocks(defaults: string[]) {
  const initialized = localStorage.getItem(INIT_KEY);
  if (initialized) return; // уже было — не трогаем
  const existing = getLockedPages();
  for (const page of defaults) {
    if (!existing.includes(page)) existing.push(page);
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify(existing));
  localStorage.setItem(INIT_KEY, '1');
}

export function getLockedPages(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '[]');
  } catch { return []; }
}

export function isPageLocked(pageKey: string): boolean {
  return getLockedPages().includes(pageKey);
}

export function togglePageLock(pageKey: string) {
  const locked = getLockedPages();
  const idx = locked.indexOf(pageKey);
  if (idx === -1) {
    locked.push(pageKey);
  } else {
    locked.splice(idx, 1);
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify(locked));
  window.dispatchEvent(new CustomEvent('page-lock-changed', { detail: { pageKey } }));
}
