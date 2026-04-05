import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const OT_ORDERS_URL = 'https://functions.poehali.dev/64c3f34b-05da-451e-bd8e-fae26e931120';

interface Order {
  id: number;
  title: string;
  issued_date: string;
  deadline: string;
  responsible_person: string;
  issued_by: string;
  status: 'new' | 'completed' | 'extended';
  extended_deadline: string | null;
  organization_id: number | null;
  assigned_to_user_id: number | null;
  assigned_fio: string | null;
  notes: string | null;
}

interface Specialist {
  id: number;
  fio: string;
  position: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  completed: 'Выполнено',
  extended: 'Срок продлен',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  completed: 'bg-green-600/20 text-green-300 border-green-500/40',
  extended: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40',
};

const emptyForm = {
  title: '',
  issued_date: new Date().toISOString().slice(0, 10),
  deadline: '',
  responsible_person: '',
  issued_by: '',
  notes: '',
  assigned_to_user_id: '' as string | number,
};

const OtManagementPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Record<number, string>>({});
  const [editingExtDeadline, setEditingExtDeadline] = useState<Record<number, string>>({});
  const [transferTarget, setTransferTarget] = useState<Order | null>(null);
  const [transferUserId, setTransferUserId] = useState('');

  const orgId = localStorage.getItem('organizationId') || '';
  const userFio = localStorage.getItem('userFio') || '';

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/'); return; }
    if (role !== 'superadmin') {
      navigate(role === 'admin' ? '/admin' : role === 'user' ? '/dashboard' : '/');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = orgId ? `?organization_id=${orgId}` : '';
      const res = await fetch(`${OT_ORDERS_URL}${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setSpecialists(data.specialists);
        const statusMap: Record<number, string> = {};
        const extMap: Record<number, string> = {};
        data.orders.forEach((o: Order) => {
          statusMap[o.id] = o.status;
          extMap[o.id] = o.extended_deadline || '';
        });
        setEditingStatus(statusMap);
        setEditingExtDeadline(extMap);
      }
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.deadline || !form.responsible_person.trim() || !form.issued_by.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          organization_id: orgId ? Number(orgId) : null,
          created_by_user_id: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
          assigned_to_user_id: form.assigned_to_user_id ? Number(form.assigned_to_user_id) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Поручение создано');
        setShowForm(false);
        setForm({ ...emptyForm });
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка создания');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSave = async (order: Order) => {
    const status = editingStatus[order.id];
    const extDeadline = editingExtDeadline[order.id];
    if (status === 'extended' && !extDeadline) {
      toast.error('Укажите новый срок выполнения');
      return;
    }
    try {
      const res = await fetch(OT_ORDERS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status,
          extended_deadline: status === 'extended' ? extDeadline : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Статус обновлён');
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка обновления');
      }
    } catch {
      toast.error('Ошибка соединения');
    }
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferUserId) {
      toast.error('Выберите специалиста');
      return;
    }
    try {
      const spec = specialists.find(s => s.id === Number(transferUserId));
      const res = await fetch(OT_ORDERS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transferTarget.id,
          assigned_to_user_id: Number(transferUserId),
          responsible_person: spec?.fio || transferTarget.responsible_person,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Поручение передано');
        setTransferTarget(null);
        setTransferUserId('');
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch {
      toast.error('Ошибка соединения');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить поручение?')) return;
    try {
      const res = await fetch(`${OT_ORDERS_URL}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Поручение удалено');
        await loadData();
      }
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/superadmin')} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
          </Button>
          <Button onClick={() => { localStorage.clear(); navigate('/'); }} variant="outline"
            className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10">
            <Icon name="LogOut" size={20} className="mr-2" />Выход
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-br from-orange-600 to-red-700 p-3 rounded-xl shadow-lg">
            <Icon name="HardHat" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
            <p className="text-purple-400">Охрана труда и промышленная безопасность</p>
          </div>
        </div>

        {/* Интерактивный блок — счётчик поручений */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card
            onClick={() => setShowList(true)}
            className="bg-slate-800/50 border-orange-600/40 p-6 cursor-pointer hover:border-orange-500 hover:shadow-xl hover:scale-105 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Icon name="ClipboardList" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Поручений от начальника</p>
                <div className="text-4xl font-bold text-white">{loading ? '...' : orders.length}</div>
                <p className="text-orange-400 text-xs mt-1">Нажмите, чтобы открыть список</p>
              </div>
            </div>
            {!loading && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-1 text-xs text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Новые: {countByStatus('new')}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Выполнено: {countByStatus('completed')}
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  Продлено: {countByStatus('extended')}
                </div>
              </div>
            )}
          </Card>

          {/* Плейсхолдеры для будущих блоков */}
          <Card className="bg-slate-800/30 border-slate-700/40 p-6 border-dashed">
            <div className="flex items-center gap-4 opacity-40">
              <div className="bg-slate-700 p-4 rounded-xl"><Icon name="FileText" size={32} className="text-slate-400" /></div>
              <div>
                <p className="text-slate-400 text-sm">Раздел</p>
                <p className="text-slate-500 text-xs mt-1">Скоро будет настроен</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/40 p-6 border-dashed">
            <div className="flex items-center gap-4 opacity-40">
              <div className="bg-slate-700 p-4 rounded-xl"><Icon name="FileText" size={32} className="text-slate-400" /></div>
              <div>
                <p className="text-slate-400 text-sm">Раздел</p>
                <p className="text-slate-500 text-xs mt-1">Скоро будет настроен</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Список поручений */}
        {showList && (
          <Card className="bg-slate-800/50 border-purple-600/30 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="ClipboardList" size={22} className="text-orange-400" />
                Список поручений начальника ОТиПБ
              </h2>
              <div className="flex gap-2">
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio }); }}
                  className="bg-orange-600 hover:bg-orange-700">
                  <Icon name="Plus" size={18} className="mr-2" />Новое поручение
                </Button>
                <Button variant="ghost" onClick={() => setShowList(false)} className="text-gray-400">
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Icon name="Loader2" size={40} className="text-purple-400 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="ClipboardList" size={56} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Поручений пока нет</p>
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm, issued_by: userFio }); }}
                  className="mt-4 bg-orange-600 hover:bg-orange-700">
                  Создать первое поручение
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="text-left py-3 px-3 font-medium">Наименование поручения</th>
                      <th className="text-left py-3 px-3 font-medium">Дата выдачи</th>
                      <th className="text-left py-3 px-3 font-medium">Срок выполнения</th>
                      <th className="text-left py-3 px-3 font-medium">Ответственный</th>
                      <th className="text-left py-3 px-3 font-medium">Выдал поручение</th>
                      <th className="text-left py-3 px-3 font-medium">Статус выполнения</th>
                      <th className="text-left py-3 px-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-3 text-white font-medium max-w-[220px]">
                          <div className="break-words">{order.title}</div>
                          {order.notes && <div className="text-xs text-gray-400 mt-1">{order.notes}</div>}
                        </td>
                        <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                          {order.issued_date ? new Date(order.issued_date).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : '—'}
                          {order.extended_deadline && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Продлён до: {new Date(order.extended_deadline).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {order.responsible_person}
                          {order.assigned_fio && order.assigned_fio !== order.responsible_person && (
                            <div className="text-xs text-purple-400 mt-1">{order.assigned_fio}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-300">{order.issued_by}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-2">
                            <select
                              value={editingStatus[order.id] || order.status}
                              onChange={e => setEditingStatus(prev => ({ ...prev, [order.id]: e.target.value }))}
                              className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1"
                            >
                              <option value="new">Новое</option>
                              <option value="completed">Выполнено</option>
                              <option value="extended">Срок продлен</option>
                            </select>
                            {editingStatus[order.id] === 'extended' && (
                              <Input
                                type="date"
                                value={editingExtDeadline[order.id] || ''}
                                onChange={e => setEditingExtDeadline(prev => ({ ...prev, [order.id]: e.target.value }))}
                                className="bg-slate-700 border-slate-600 text-white text-xs h-7 px-2"
                              />
                            )}
                            <Button size="sm" onClick={() => handleStatusSave(order)}
                              className="bg-green-700 hover:bg-green-600 h-6 text-xs px-2">
                              Сохранить
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => { setTransferTarget(order); setTransferUserId(''); }}
                              className="bg-blue-600 hover:bg-blue-700 h-7 text-xs whitespace-nowrap">
                              <Icon name="Send" size={12} className="mr-1" />Передать
                            </Button>
                            <Button size="sm" onClick={() => handleDelete(order.id)}
                              className="bg-red-700 hover:bg-red-600 h-7 text-xs">
                              <Icon name="Trash2" size={12} className="mr-1" />Удалить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Модальное окно: создание поручения */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-orange-600/30 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Новое поручение</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <Icon name="X" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label className="text-white mb-1 block">Наименование поручения <span className="text-red-400">*</span></Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="Описание поручения" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white mb-1 block">Дата выдачи</Label>
                  <Input type="date" value={form.issued_date} onChange={e => setForm({ ...form, issued_date: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white" />
                </div>
                <div>
                  <Label className="text-white mb-1 block">Срок выполнения <span className="text-red-400">*</span></Label>
                  <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white" />
                </div>
              </div>
              <div>
                <Label className="text-white mb-1 block">Ответственный <span className="text-red-400">*</span></Label>
                <Input value={form.responsible_person} onChange={e => setForm({ ...form, responsible_person: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="ФИО ответственного" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Выдал поручение <span className="text-red-400">*</span></Label>
                <Input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="ФИО начальника ОТиПБ" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Назначить специалисту</Label>
                <select value={form.assigned_to_user_id} onChange={e => setForm({ ...form, assigned_to_user_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white text-sm">
                  <option value="">— Не назначать —</option>
                  {specialists.map(s => (
                    <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white mb-1 block">Примечание</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white" placeholder="Дополнительная информация" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleCreate} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {saving ? <><Icon name="Loader2" size={18} className="mr-2 animate-spin" />Сохранение...</> : <><Icon name="Save" size={18} className="mr-2" />Создать поручение</>}
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="border-slate-600 text-gray-300">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: передача поручения */}
      {transferTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-blue-600/30 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Передать поручение</h2>
              <button onClick={() => setTransferTarget(null)} className="text-gray-400 hover:text-white">
                <Icon name="X" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-300 text-sm">
                <span className="text-white font-semibold">Поручение:</span> {transferTarget.title}
              </p>
              <div>
                <Label className="text-white mb-1 block">Выберите ведущего специалиста отдела</Label>
                <select value={transferUserId} onChange={e => setTransferUserId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white text-sm">
                  <option value="">— Выберите специалиста —</option>
                  {specialists.map(s => (
                    <option key={s.id} value={s.id}>{s.fio}{s.position ? ` (${s.position})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleTransfer} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Icon name="Send" size={18} className="mr-2" />Передать
              </Button>
              <Button onClick={() => setTransferTarget(null)} variant="outline" className="border-slate-600 text-gray-300">Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OtManagementPage;
