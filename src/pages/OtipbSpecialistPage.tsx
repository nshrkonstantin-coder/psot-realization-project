import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

interface Order {
  id: number;
  title: string;
  issued_date: string | null;
  deadline: string | null;
  responsible_person: string;
  issued_by: string;
  status: 'new' | 'completed' | 'extended';
  extended_deadline: string | null;
  organization_id: number | null;
  assigned_to_user_id: number | null;
  assigned_fio: string | null;
  notes: string | null;
  last_action: string | null;
  updated_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'В работе',
  completed: 'Выполнено',
  extended: 'Срок продлён',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  completed: 'bg-green-600/20 text-green-300 border-green-500/40',
  extended: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40',
};

type FilterType = 'all' | 'new' | 'completed' | 'overdue';

const OtipbSpecialistPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fio = searchParams.get('fio') || '';
  const specUserId = searchParams.get('user_id') || '';
  const orgId = searchParams.get('org_id') || localStorage.getItem('organizationId') || '';
  const backUrl = searchParams.get('back') || '/ot-management';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const userRole = localStorage.getItem('userRole') || '';
  const canManage = userRole === 'superadmin' || userRole === 'admin';

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const isOverdue = (o: Order) => {
    if (o.status === 'completed') return false;
    const raw = o.extended_deadline || o.deadline;
    if (!raw) return false;
    const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d) < today;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('action', 'specialist_orders');
      if (orgId) p.set('organization_id', orgId);
      if (specUserId) p.set('specialist_user_id', specUserId);
      else if (fio) p.set('fio', fio);
      const res = await apiFetch(`${OT_ORDERS_URL}?${p.toString()}`);
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
      else toast.error('Ошибка загрузки');
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fio && !specUserId) { navigate(backUrl); return; }
    loadOrders();
  }, [fio, specUserId]);

  const deleteOrder = async (id: number) => {
    setDeletingId(id);
    try {
      const p = new URLSearchParams({ id: String(id) });
      if (orgId) p.set('organization_id', orgId);
      const res = await apiFetch(`${OT_ORDERS_URL}?${p.toString()}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.filter(o => o.id !== id));
        toast.success('Поручение удалено');
      } else toast.error('Ошибка удаления');
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setDeletingId(null);
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      const p = new URLSearchParams({ action: 'clear_specialist' });
      if (orgId) p.set('organization_id', orgId);
      if (specUserId) p.set('specialist_user_id', specUserId);
      else if (fio) p.set('fio', fio);
      const res = await apiFetch(`${OT_ORDERS_URL}?${p.toString()}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders([]);
        setConfirmClear(false);
        toast.success('Все поручения специалиста очищены');
      } else toast.error('Ошибка очистки');
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setClearing(false);
    }
  };

  // Фильтрация
  const filtered = orders.filter(o => {
    if (filter === 'completed' && o.status !== 'completed') return false;
    if (filter === 'new' && (o.status !== 'new' && o.status !== 'extended')) return false;
    if (filter === 'overdue' && !isOverdue(o)) return false;
    if (dateFrom) {
      const issued = o.issued_date?.slice(0, 10);
      if (issued && issued < dateFrom) return false;
    }
    if (dateTo) {
      const issued = o.issued_date?.slice(0, 10);
      if (issued && issued > dateTo) return false;
    }
    return true;
  });

  const countByFilter = (f: FilterType) => {
    if (f === 'all') return orders.length;
    if (f === 'completed') return orders.filter(o => o.status === 'completed').length;
    if (f === 'new') return orders.filter(o => o.status === 'new' || o.status === 'extended').length;
    if (f === 'overdue') return orders.filter(isOverdue).length;
    return 0;
  };

  const initials = fio.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Шапка */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate(backUrl)} variant="outline"
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
            <Icon name="ArrowLeft" size={18} className="mr-2" />Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {initials || <Icon name="User" size={24} />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{fio || 'Специалист'}</h1>
              <p className="text-slate-400 text-sm">Поручения отдела ОТиПБ</p>
            </div>
          </div>
        </div>

        {/* Карточки-счётчики */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {([
            { f: 'all' as FilterType, label: 'Всего', color: 'bg-slate-700/40 border-slate-600/30', textColor: 'text-white', icon: 'List' },
            { f: 'new' as FilterType, label: 'В работе', color: 'bg-blue-900/20 border-blue-600/30', textColor: 'text-blue-400', icon: 'Clock' },
            { f: 'completed' as FilterType, label: 'Выполнено', color: 'bg-green-900/20 border-green-600/30', textColor: 'text-green-400', icon: 'CheckCircle2' },
            { f: 'overdue' as FilterType, label: 'Просрочено', color: 'bg-red-900/20 border-red-600/30', textColor: 'text-red-400', icon: 'AlertTriangle' },
          ]).map(({ f, label, color, textColor, icon }) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl p-4 border text-left transition-all hover:scale-105 ${color} ${filter === f ? 'ring-2 ring-orange-500' : ''}`}
            >
              <div className={`text-2xl font-bold ${textColor}`}>{countByFilter(f)}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <Icon name={icon as 'List'} size={12} className={textColor} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Фильтр по периоду */}
        <Card className="bg-slate-800/50 border-slate-600/40 p-4 mb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Период с</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">по</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-1.5 text-sm" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-slate-400 hover:text-white">
                <Icon name="X" size={14} className="mr-1" />Сбросить
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {(['all', 'new', 'completed', 'overdue'] as FilterType[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}>
                  {{ all: 'Все', new: 'В работе', completed: 'Выполнено', overdue: 'Просроченные' }[f]}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Список поручений */}
        <Card className="bg-slate-800/50 border-slate-600/40 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Icon name="ClipboardList" size={18} className="text-orange-400" />
              Поручения ({filtered.length})
            </h2>
            {canManage && filtered.length > 0 && (
              <div className="flex gap-2">
                {!confirmClear ? (
                  <Button size="sm" variant="outline"
                    onClick={() => setConfirmClear(true)}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs">
                    <Icon name="Trash2" size={13} className="mr-1" />Очистить всё
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Удалить все {orders.length} поручений?</span>
                    <Button size="sm" onClick={clearAll} disabled={clearing}
                      className="bg-red-600 hover:bg-red-700 text-xs h-7">
                      {clearing ? <Icon name="Loader2" size={13} className="animate-spin" /> : 'Да, удалить'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}
                      className="text-slate-400 text-xs h-7">Отмена</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-3 text-orange-400" />
              Загрузка поручений...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic">
              <Icon name="ClipboardX" size={40} className="mx-auto mb-3 text-slate-600" />
              Поручений не найдено
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filtered.map((o) => {
                const overdue = isOverdue(o);
                const raw = o.extended_deadline || o.deadline;
                const deadlineDate = raw ? new Date(raw.slice(0, 10)).toLocaleDateString('ru-RU') : '—';
                const issuedDate = o.issued_date ? new Date(o.issued_date.slice(0, 10)).toLocaleDateString('ru-RU') : '—';

                return (
                  <div key={o.id} className={`p-4 flex items-start gap-3 hover:bg-slate-700/20 transition-colors ${overdue ? 'border-l-2 border-red-500' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1.5">
                        <p className="text-white font-medium text-sm leading-snug flex-1">{o.title}</p>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${overdue ? 'bg-red-900/30 text-red-300 border-red-500/40' : STATUS_COLORS[o.status]}`}>
                          {overdue ? 'Просрочено' : STATUS_LABELS[o.status] || o.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Icon name="Calendar" size={11} className="text-slate-500" />
                          Выдано: <b className="text-slate-300">{issuedDate}</b>
                        </span>
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                          <Icon name="Clock" size={11} className={overdue ? 'text-red-400' : 'text-slate-500'} />
                          Срок: <b className={overdue ? 'text-red-300' : 'text-slate-300'}>{deadlineDate}</b>
                          {o.extended_deadline && <span className="text-yellow-400">(продлён)</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="User" size={11} className="text-slate-500" />
                          Выдал: <b className="text-slate-300">{o.issued_by}</b>
                        </span>
                      </div>
                      {o.last_action && (
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <Icon name="CheckCircle" size={11} />
                          {o.last_action}
                        </p>
                      )}
                      {o.notes && (
                        <p className="text-xs text-slate-500 mt-1 italic">{o.notes}</p>
                      )}
                    </div>
                    {canManage && (
                      <Button size="sm" variant="ghost"
                        onClick={() => deleteOrder(o.id)}
                        disabled={deletingId === o.id}
                        className="shrink-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
                        {deletingId === o.id
                          ? <Icon name="Loader2" size={14} className="animate-spin" />
                          : <Icon name="Trash2" size={14} />}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OtipbSpecialistPage;