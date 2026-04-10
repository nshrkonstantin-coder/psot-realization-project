import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';

interface Order {
  id: number;
  title: string;
  status: string;
  deadline: string;
  extended_deadline: string | null;
  responsible_person: string;
  assigned_fio: string | null;
  assigned_to_user_id: number | null;
  issued_date?: string | null;
  issued_by?: string;
  notes?: string | null;
  last_action?: string | null;
}

interface Specialist {
  id: number;
  fio: string;
  position: string;
}

interface OtipbAnalyticsBlockProps {
  orders: Order[];
  specialists: Specialist[];
  loading: boolean;
  orgId?: string;
  backUrl?: string;
  canManage?: boolean;
  onClearAll?: () => void;
}

type ModalFilter = 'all' | 'completed' | 'inprogress' | 'overdue';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  completed: 'bg-green-600/20 text-green-300 border-green-500/40',
  extended: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40',
};
const STATUS_LABELS: Record<string, string> = {
  new: 'В работе',
  completed: 'Выполнено',
  extended: 'Продлён',
};

const OtipbAnalyticsBlock = ({
  orders, specialists, loading, orgId = '', backUrl = '/ot-management', canManage = false, onClearAll
}: OtipbAnalyticsBlockProps) => {
  const navigate = useNavigate();
  const [modalFilter, setModalFilter] = useState<ModalFilter | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Загрузка аналитики...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 italic text-sm">
        Нет данных для аналитики
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const isOverdue = (o: Order) => {
    if (o.status === 'completed') return false;
    const raw = o.extended_deadline || o.deadline;
    if (!raw) return false;
    const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d) < today;
  };

  const statsMap: Record<string, {
    fio: string; total: number; completed: number; inProgress: number; overdue: number;
    userId: number | null;
  }> = {};

  orders.forEach(o => {
    const fio = o.assigned_fio || o.responsible_person || 'Не назначен';
    const uid = o.assigned_to_user_id || null;
    if (!statsMap[fio]) {
      statsMap[fio] = { fio, total: 0, completed: 0, inProgress: 0, overdue: 0, userId: uid };
    }
    statsMap[fio].total++;
    if (o.status === 'completed') statsMap[fio].completed++;
    else if (isOverdue(o)) statsMap[fio].overdue++;
    else statsMap[fio].inProgress++;
  });

  const stats = Object.values(statsMap).sort((a, b) => b.total - a.total);

  const totalAll = orders.length;
  const completedAll = orders.filter(o => o.status === 'completed').length;
  const overdueAll = orders.filter(o => isOverdue(o)).length;
  const inProgressAll = totalAll - completedAll - overdueAll;
  const completionRate = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;

  const goToSpecialist = (fio: string, userId: number | null) => {
    const p = new URLSearchParams({ fio, back: backUrl });
    if (userId) p.set('user_id', String(userId));
    if (orgId) p.set('org_id', orgId);
    navigate(`/otipb-specialist?${p.toString()}`);
  };

  // Поручения для модального окна
  const modalOrders = modalFilter ? orders.filter(o => {
    if (modalFilter === 'all') return true;
    if (modalFilter === 'completed') return o.status === 'completed';
    if (modalFilter === 'overdue') return isOverdue(o);
    if (modalFilter === 'inprogress') return !isOverdue(o) && o.status !== 'completed';
    return true;
  }) : [];

  const modalTitles: Record<ModalFilter, string> = {
    all: 'Все поручения',
    completed: 'Выполненные поручения',
    inprogress: 'Поручения в работе',
    overdue: 'Просроченные поручения',
  };

  return (
    <div className="space-y-4">
      {/* Сводные карточки — кликабельные */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setModalFilter('all')}
          className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30 text-left hover:border-slate-400 hover:bg-slate-700/60 transition-all hover:scale-105 group">
          <div className="text-2xl font-bold text-white group-hover:text-orange-300 transition-colors">{totalAll}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Icon name="List" size={11} />Всего поручений
          </div>
        </button>
        <button onClick={() => setModalFilter('completed')}
          className="bg-green-900/20 rounded-xl p-4 border border-green-600/30 text-left hover:border-green-400 hover:bg-green-900/40 transition-all hover:scale-105 group">
          <div className="text-2xl font-bold text-green-400">{completedAll}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Icon name="CheckCircle2" size={11} className="text-green-400" />Выполнено
          </div>
        </button>
        <button onClick={() => setModalFilter('inprogress')}
          className="bg-blue-900/20 rounded-xl p-4 border border-blue-600/30 text-left hover:border-blue-400 hover:bg-blue-900/40 transition-all hover:scale-105 group">
          <div className="text-2xl font-bold text-blue-400">{inProgressAll}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Icon name="Clock" size={11} className="text-blue-400" />В работе
          </div>
        </button>
        <button onClick={() => setModalFilter('overdue')}
          className="bg-red-900/20 rounded-xl p-4 border border-red-600/30 text-left hover:border-red-400 hover:bg-red-900/40 transition-all hover:scale-105 group">
          <div className="text-2xl font-bold text-red-400">{overdueAll}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Icon name="AlertTriangle" size={11} className="text-red-400" />Просрочено
          </div>
        </button>
      </div>

      {/* Прогресс */}
      <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-300 font-medium">Общий прогресс выполнения</span>
          <span className="text-sm font-bold text-white">{completionRate}%</span>
        </div>
        <div className="w-full bg-slate-600 rounded-full h-3">
          <div className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%`, background: completionRate >= 80 ? '#16a34a' : completionRate >= 50 ? '#d97706' : '#dc2626' }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Выполнено: {completedAll}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />В работе: {inProgressAll}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Просрочено: {overdueAll}</span>
        </div>
      </div>

      {/* Таблица по специалистам — строки кликабельны */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Icon name="Users" size={16} className="text-orange-400" />
            Статистика по специалистам
            <span className="text-xs text-slate-500 font-normal">(нажмите на строку для просмотра)</span>
          </h4>
          {canManage && (
            <div>
              {!confirmClearAll ? (
                <button onClick={() => setConfirmClearAll(true)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                  <Icon name="Trash2" size={12} />Обнулить все поручения
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Удалить все {orders.length}?</span>
                  <button onClick={() => { onClearAll?.(); setConfirmClearAll(false); }}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors">Да</button>
                  <button onClick={() => setConfirmClearAll(false)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded transition-colors">Нет</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs">
                <th className="text-left py-2 px-3">Специалист</th>
                <th className="text-center py-2 px-3">Всего</th>
                <th className="text-center py-2 px-3">Выполнено</th>
                <th className="text-center py-2 px-3">В работе</th>
                <th className="text-center py-2 px-3">Просрочено</th>
                <th className="text-left py-2 px-3">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => {
                const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                return (
                  <tr key={s.fio}
                    onClick={() => goToSpecialist(s.fio, s.userId)}
                    className={`border-b border-slate-700/40 cursor-pointer hover:bg-orange-500/10 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-600/30 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-300 shrink-0">
                          {s.fio.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()}
                        </div>
                        <span className="text-orange-300 text-xs font-medium truncate max-w-[160px] underline-offset-2 hover:underline" title={s.fio}>{s.fio}</span>
                        <Icon name="ExternalLink" size={11} className="text-slate-500 shrink-0" />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-white font-bold">{s.total}</td>
                    <td className="py-2.5 px-3 text-center"><span className="text-green-400 font-semibold">{s.completed}</span></td>
                    <td className="py-2.5 px-3 text-center"><span className="text-blue-400 font-semibold">{s.inProgress}</span></td>
                    <td className="py-2.5 px-3 text-center">
                      {s.overdue > 0
                        ? <span className="text-red-400 font-bold flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />{s.overdue}</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-600 rounded-full h-2">
                          <div className="h-2 rounded-full"
                            style={{ width: `${rate}%`, background: rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно со списком поручений */}
      {modalFilter && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalFilter(null)}>
          <Card className="bg-slate-800 border-slate-600 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardList" size={18} className="text-orange-400" />
                {modalTitles[modalFilter]} ({modalOrders.length})
              </h3>
              <button onClick={() => setModalFilter(null)} className="text-slate-400 hover:text-white transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {modalOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic">Нет поручений</div>
              ) : (
                <div className="space-y-1">
                  {modalOrders.map(o => {
                    const overdue = isOverdue(o);
                    const fio = o.assigned_fio || o.responsible_person;
                    const deadlineRaw = o.extended_deadline || o.deadline;
                    return (
                      <div key={o.id} className={`p-3 rounded-lg ${overdue ? 'bg-red-900/20 border border-red-500/30' : 'bg-slate-700/30'}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{o.title}</p>
                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Icon name="User" size={10} />{fio}
                              </span>
                              {deadlineRaw && (
                                <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                                  <Icon name="Clock" size={10} />
                                  {new Date(deadlineRaw.slice(0, 10)).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${overdue ? 'bg-red-900/30 text-red-300 border-red-500/40' : STATUS_COLORS[o.status] || ''}`}>
                            {overdue ? 'Просрочено' : STATUS_LABELS[o.status] || o.status}
                          </span>
                        </div>
                        {o.last_action && (
                          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                            <Icon name="CheckCircle" size={10} />{o.last_action}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OtipbAnalyticsBlock;
