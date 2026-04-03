import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 часов
const WARNING_BEFORE = 2 * 60 * 1000; // предупреждение за 2 минуты

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionGuard() {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      const ok = window.confirm('Сессия истекает через 2 минуты из-за бездействия. Продолжить работу?');
      if (!ok) logout();
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    timerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    resetTimer();
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);
}
