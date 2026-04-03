import { useEffect } from 'react';

export function useAntiCopy() {
  useEffect(() => {
    // Блокировка правой кнопки мыши
    const blockContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', blockContext);

    // Блокировка Print Screen и DevTools горячих клавиш
    const blockKeys = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard?.writeText('').catch(() => {});
      }
      // F12, Ctrl+Shift+I/J/U/C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', blockKeys);

    // Блокировка drag & drop контента
    const blockDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragstart', blockDrag);

    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('dragstart', blockDrag);

    };
  }, []);
}