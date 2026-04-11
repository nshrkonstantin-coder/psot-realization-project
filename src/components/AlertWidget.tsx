import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useLocation, useNavigate } from 'react-router-dom';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

interface OverdueItem {
  type: 'order';
  id: number;
  title: string;
  area: string;
  deadline: string;
  daysOverdue: number;
  link: string;
}

// Парсим дату из строки "YYYY-MM-DD" без смещения часового пояса
const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const pluralDays = (n: number) =>
  n === 1 ? 'день' : n < 5 ? 'дня' : 'дней';

const AlertWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const hidePaths = ['/', '/register'];
  const shouldHide =
    hidePaths.some(p => (p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))) ||
    location.pathname.startsWith('/org/');

  const fetchOverdue = () => {
    const userId = localStorage.getItem('userId');
    const orgId = localStorage.getItem('organizationId');
    const role = localStorage.getItem('userRole');
    const dept = (localStorage.getItem('userDepartment') || '').toLowerCase();

    // Показываем виджет: superadmin, admin — видят все поручения отдела
    // Начальник/руководитель ОТиПБ — видит все поручения отдела (даже с ролью user)
    // Специалисты ОТиПБ — видят только свои поручения
    const pos = (localStorage.getItem('userPosition') || '').toLowerCase();
    const isAdmin = role === 'superadmin' || role === 'admin';
    const isOtipbSpec = dept.includes('отипб') || dept.includes('охрана труда') || dept.includes('от и пб');
    const isOtipbHead = isOtipbSpec && (
      pos.includes('начальник') || pos.includes('руководитель') || pos.includes('заместитель') || pos.includes('главный')
    );

    if (!userId || (!isAdmin && !isOtipbSpec)) {
      setLoaded(true);
      return;
    }

    const params = new URLSearchParams();
    if (orgId) params.set('organization_id', orgId);
    // Начальники/руководители ОТиПБ и admins видят все поручения — без user_id фильтра
    // Обычные специалисты ОТиПБ — только свои поручения
    if (!isAdmin && !isOtipbHead && isOtipbSpec) params.set('user_id', userId);

    fetch(`${OT_ORDERS_URL}?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue: OverdueItem[] = [];

        const role2 = localStorage.getItem('userRole');
        const overdueLink = role2 === 'superadmin'
          ? '/ot-management'
          : role2 === 'admin'
          ? '/otipb-department'
          : '/otipb-workspace-dashboard';

        (data.orders || []).forEach((o: {
          id: number; title: string; deadline: string;
          extended_deadline: string | null; status: string;
        }) => {
          if (o.status === 'completed') return;
          const rawDeadline = o.extended_deadline || o.deadline;
          if (!rawDeadline) return;
          const deadlineDate = parseLocalDate(rawDeadline);
          if (deadlineDate < today) {
            const diff = Math.floor((today.getTime() - deadlineDate.getTime()) / 86400000);
            overdue.push({
              type: 'order',
              id: o.id,
              title: o.title,
              area: 'Поручения ОТиПБ',
              deadline: rawDeadline,
              daysOverdue: diff,
              link: overdueLink,
            });
          }
        });

        setOverdueItems(overdue);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(() => {
    if (shouldHide) return;
    fetchOverdue();
    const interval = setInterval(fetchOverdue, 30_000);
    const onFocus = () => fetchOverdue();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [location.pathname]);

  if (shouldHide || !loaded) return null;

  const hasOverdue = overdueItems.length > 0;

  const handleItemClick = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  return (
    <>
      {/* Виджет-кнопка */}
      <div className="fixed top-3 left-3 z-50" style={{ width: '54px', height: '54px' }}>
        <button
          onClick={() => setOpen(o => !o)}
          title={hasOverdue ? `Просрочено: ${overdueItems.length}` : 'Всё в порядке'}
          className={`w-full h-full rounded-xl border-2 shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-200 hover:scale-110 active:scale-95 ${
            hasOverdue
              ? 'bg-red-950/90 border-red-500 hover:bg-red-900'
              : 'bg-green-950/90 border-green-500 hover:bg-green-900'
          }`}
        >
          {hasOverdue ? (
            <>
              <span
                className="text-red-400 font-black leading-none select-none"
                style={{
                  fontSize: '26px',
                  animation: 'alertBlink 1s ease-in-out infinite',
                  textShadow: '0 0 8px rgba(239,68,68,0.8)',
                }}
              >
                !
              </span>
              <span className="text-red-400 text-[9px] font-bold leading-none">{overdueItems.length}</span>
            </>
          ) : (
            <Icon
              name="Check"
              size={28}
              className="text-green-400"
              style={{ strokeWidth: 3, filter: 'drop-shadow(0 0 6px rgba(74,222,128,0.7))' }}
            />
          )}
        </button>
        <span className="block text-center text-[8px] text-slate-400 mt-0.5 leading-tight select-none">
          Внимание
        </span>
      </div>

      {/* Панель просрочек */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed top-16 left-3 z-50 w-84 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '340px', maxHeight: '72vh' }}
          >
            {/* Шапка */}
            <div className={`px-4 py-3 flex items-center justify-between border-b ${
              hasOverdue ? 'bg-red-950/80 border-red-800/60' : 'bg-green-950/80 border-green-800/60'
            }`}>
              <div className="flex items-center gap-2">
                <Icon
                  name={hasOverdue ? 'AlertTriangle' : 'CheckCircle2'}
                  size={17}
                  className={hasOverdue ? 'text-red-400' : 'text-green-400'}
                />
                <span className={`font-bold text-sm ${hasOverdue ? 'text-red-300' : 'text-green-300'}`}>
                  {hasOverdue ? `Просрочено: ${overdueItems.length}` : 'Всё в порядке'}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* Тело */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(72vh - 52px)' }}>
              {!hasOverdue ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <Icon
                    name="CheckCircle2"
                    size={42}
                    className="text-green-400 mb-3"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.5))' }}
                  />
                  <p className="text-green-300 font-semibold text-sm">Просрочек нет</p>
                  <p className="text-slate-400 text-xs mt-1 text-center">Все поручения выполнены в срок</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {overdueItems.map(item => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleItemClick(item.link)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800/70 active:bg-slate-700/70 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Иконка области */}
                        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
                          <Icon name="ClipboardList" size={15} className="text-red-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Область */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide">
                              {item.area}
                            </span>
                          </div>

                          {/* Название */}
                          <p className="text-white text-xs font-medium leading-snug line-clamp-2 mb-1.5">
                            {item.title}
                          </p>

                          {/* Срок + просрочка */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400 text-[10px]">
                              Срок:{' '}
                              <span className="text-red-400 font-semibold">
                                {parseLocalDate(item.deadline).toLocaleDateString('ru-RU')}
                              </span>
                            </span>
                            <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded-md font-semibold">
                              +{item.daysOverdue} {pluralDays(item.daysOverdue)}
                            </span>
                          </div>
                        </div>

                        {/* Стрелка-переход */}
                        <div className="shrink-0 mt-1 text-slate-500 group-hover:text-orange-400 transition-colors">
                          <Icon name="ChevronRight" size={16} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Подвал с подсказкой */}
            {hasOverdue && (
              <div className="px-4 py-2 border-t border-slate-700/60 bg-slate-800/40">
                <p className="text-[10px] text-slate-500 text-center">
                  Нажмите на строку чтобы перейти к устранению
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes alertBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.85); }
        }
      `}</style>
    </>
  );
};

export default AlertWidget;