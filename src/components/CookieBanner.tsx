import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookie_consent');
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Icon name="Cookie" size={20} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed">
            Мы используем файлы cookie для корректной работы Системы (сессии, настройки интерфейса).
            Продолжая использование АСУБТ, вы соглашаетесь с{' '}
            <Link to="/privacy-policy" className="text-yellow-400 hover:text-yellow-300 underline">
              Политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
        <Button
          onClick={accept}
          className="shrink-0 bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-5"
        >
          Понятно
        </Button>
      </div>
    </div>
  );
}
