import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { UsersStatsCards } from '@/components/users/UsersStatsCards';
import { UsersTableHeader } from '@/components/users/UsersTableHeader';
import { UserTableRow } from '@/components/users/UserTableRow';
import { UserEditDialogs } from '@/components/users/UserEditDialogs';

interface User {
  id: number;
  email: string;
  fio: string;
  display_name?: string;
  company: string;
  subdivision: string;
  position: string;
  role: string;
  created_at: string;
  stats: {
    registered_count: number;
    online_count: number;
    offline_count: number;
  };
}

const UsersManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ total_users: 0, users_count: 0, admins_count: 0, superadmins_count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editCredentials, setEditCredentials] = useState<{ id: number; email: string; newEmail: string; newPassword: string } | null>(null);
  const [userRole, setUserRole] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'admin' && role !== 'superadmin') {
      if (role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      return;
    }
    
    setUserRole(role || '');
    setIsSuperAdmin(role === 'superadmin');
    loadUsers();
    loadStats();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      const role = localStorage.getItem('userRole');
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=list', {
        headers: {
          'X-User-Role': role || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки пользователей', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role: newRole }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Роль обновлена' });
        loadUsers();
        loadStats();
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления роли', variant: 'destructive' });
    }
  };

  const handleUpdateProfile = async () => {
    if (!editUser) return;

    const oldCompany = users.find(u => u.id === editUser.id)?.company;

    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          userId: editUser.id,
          fio: editUser.fio,
          company: editUser.company,
          subdivision: editUser.subdivision,
          position: editUser.position,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Профиль обновлён' });
        await loadUsers();
        
        // Если компания изменилась, перемещаем пользователя в новую компанию
        if (oldCompany !== editUser.company) {
          setSearchQuery(editUser.company);
        }
        
        setEditUser(null);
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления профиля', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Пользователь удалён' });
        loadUsers();
        loadStats();
      }
    } catch (error) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  const handleLoginAs = (userId: number, targetRole: string) => {
    const currentUserId = localStorage.getItem('userId');
    const currentUserRole = localStorage.getItem('userRole');
    const currentUserEmail = localStorage.getItem('userEmail');
    const currentPath = window.location.pathname;

    localStorage.setItem('impersonation_original_user_id', currentUserId || '');
    localStorage.setItem('impersonation_original_user_role', currentUserRole || '');
    localStorage.setItem('impersonation_original_user_email', currentUserEmail || '');
    localStorage.setItem('impersonation_return_path', currentPath);

    localStorage.setItem('userId', String(userId));
    localStorage.setItem('userRole', targetRole);
    localStorage.setItem('isImpersonating', 'true');

    if (targetRole === 'superadmin') {
      navigate('/superadmin');
    } else if (targetRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }

    toast({ title: 'Вход выполнен', description: 'Вы вошли в личный кабинет пользователя' });
  };

  const handleChangeCredentials = async () => {
    if (!editCredentials) return;

    try {
      if (editCredentials.newEmail && editCredentials.newEmail !== editCredentials.email) {
        const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_email',
            userId: editCredentials.id,
            newEmail: editCredentials.newEmail,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
          return;
        }
      }

      if (editCredentials.newPassword) {
        const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_password',
            userId: editCredentials.id,
            newPassword: editCredentials.newPassword,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          toast({ title: 'Ошибка изменения пароля', variant: 'destructive' });
          return;
        }
      }

      toast({ title: 'Данные обновлены' });
      loadUsers();
      setEditCredentials(null);
    } catch (error) {
      toast({ title: 'Ошибка обновления данных', variant: 'destructive' });
    }
  };

  const handleExportDecryption = () => {
    const csvContent = [
      ['ID№', 'Фамилия', 'Имя', 'Отчество', 'Email', 'Компания', 'Подразделение', 'Должность', 'Роль', 'Дата регистрации'],
      ...users.map(user => {
        const fio_parts = user.fio.split(' ');
        return [
          user.display_name || `ID№${String(user.id).padStart(5, '0')}`,
          fio_parts[0] || '',
          fio_parts[1] || '',
          fio_parts[2] || '',
          user.email,
          user.company || '',
          user.subdivision || '',
          user.position || '',
          getRoleLabel(user.role),
          new Date(user.created_at).toLocaleDateString('ru-RU')
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Расшифровка_ID_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'Файл экспортирован', description: 'Расшифровка ID успешно сохранена' });
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.fio || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-600 text-white';
      case 'admin':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Суперадмин';
      case 'admin':
        return 'Администратор';
      default:
        return 'Пользователь';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-yellow-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-full mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
              <Icon name="Users" size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Управление пользователями</h1>
          </div>
          <Button
            onClick={() => {
              if (isSuperAdmin) {
                navigate('/superadmin');
              } else {
                navigate('/admin');
              }
            }}
            variant="outline"
            className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
        </div>

        <UsersStatsCards stats={stats} />

        <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
          <UsersTableHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onExport={handleExportDecryption}
            isSuperAdmin={isSuperAdmin}
          />

          <div className="w-full">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[6%]">ID</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[12%]">ФИО</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[12%]">Email</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[12%]">Компания</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[11%]">Подразделение</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[11%]">Должность</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[8%]">Роль</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[9%]">Дата регистрации</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[9%]">Статистика</th>
                  <th className="px-2 py-3 text-left text-slate-300 font-semibold w-[10%]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    isSuperAdmin={isSuperAdmin}
                    onUpdateRole={handleUpdateRole}
                    onEditProfile={setEditUser}
                    onEditCredentials={(user) =>
                      setEditCredentials({
                        id: user.id,
                        email: user.email,
                        newEmail: '',
                        newPassword: '',
                      })
                    }
                    onDelete={handleDeleteUser}
                    onLoginAs={handleLoginAs}
                    getRoleBadgeColor={getRoleBadgeColor}
                    getRoleLabel={getRoleLabel}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Icon name="Users" size={64} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Пользователи не найдены</p>
            </div>
          )}
        </Card>
      </div>

      <UserEditDialogs
        editUser={editUser}
        editCredentials={editCredentials}
        onEditUserChange={setEditUser}
        onEditCredentialsChange={setEditCredentials}
        onUpdateProfile={handleUpdateProfile}
        onChangeCredentials={handleChangeCredentials}
      />
    </div>
  );
};

export default UsersManagement;