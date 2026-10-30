import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useGoBack } from '@/hooks/useGoBack';

const STATS_URL = 'https://functions.poehali.dev/db5d6b60-ab15-4746-ae49-a2fdf0274196';

interface Totals {
  total: number;
  completed: number;
  overdue: number;
  in_progress: number;
  new: number;
  done_percent: number;
}

interface Department {
  name: string;
  total: number;
  completed: number;
  overdue: number;
  in_progress: number;
  new: number;
}

interface MonthItem {
  month: string;
  total: number;
  completed: number;
  overdue: number;
  open: number;
}

interface StatsData {
  totals: Totals;
  by_source: { pab: number; pc: number };
  departments: Department[];
  months: MonthItem[];
}

const PERIODS = [
  { key: '30', label: '30 дней' },
  { key: '90', label: '3 месяца' },
  { key: '180', label: '6 месяцев' },
  { key: '365', label: 'Год' },
  { key: 'all', label: 'Всё время' },
];

const SOURCES = [
  { key: 'all', label: 'Все' },
  { key: 'pab', label: 'ПАБ' },
  { key: 'pc', label: 'Производственный контроль' },
];

const COLORS = {
  completed: '#22c55e',
  overdue: '#ef4444',
  in_progress: '#3b82f6',
  new: '#f59e0b',
};

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`;
};

const ViolationsStatsPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const userId = localStorage.getItem('userId');

  const [period, setPeriod] = useState('180');
  const [source, setSource] = useState('all');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`${STATS_URL}?period=${period}&source=${source}`);
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || 'Ошибка загрузки');
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error('Не удалось загрузить статистику нарушений');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [period, source]);

  const totals = data?.totals;
  const pieData = totals
    ? [
        { name: 'Устранено', value: totals.completed, color: COLORS.completed },
        { name: 'Просрочено', value: totals.overdue, color: COLORS.overdue },
        { name: 'В работе', value: totals.in_progress, color: COLORS.in_progress },
        { name: 'Новые', value: totals.new, color: COLORS.new },
      ].filter(i => i.value > 0)
    : [];

  const monthData = (data?.months || []).map(m => ({ ...m, label: monthLabel(m.month) }));
  const deptData = (data?.departments || []).map(d => ({
    ...d,
    short: d.name.length > 18 ? `${d.name.slice(0, 17)}…` : d.name,
  }));

  const cards = totals
    ? [
        { label: 'Всего нарушений', value: totals.total, icon: 'ListChecks', color: 'from-slate-500 to-slate-600' },
        { label: 'Устранено', value: totals.completed, icon: 'CheckCircle2', color: 'from-green-500 to-green-600' },
        { label: 'Просрочено', value: totals.overdue, icon: 'AlertTriangle', color: 'from-red-500 to-red-600' },
        { label: 'В работе и новые', value: totals.in_progress + totals.new, icon: 'Clock', color: 'from-blue-500 to-blue-600' },
      ]
    : [];

  const tooltipStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 md:px-6 pt-4 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => goBack('/dashboard')}
              className="border-yellow-600/50 text-yellow-500 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-400"
            >
              <Icon name="ArrowLeft" size={18} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-xl shadow-lg">
                <Icon name="BarChart3" size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Статистика нарушений</h1>
                <p className="text-slate-400 text-sm">По подразделениям и периодам: ПАБ и производственный контроль</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  period === p.key
                    ? 'bg-yellow-500 text-slate-900 border-yellow-500'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-yellow-600/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map(s => (
              <button
                key={s.key}
                onClick={() => setSource(s.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  source === s.key
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-blue-500/50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-24">
            <Icon name="Loader2" size={44} className="animate-spin text-yellow-500" />
          </div>
        ) : !totals || totals.total === 0 ? (
          <div className="text-center py-24 text-slate-400 rounded-2xl border border-slate-700 bg-slate-800/50">
            <Icon name="FileX" size={48} className="mx-auto mb-3 opacity-60" />
            За выбранный период нарушений нет
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {cards.map(c => (
                <div key={c.label} className="rounded-2xl p-4 border border-slate-700 bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-white">{c.value}</div>
                      <div className="text-sm text-slate-400">{c.label}</div>
                    </div>
                    <div className={`bg-gradient-to-br ${c.color} p-3 rounded-xl`}>
                      <Icon name={c.icon} size={22} className="text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                <h2 className="text-white font-semibold mb-1">Устранено нарушений</h2>
                <p className="text-slate-400 text-sm mb-2">Доля устранённых: {totals.done_percent}%</p>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                        {pieData.map(item => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-bold text-white">{totals.done_percent}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 lg:col-span-2">
                <h2 className="text-white font-semibold mb-1">Динамика по месяцам</h2>
                <p className="text-slate-400 text-sm mb-2">Выявлено, устранено и просрочено</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
                      <Line type="monotone" dataKey="total" name="Выявлено" stroke="#e2e8f0" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="completed" name="Устранено" stroke={COLORS.completed} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="overdue" name="Просрочено" stroke={COLORS.overdue} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 mb-4">
              <h2 className="text-white font-semibold mb-1">Нарушения по подразделениям</h2>
              <p className="text-slate-400 text-sm mb-2">Статус каждого нарушения в подразделении</p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="short" stroke="#94a3b8" fontSize={12} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
                    <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
                    <Bar dataKey="completed" name="Устранено" stackId="a" fill={COLORS.completed} />
                    <Bar dataKey="in_progress" name="В работе" stackId="a" fill={COLORS.in_progress} />
                    <Bar dataKey="new" name="Новые" stackId="a" fill={COLORS.new} />
                    <Bar dataKey="overdue" name="Просрочено" stackId="a" fill={COLORS.overdue} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-white font-semibold">Сводка по подразделениям</h2>
                <p className="text-slate-400 text-sm">
                  ПАБ: {data?.by_source.pab ?? 0}, производственный контроль: {data?.by_source.pc ?? 0}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/70 text-slate-300 text-left">
                      <th className="p-3 font-semibold">Подразделение</th>
                      <th className="p-3 font-semibold text-right">Всего</th>
                      <th className="p-3 font-semibold text-right">Устранено</th>
                      <th className="p-3 font-semibold text-right">Просрочено</th>
                      <th className="p-3 font-semibold">Доля устранения</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.departments || []).map(d => {
                      const pct = d.total ? Math.round((d.completed * 100) / d.total) : 0;
                      return (
                        <tr key={d.name} className="border-t border-slate-700/70">
                          <td className="p-3 text-white font-medium">{d.name}</td>
                          <td className="p-3 text-right text-slate-200">{d.total}</td>
                          <td className="p-3 text-right text-green-400">{d.completed}</td>
                          <td className={`p-3 text-right ${d.overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>{d.overdue}</td>
                          <td className="p-3 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-slate-700 overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-slate-300 w-10 text-right">{pct}%</span>
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
        )}
      </div>
    </div>
  );
};

export default ViolationsStatsPage;
