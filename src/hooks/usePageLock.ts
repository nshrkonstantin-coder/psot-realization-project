const LOCK_KEY = 'page_locks';

export function getLockedPages(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '[]');
  } catch { return []; }
}

export function isPageLocked(pageKey: string): boolean {
  return getLockedPages().includes(pageKey);
}

export function togglePageLock(pageKey: string): boolean {
  const locked = getLockedPages();
  const idx = locked.indexOf(pageKey);
  if (idx === -1) {
    locked.push(pageKey);
  } else {
    locked.splice(idx, 1);
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify(locked));
  // Уведомляем другие компоненты
  window.dispatchEvent(new CustomEvent('page-lock-changed', { detail: { pageKey } }));
  return !locked.includes(pageKey); // возвращает true если теперь заблокирована
}

export function lockPage(pageKey: string) {
  const locked = getLockedPages();
  if (!locked.includes(pageKey)) {
    locked.push(pageKey);
    localStorage.setItem(LOCK_KEY, JSON.stringify(locked));
    window.dispatchEvent(new CustomEvent('page-lock-changed', { detail: { pageKey } }));
  }
}
