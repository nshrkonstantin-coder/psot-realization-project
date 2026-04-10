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
}

const OtipbAnalyticsBlock = ({ orders, specialists, loading }: OtipbAnalyticsBlockProps) => {
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

  // Группируем поручения по ФИО ответственного
  const statsMap: Record<string, {
    fio: string;
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  }> = {};

  orders.forEach(o => {
    const fio = o.assigned_fio || o.responsible_person || 'Не назначен';
    if (!statsMap[fio]) {
      statsMap[fio] = { fio, total: 0, completed: 0, inProgress: 0, overdue: 0 };
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

  return (
    <div className="space-y-4">
      {/* Сводные показатели */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30">
          <div className="text-2xl font-bold text-white">{totalAll}</div>
          <div className="text-xs text-slate-400 mt-1">Всего поручений</div>
        </div>
        <div className="bg-green-900/20 rounded-xl p-4 border border-green-600/30">
          <div className="text-2xl font-bold text-green-400">{completedAll}</div>
          <div className="text-xs text-slate-400 mt-1">Выполнено</div>
        </div>
        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-600/30">
          <div className="text-2xl font-bold text-blue-400">{inProgressAll}</div>
          <div className="text-xs text-slate-400 mt-1">В работе</div>
        </div>
        <div className="bg-red-900/20 rounded-xl p-4 border border-red-600/30">
          <div className="text-2xl font-bold text-red-400">{overdueAll}</div>
          <div className="text-xs text-slate-400 mt-1">Просрочено</div>
        </div>
      </div>

      {/* Прогресс-бар общего выполнения */}
      <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-300 font-medium">Общий прогресс выполнения</span>
          <span className="text-sm font-bold text-white">{completionRate}%</span>
        </div>
        <div className="w-full bg-slate-600 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${completionRate}%`,
              background: completionRate >= 80 ? '#16a34a' : completionRate >= 50 ? '#d97706' : '#dc2626'
            }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Выполнено: {completedAll}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />В работе: {inProgressAll}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Просрочено: {overdueAll}</span>
        </div>
      </div>

      {/* Таблица по специалистам */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Icon name="Users" size={16} className="text-orange-400" />
          Статистика по специалистам
        </h4>
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
                  <tr key={s.fio} className={`border-b border-slate-700/40 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-600/30 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-300 shrink-0">
                          {s.fio.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()}
                        </div>
                        <span className="text-white text-xs font-medium truncate max-w-[160px]" title={s.fio}>{s.fio}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-white font-bold">{s.total}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-green-400 font-semibold">{s.completed}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-blue-400 font-semibold">{s.inProgress}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.overdue > 0
                        ? <span className="text-red-400 font-bold flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />{s.overdue}</span>
                        : <span className="text-slate-500">—</span>
                      }
                    </td>
                    <td className="py-2.5 px-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-600 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${rate}%`,
                              background: rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
                            }}
                          />
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
    </div>
  );
};

export default OtipbAnalyticsBlock;
