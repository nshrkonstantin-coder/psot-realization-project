const API = 'https://functions.poehali.dev/85a795aa-16f4-4214-8690-191bbd6e73d2';
const CACHE_KEY = 'page_locks_cache';

// Кэш в памяти — синхронный, обновляется при загрузке из БД
let memCache: Record<string, boolean> = {};

function loadCache(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(locks: Record<string, boolean>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(locks));
  memCache = { ...locks };
}

// Инициализация — загружаем из localStorage пока БД не ответит
memCache = loadCache();

// Загрузить блокировки из БД (вызывается при старте приложения)
export async function fetchPageLocks(): Promise<void> {
  try {
    const res = await fetch(`${API}?action=page_locks`);
    const data = await res.json();
    if (data.success && data.locks) {
      saveCache(data.locks);
      window.dispatchEvent(new CustomEvent('page-locks-updated'));
    }
  } catch { /* используем кэш */ }
}

export function isPageLocked(pageKey: string): boolean {
  return memCache[pageKey] === true;
}

// Определяем может ли текущий пользователь управлять блокировками
export function canManageLocks(): boolean {
  const role = localStorage.getItem('userRole') || '';
  const dept = (localStorage.getItem('userDepartment') || '').toLowerCase();
  const pos = (localStorage.getItem('userPosition') || '').toLowerCase();

  const isAdmin = role === 'superadmin' || role === 'admin';
  const isOtipbHead = (
    dept.includes('отипб') || dept.includes('от и пб') || dept.includes('дирекция по от')
  ) && (
    pos.includes('начальник') || pos.includes('директор') || pos.includes('руководитель')
  );

  return isAdmin || isOtipbHead;
}

export async function togglePageLock(pageKey: string): Promise<void> {
  const newVal = !isPageLocked(pageKey);
  const userId = localStorage.getItem('userId');

  // Оптимистично обновляем кэш
  memCache = { ...memCache, [pageKey]: newVal };
  saveCache(memCache);
  window.dispatchEvent(new CustomEvent('page-lock-changed', { detail: { pageKey } }));

  // Сохраняем в БД
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_page_lock', page_key: pageKey, is_locked: newVal, user_id: userId })
    });
    const data = await res.json();
    if (!data.success) {
      // Откатываем если бэкенд вернул ошибку
      memCache = { ...memCache, [pageKey]: !newVal };
      saveCache(memCache);
      window.dispatchEvent(new CustomEvent('page-lock-changed', { detail: { pageKey } }));
      return;
    }
  } catch {
    // Откатываем при сетевой ошибке
    memCache = { ...memCache, [pageKey]: !newVal };
    saveCache(memCache);
    window.dispatchEvent(new CustomEvent('page-lock-changed', { detail: { pageKey } }));
    return;
  }

  // Синхронизируем с БД после успешного сохранения
  await fetchPageLocks();
}

// Для проверки при импорте (синхронная, из кэша)
export function getLockedPages(): string[] {
  return Object.entries(memCache).filter(([, v]) => v).map(([k]) => k);
}

// Обратная совместимость — уже не нужна, но оставляем пустой
export function initDefaultLocks(_defaults: string[]) { /* управляется через БД */ }