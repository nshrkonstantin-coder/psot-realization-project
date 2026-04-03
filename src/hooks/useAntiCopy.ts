import { useEffect } from 'react';

export function useAntiCopy() {
  useEffect(() => {
    const userFio = localStorage.getItem('userFio') || '';
    const userId = localStorage.getItem('userId') || '';

    // Водяной знак поверх страницы
    const watermark = document.createElement('div');
    watermark.id = 'security-watermark';
    watermark.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9999; overflow: hidden;
      user-select: none; -webkit-user-select: none;
    `;
    const label = userFio ? `${userFio} • ID:${userId}` : 'АСУБТ — Конфиденциально';
    const text = `${label} • `;
    let html = '';
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 8; x++) {
        html += `<span style="
          position:absolute;
          left:${x * 13 + (y % 2) * 6}%;
          top:${y * 5}%;
          transform:rotate(-25deg);
          font-size:12px;
          color:rgba(150,150,150,0.07);
          white-space:nowrap;
          font-family:Arial,sans-serif;
          font-weight:600;
          letter-spacing:1px;
        ">${text}</span>`;
      }
    }
    watermark.innerHTML = html;
    document.body.appendChild(watermark);

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

    // Запрет встраивания в iframe (CSP через мета-тег)
    const existingMeta = document.querySelector('meta[http-equiv="X-Frame-Options"]');
    if (!existingMeta) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Frame-Options';
      meta.content = 'SAMEORIGIN';
      document.head.appendChild(meta);
    }

    // Проверка что сайт не в iframe
    if (window.top !== window.self) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;color:red;font-size:20px;">Доступ запрещён</div>';
    }

    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('dragstart', blockDrag);
      const wm = document.getElementById('security-watermark');
      if (wm) wm.remove();
    };
  }, []);
}
