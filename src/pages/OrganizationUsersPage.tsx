import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import BlockUserDialog from '@/components/BlockUserDialog';
import { apiFetch } from '@/lib/api';

interface User {
  id: number;
  email: string;
  fio: string;
  subdivision: string;
  position: string;
  role: string;
  created_at: string;
  records_count: number;
  activities_last_month: number;
  last_activity: string | null;
}

interface Organization {
  id: number;
  name: string;
}

interface EditForm {
  fio: string;
  email: string;
  subdivision: string;
  position: string;
  role: string;
  password: string;
  passwordConfirm: string;
}

const ORG_USERS_URL = 'https://functions.poehali.dev/bceeaee7-5cfa-418c-9c0d-0a61668ab1a4';
const ORG_URL = 'https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b';

const OrganizationUsersPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'activity' | 'records'>('name');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Редактирование
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ fio: '', email: '', subdivision: '', position: '', role: 'user', password: '', passwordConfirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/'); return; }
    if (role !== 'superadmin') {
      navigate(role === 'admin' ? '/admin' : role === 'user' ? '/dashboard' : '/');
      return;
    }
    loadData();
  }, [navigate, id]);

  const loadData = async () => {
    try {
      const [usersRes, orgRes] = await Promise.all([
        apiFetch(`${ORG_USERS_URL}?organization_id=${id}`),
        apiFetch(`${ORG_URL}?id=${id}`)
      ]);
      setUsers(await usersRes.json());
      setOrganization(await orgRes.json());
    } catch (e) {
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ fio: user.fio, email: user.email, subdivision: user.subdivision || '', position: user.position || '', role: user.role, password: '', passwordConfirm: '' });
  };

  const handleSave = async () => {
    if (!editUser) return;
    if (!editForm.fio.trim() || !editForm.email.trim()) {
      toast.error('ФИО и email обязательны'); return;
    }
    if (editForm.password && editForm.password !== editForm.passwordConfirm) {
      toast.error('Пароли не совпадают'); return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов'); return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(ORG_USERS_URL, {
        method: 'PUT',
        body: JSON.stringify({
          id: editUser.id,
          fio: editForm.fio,
          email: editForm.email,
          subdivision: editForm.subdivision,
          position: editForm.position,
          role: editForm.role,
          ...(editForm.password ? { password: editForm.password } : {})
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Данные пользователя обновлены');
        setEditUser(null);
        await loadData();
      } else {
        toast.error(data.error || 'Ошибка сохранения');
      }
    } catch (e) {
      toast.error('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const getSortedUsers = () => {
    const sorted = [...users];
    switch (sortBy) {
      case 'name': return sorted.sort((a, b) => a.fio.localeCompare(b.fio));
      case 'activity': return sorted.sort((a, b) => b.activities_last_month - a.activities_last_month);
      case 'records': return sorted.sort((a, b) => b.records_count - a.records_count);
      default: return sorted;
    }
  };

  const getActivityColor = (count: number) => {
    if (count >= 20) return 'from-green-600/30 to-emerald-600/30 border-green-500';
    if (count >= 10) return 'from-blue-600/30 to-indigo-600/30 border-blue-500';
    if (count >= 5) return 'from-yellow-600/30 to-orange-600/30 border-yellow-500';
    return 'from-red-600/30 to-pink-600/30 border-red-500';
  };

  const getActivityLevel = (count: number) => {
    if (count >= 20) return 'Очень активен';
    if (count >= 10) return 'Активен';
    if (count >= 5) return 'Средняя активность';
    return 'Низкая активность';
  };

  const totalStats = users.reduce((acc, u) => ({ records: acc.records + u.records_count, activities: acc.activities + u.activities_last_month }), { records: 0, activities: 0 });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Предприятие не найдено</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/organizations-management')} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />Назад
          </Button>
          <Button onClick={() => { localStorage.clear(); navigate('/'); }} variant="outline" className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10">
            <Icon name="LogOut" size={20} className="mr-2" />Выход
          </Button>
        </div>
        <div className="mt-8 flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-xl shadow-lg">
            <Icon name="Users" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{organization.name}</h1>
            <p className="text-purple-400">Пользователи и активность</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: 'Users', color: 'text-blue-400', label: 'Пользователей', value: users.length },
            { icon: 'FileText', color: 'text-green-400', label: 'Всего записей', value: totalStats.records },
            { icon: 'Activity', color: 'text-purple-400', label: 'Активность (30 дн)', value: totalStats.activities },
            { icon: 'TrendingUp', color: 'text-orange-400', label: 'Среднее на юзера', value: users.length > 0 ? Math.round(totalStats.activities / users.length) : 0 }
          ].map(s => (
            <Card key={s.label} className="bg-slate-800/50 border-purple-600/30 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name={s.icon} size={24} className={s.color} />
                <span className="text-gray-400">{s.label}</span>
              </div>
              <div className="text-3xl font-bold text-white">{s.value}</div>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-purple-600/30 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Список пользователей</h3>
            <div className="flex gap-2">
              {(['name', 'activity', 'records'] as const).map(s => (
                <Button key={s} size="sm" variant={sortBy === s ? 'default' : 'outline'}
                  onClick={() => setSortBy(s)}
                  className={sortBy === s ? '' : 'border-purple-600/50 text-purple-400'}>
                  {s === 'name' ? 'По имени' : s === 'activity' ? 'По активности' : 'По записям'}
                </Button>
              ))}
            </div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="UserX" size={64} className="mx-auto text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Нет пользователей</h3>
              <p className="text-gray-400">В этом предприятии пока нет зарегистрированных пользователей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getSortedUsers().map(user => (
                <div key={user.id} className={`p-4 rounded-lg border bg-gradient-to-br ${getActivityColor(user.activities_last_month)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-white">{user.fio}</h4>
                        <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs">{user.role}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-300 mb-3">
                        <div><Icon name="Mail" size={14} className="inline mr-1 text-gray-400" />{user.email}</div>
                        {user.subdivision && <div><Icon name="Building" size={14} className="inline mr-1 text-gray-400" />{user.subdivision}</div>}
                        {user.position && <div><Icon name="Briefcase" size={14} className="inline mr-1 text-gray-400" />{user.position}</div>}
                        <div><Icon name="Calendar" size={14} className="inline mr-1 text-gray-400" />Рег: {new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
                      </div>
                      <div className="flex gap-4">
                        <div className="bg-slate-800/50 px-3 py-2 rounded">
                          <div className="text-xs text-gray-400 mb-1">Записей ПАБ</div>
                          <div className="text-xl font-bold text-white">{user.records_count}</div>
                        </div>
                        <div className="bg-slate-800/50 px-3 py-2 rounded">
                          <div className="text-xs text-gray-400 mb-1">Активность (30 дн)</div>
                          <div className="text-xl font-bold text-white">{user.activities_last_month}</div>
                        </div>
                        <div className="bg-slate-800/50 px-3 py-2 rounded">
                          <div className="text-xs text-gray-400 mb-1">Статус</div>
                          <div className="text-sm font-semibold text-white">{getActivityLevel(user.activities_last_month)}</div>
                        </div>
                        {user.last_activity && (
                          <div className="bg-slate-800/50 px-3 py-2 rounded">
                            <div className="text-xs text-gray-400 mb-1">Последняя активность</div>
                            <div className="text-sm font-semibold text-white">{new Date(user.last_activity).toLocaleDateString('ru-RU')}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button onClick={() => openEdit(user)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Icon name="Pencil" size={16} className="mr-1" />Редактировать
                      </Button>
                      <Button onClick={() => { setSelectedUser(user); setBlockDialogOpen(true); }} size="sm" className="bg-red-600 hover:bg-red-700">
                        <Icon name="Ban" size={16} className="mr-1" />Заблокировать
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Модальное окно редактирования */}
      {editUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-600/30 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white">Редактирование пользователя</h2>
                <p className="text-sm text-gray-400 mt-1">ID #{editUser.id}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-white">
                <Icon name="X" size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label className="text-white mb-1 block">ФИО <span className="text-red-400">*</span></Label>
                <Input value={editForm.fio} onChange={e => setEditForm({ ...editForm, fio: e.target.value })}
                  className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Иванов Иван Иванович" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Email <span className="text-red-400">*</span></Label>
                <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="user@example.com" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Подразделение</Label>
                <Input value={editForm.subdivision} onChange={e => setEditForm({ ...editForm, subdivision: e.target.value })}
                  className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Цех №1" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Должность</Label>
                <Input value={editForm.position} onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                  className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Инженер" />
              </div>
              <div>
                <Label className="text-white mb-1 block">Роль</Label>
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-purple-600/30 text-white text-sm">
                  <option value="user">Пользователь</option>
                  <option value="miniadmin">Мини-администратор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm text-gray-400 mb-3">Оставьте пустым, если не хотите менять пароль</p>
                <div>
                  <Label className="text-white mb-1 block">Новый пароль</Label>
                  <Input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                    className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Минимум 6 символов" />
                </div>
                <div className="mt-3">
                  <Label className="text-white mb-1 block">Повторите пароль</Label>
                  <Input type="password" value={editForm.passwordConfirm} onChange={e => setEditForm({ ...editForm, passwordConfirm: e.target.value })}
                    className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Повторите пароль" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? <><Icon name="Loader2" size={18} className="mr-2 animate-spin" />Сохранение...</> : <><Icon name="Save" size={18} className="mr-2" />Сохранить изменения</>}
              </Button>
              <Button onClick={() => setEditUser(null)} variant="outline" className="border-slate-600 text-gray-300">
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <BlockUserDialog user={selectedUser} isOpen={blockDialogOpen}
          onClose={() => { setBlockDialogOpen(false); setSelectedUser(null); }}
          onSuccess={loadData} />
      )}
    </div>
  );
};

export default OrganizationUsersPage;