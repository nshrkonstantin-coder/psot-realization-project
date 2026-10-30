import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

type Filter = 'all' | 'work' | 'overdue' | 'completed';

interface Order {
  id: number;
  title: string;
  issued_date: string;
  deadline: string;
  extended_deadline?: string | null;
  responsible_person: string;
  issued_by: string;
  status: 'new' | 'completed' | 'extended';
  notes?: string | null;
}

interface Specialist {
  id: number;
  fio: string;
}

const toDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const fmt = (s?: string | null) => (s ? toDay(s).toLocaleDateString('ru-RU') : '—');

const effectiveDeadline = (o: Order) => (o.status === 'extended' && o.extended_deadline ? o.extended_deadline : o.deadline);

const isOverdue = (o: Order) => {
  if (o.status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toDay(effectiveDeadline(o)) < today;
};

const daysLeft = (o: Order) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((toDay(effectiveDeadline(o)).getTime() - today.getTime()) / 86400000);
};

const statusView = (o: Order) => {
  if (o.status === 'completed') return { label: 'Выполнено', cls: 'bg-green-500/15 text-green-400 border-green-500/30' };
  if (isOverdue(o)) return { label: 'Просрочено', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
  if (o.status === 'extended') return { label: 'Срок продлён', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  return { label: 'В работе', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
};

const emptyForm = { title: '', responsible: '', deadline: '', notes: '' };

const OrdersJournalPage = () => {
  const navigate = useNavigate();
  const isDemo = localStorage.getItem('userRole') === 'demo';
  const userFio = localStorage.getItem('userFio') || '';
  const userId = localStorage.getItem('userId');
  const orgId = localStorage.getItem('organizationId');

  const [orders, setOrders] = useState<Order[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const url = orgId ? `${ORDERS_URL}?organization_id=${orgId}` : ORDERS_URL;
      const response = await apiFetch(url);
      const data = await response.json();
      setOrders(data.orders || []);
      setSpecialists(data.specialists || []);
    } catch {
      toast.error('Не удалось загрузить журнал поручений');
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(
    () => ({
      all: orders.length,
      work: orders.filter(o => o.status !== 'completed' && !isOverdue(o)).length,
      overdue: orders.filter(isOverdue).length,
      completed: orders.filter(o => o.status === 'completed').length,
    }),
    [orders]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter(o => {
        if (filter === 'work' && (o.status === 'completed' || isOverdue(o))) return false;
        if (filter === 'overdue' && !isOverdue(o)) return false;
        if (filter === 'completed' && o.status !== 'completed') return false;
        if (q && !`${o.title} ${o.responsible_person} ${o.issued_by}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const ca = a.status === 'completed' ? 1 : 0;
        const cb = b.status === 'completed' ? 1 : 0;
        if (ca !== cb) return ca - cb;
        return toDay(effectiveDeadline(a)).getTime() - toDay(effectiveDeadline(b)).getTime();
      });
  }, [orders, filter, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.responsible.trim() || !form.deadline) {
      toast.error('Заполните поручение, ответственного и срок');
      return;
    }
    setSaving(true);
    try {
      if (isDemo) {
        const demoOrder: Order = {
          id: -Date.now(),
          title: form.title.trim(),
          issued_date: new Date().toISOString().slice(0, 10),
          deadline: form.deadline,
          responsible_person: form.responsible.trim(),
          issued_by: userFio || 'Демо Пользователь',
          status: 'new',
          notes: form.notes.trim() || null,
        };
        setOrders(prev => [demoOrder, ...prev]);
        toast.success('Поручение добавлено (в демо-версии не сохраняется после обновления страницы)');
      } else {
        const response = await apiFetch(ORDERS_URL, {
          method: 'POST',
          body: JSON.stringify({
            title: form.title,
            deadline: form.deadline,
            responsible_person: form.responsible,
            issued_by: userFio,
            organization_id: orgId ? Number(orgId) : undefined,
            created_by_user_id: userId ? Number(userId) : undefined,
            notes: form.notes,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          toast.error(data.error || 'Не удалось создать поручение');
          return;
        }
        toast.success('Поручение создано');
        load();
      }
      setForm(emptyForm);
      setOpen(false);
    } catch {
      toast.error('Не удалось создать поручение');
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = async (order: Order) => {
    if (isDemo || order.id < 0) {
      setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, status: 'completed' } : o)));
      toast.success('Поручение отмечено выполненным');
      return;
    }
    try {
      const response = await apiFetch(ORDERS_URL, {
        method: 'PUT',
        body: JSON.stringify({ id: order.id, status: 'completed' }),
      });
      if (!response.ok) throw new Error();
      toast.success('Поручение отмечено выполненным');
      load();
    } catch {
      toast.error('Не удалось обновить статус');
    }
  };

  const filters: { key: Filter; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'Всего', icon: 'ListChecks', color: 'from-slate-500 to-slate-600' },
    { key: 'work', label: 'В работе', icon: 'Clock', color: 'from-blue-500 to-blue-600' },
    { key: 'overdue', label: 'Просрочено', icon: 'AlertTriangle', color: 'from-red-500 to-red-600' },
    { key: 'completed', label: 'Выполнено', icon: 'CheckCircle2', color: 'from-green-500 to-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 md:px-6 pt-20 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-yellow-600/50 text-yellow-500 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-400"
            >
              <Icon name="ArrowLeft" size={18} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl shadow-lg">
                <Icon name="BookOpen" size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Журнал поручений</h1>
                <p className="text-slate-400 text-sm">Сроки, статусы и ответственные</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold">
            <Icon name="Plus" size={18} className="mr-2" />
            Новое поручение
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-left rounded-2xl p-4 border transition-all ${
                filter === f.key ? 'border-yellow-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50 hover:border-yellow-600/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-white">{counts[f.key]}</div>
                  <div className="text-sm text-slate-400">{f.label}</div>
                </div>
                <div className={`bg-gradient-to-br ${f.color} p-3 rounded-xl`}>
                  <Icon name={f.icon} size={22} className="text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по поручению или ответственному"
            className="pl-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Icon name="Loader2" size={40} className="animate-spin text-yellow-500" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Icon name="FileX" size={44} className="mx-auto mb-3 opacity-60" />
              Поручений не найдено
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900/70 text-slate-300 text-left">
                    <th className="p-3 font-semibold">Поручение</th>
                    <th className="p-3 font-semibold">Ответственный</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Выдано</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Срок</th>
                    <th className="p-3 font-semibold">Статус</th>
                    <th className="p-3 font-semibold text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(o => {
                    const sv = statusView(o);
                    const left = daysLeft(o);
                    return (
                      <tr key={o.id} className="border-t border-slate-700/70 hover:bg-slate-700/20 align-top">
                        <td className="p-3 max-w-md">
                          <div className="text-white font-medium">{o.title}</div>
                          {o.notes && <div className="text-xs text-slate-400 mt-1">{o.notes}</div>}
                          <div className="text-xs text-slate-500 mt-1">Выдал: {o.issued_by}</div>
                        </td>
                        <td className="p-3 text-slate-200">{o.responsible_person}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">{fmt(o.issued_date)}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-slate-200">{fmt(effectiveDeadline(o))}</div>
                          {o.status === 'extended' && o.extended_deadline && (
                            <div className="text-xs text-slate-500">было {fmt(o.deadline)}</div>
                          )}
                          {o.status !== 'completed' && (
                            <div className={`text-xs ${left < 0 ? 'text-red-400' : left <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                              {left < 0 ? `просрочено на ${-left} дн.` : left === 0 ? 'сегодня' : `осталось ${left} дн.`}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${sv.cls}`}>{sv.label}</span>
                        </td>
                        <td className="p-3 text-right">
                          {o.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markCompleted(o)}
                              className="border-green-500/40 text-green-400 bg-transparent hover:bg-green-500/10 hover:text-green-300"
                            >
                              <Icon name="Check" size={16} className="mr-1" />
                              Выполнено
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">Показано: {visible.length} из {orders.length}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новое поручение</DialogTitle>
            <DialogDescription>Опишите задачу, назначьте ответственного и срок исполнения.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ord-title">Поручение *</Label>
              <Textarea
                id="ord-title"
                rows={3}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Что нужно сделать"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ord-resp">Ответственный *</Label>
                <Input
                  id="ord-resp"
                  list="ord-specialists"
                  value={form.responsible}
                  onChange={e => setForm({ ...form, responsible: e.target.value })}
                  placeholder="ФИО"
                />
                <datalist id="ord-specialists">
                  {specialists.map(s => (
                    <option key={s.id} value={s.fio} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-deadline">Срок исполнения *</Label>
                <Input
                  id="ord-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ord-notes">Примечание</Label>
              <Input
                id="ord-notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Необязательно"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                  Сохраняем...
                </>
              ) : (
                'Создать поручение'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersJournalPage;
