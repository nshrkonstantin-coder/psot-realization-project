import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useLocation } from 'react-router-dom';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

interface OverdueItem {
  type: 'order';
  id: number;
  title: string;
  deadline: string;
  daysOverdue: number;
}

const AlertWidget = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const hidePaths = ['/', '/register'];
  const shouldHide = hidePaths.some(p => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))
    || location.pathname.startsWith('/org/');

  useEffect(() => {
    if (shouldHide) return;
    const userId = localStorage.getItem('userId');
    const orgId = localStorage.getItem('organizationId');
    const dept = localStorage.getItem('userDepartment');
    if (!userId || (dept !== 'ОТиПБ' && dept !== 'Отдел ОТиПБ')) {
      setLoaded(true);
      return;
    }
    const params = new URLSearchParams();
    if (orgId) params.set('organization_id', orgId);
    if (userId) params.set('user_id', userId);
    fetch(`${OT_ORDERS_URL}?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue: OverdueItem[] = [];
        (data.orders || []).forEach((o: { id: number; title: string; deadline: string; extended_deadline: string | null; status: string }) => {
          if (o.status === 'completed') return;
          const deadlineDate = o.extended_deadline
            ? new Date(o.extended_deadline)
            : (o.deadline ? new Date(o.deadline) : null);
          if (!deadlineDate) return;
          deadlineDate.setHours(0, 0, 0, 0);
          if (deadlineDate < today) {
            const diff = Math.floor((today.getTime() - deadlineDate.getTime()) / 86400000);
            overdue.push({ type: 'order', id: o.id, title: o.title, deadline: (o.extended_deadline || o.deadline), daysOverdue: diff });
          }
        });
        setOverdueItems(overdue);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [location.pathname]);

  if (shouldHide || !loaded) return null;

  const hasOverdue = overdueItems.length > 0;

  return (
    <>
      {/* Виджет */}
      <div
        className="fixed top-3 left-3 z-50"
        style={{ width: '54px', height: '54px' }}
      >
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
              className="text-green-400 font-black"
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
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed top-16 left-3 z-50 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '70vh' }}
          >
            <div className={`px-4 py-3 flex items-center justify-between ${hasOverdue ? 'bg-red-950/80 border-b border-red-800/60' : 'bg-green-950/80 border-b border-green-800/60'}`}>
              <div className="flex items-center gap-2">
                {hasOverdue ? (
                  <Icon name="AlertTriangle" size={18} className="text-red-400" />
                ) : (
                  <Icon name="CheckCircle2" size={18} className="text-green-400" />
                )}
                <span className={`font-bold text-sm ${hasOverdue ? 'text-red-300' : 'text-green-300'}`}>
                  {hasOverdue ? `Просрочено: ${overdueItems.length}` : 'Всё в порядке'}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 52px)' }}>
              {!hasOverdue ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <Icon name="CheckCircle2" size={40} className="text-green-400 mb-3" style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.5))' }} />
                  <p className="text-green-300 font-semibold text-sm">Просрочек нет</p>
                  <p className="text-slate-400 text-xs mt-1 text-center">Все поручения выполнены в срок</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {overdueItems.map(item => (
                    <div key={`${item.type}-${item.id}`} className="px-4 py-3 hover:bg-slate-800/60 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                          <span className="text-red-400 font-black text-xs leading-none">!</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium leading-tight line-clamp-2">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-slate-400 text-[10px]">
                              Срок: <span className="text-red-400 font-medium">
                                {new Date(item.deadline).toLocaleDateString('ru-RU')}
                              </span>
                            </span>
                            <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded font-medium">
                              +{item.daysOverdue} {item.daysOverdue === 1 ? 'день' : item.daysOverdue < 5 ? 'дня' : 'дней'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
