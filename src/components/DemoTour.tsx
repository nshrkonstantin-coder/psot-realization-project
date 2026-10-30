import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useDemoMode } from '@/contexts/DemoContext';

interface Step {
  target: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  { target: '/user-cabinet', title: 'Личный кабинет', text: 'Ваши баллы, статистика и сообщения. Здесь видно, как вы работаете в системе.' },
  { target: '/pab-registration', title: 'Регистрация ПАБ', text: 'Форма поведенческого аудита безопасности: опишите наблюдение, укажите опасные факторы, срок и ответственного.' },
  { target: '/pab-list', title: 'Список ПАБ', text: 'Все зарегистрированные аудиты с датами и статусами. Можно открыть любой и выгрузить в Word.' },
  { target: '/production-control', title: 'Производственный контроль', text: 'Оформление проверок: нарушения, мероприятия по устранению, сроки и ответственные.' },
  { target: '/pc-list', title: 'Список ПК', text: 'Реестр всех проверок производственного контроля с поиском, печатью и выгрузкой.' },
  { target: '/my-metrics', title: 'Мои показатели', text: 'Личные показатели за период: аудиты, выявленные нарушения, устранено, в работе, просрочено.' },
  { target: '/prescriptions', title: 'Реестр предписаний', text: 'Предписания со сроками и статусами. Видно, что выполнено, что в работе и что просрочено.' },
  { target: '/additional', title: 'Дополнительно', text: 'Сообщения, видеоконференции, графики, КБТ, отдел ОТиПБ, реестр работников и здравпункт.' },
];

const DONE_KEY = 'demoTourDone';
const PADDING = 8;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const DemoTour = () => {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const { isDemo } = useDemoMode();
  const onDashboard = isDemo && location.pathname === '/dashboard';

  useEffect(() => {
    if (onDashboard && !localStorage.getItem(DONE_KEY)) {
      const t = setTimeout(() => {
        setIndex(0);
        setActive(true);
      }, 800);
      return () => clearTimeout(t);
    }
    if (!onDashboard) setActive(false);
  }, [onDashboard]);

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${STEPS[index].target}"]`) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [index]);

  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(`[data-tour="${STEPS[index].target}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, index, measure]);

  const finish = () => {
    localStorage.setItem(DONE_KEY, '1');
    setActive(false);
  };

  const restart = () => {
    setIndex(0);
    setActive(true);
  };

  if (!onDashboard) return null;

  if (!active) {
    return (
      <Button
        onClick={restart}
        className="fixed bottom-14 right-4 z-40 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold shadow-xl"
      >
        <Icon name="Compass" size={18} className="mr-2" />
        Экскурсия по системе
      </Button>
    );
  }

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const cardWidth = 340;
  let cardTop = window.innerHeight / 2 - 100;
  let cardLeft = window.innerWidth / 2 - cardWidth / 2;
  if (rect) {
    const below = rect.top + rect.height + PADDING + 12;
    const fitsBelow = below + 220 < window.innerHeight;
    cardTop = fitsBelow ? below : Math.max(12, rect.top - PADDING - 12 - 200);
    cardLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - cardWidth / 2), window.innerWidth - cardWidth - 12);
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {rect ? (
        <div
          className="absolute rounded-xl border-2 border-yellow-400 transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.75)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/75" />
      )}

      <div
        className="absolute bg-white text-slate-900 rounded-2xl shadow-2xl p-5 transition-all duration-300"
        style={{ top: cardTop, left: cardLeft, width: cardWidth, maxWidth: 'calc(100vw - 24px)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-yellow-600">
            Шаг {index + 1} из {STEPS.length}
          </span>
          <button onClick={finish} className="text-slate-400 hover:text-slate-700" aria-label="Закрыть экскурсию">
            <Icon name="X" size={18} />
          </button>
        </div>
        <h3 className="text-lg font-bold mb-1">{step.title}</h3>
        <p className="text-sm text-slate-600 mb-4">{step.text}</p>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish} className="text-slate-500">
            Пропустить
          </Button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                Назад
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (isLast ? finish() : setIndex(index + 1))}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold"
            >
              {isLast ? 'Готово' : 'Далее'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoTour;