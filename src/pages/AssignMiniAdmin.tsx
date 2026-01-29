import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
}

interface User {
  id: number;
  fio: string;
  email: string;
  role: string;
  organization_id: number;
}

interface Permission {
  module: string;
  label: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const AssignMiniAdmin = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([
    { module: 'users_management', label: 'Управление пользователями', canView: false, canEdit: false, canDelete: false },
    { module: 'pab_registration', label: 'Регистрация ПАБ', canView: false, canEdit: false, canDelete: false },
    { module: 'production_control', label: 'Производственный контроль', canView: false, canEdit: false, canDelete: false },
    { module: 'prescriptions', label: 'Реестр предписаний', canView: false, canEdit: false, canDelete: false },
    { module: 'violations_stats', label: 'Статистика нарушений', canView: false, canEdit: false, canDelete: false },
    { module: 'orders', label: 'Журнал поручений', canView: false, canEdit: false, canDelete: false },
    { module: 'org_settings', label: 'Настройки предприятия', canView: false, canEdit: false, canDelete: false },
    { module: 'reports', label: 'Отчёты', canView: false, canEdit: false, canDelete: false },
  ]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'admin' && role !== 'superadmin') {
      navigate('/dashboard');
      return;
    }

    loadOrganizations();
  }, [navigate]);

  const loadOrganizations = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast.error('Ошибка загрузки предприятий');
    }
  };

  const loadUsers = async (orgId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://functions.poehali.dev/7f32d60e-dee5-4b28-901a-10984045d99e?organization_id=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        toast.error('Ошибка загрузки пользователей');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSelect = (orgId: number) => {
    setSelectedOrgId(orgId);
    setSelectedUserId(null);
    setSearchTerm('');
    loadUsers(orgId);
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    loadUserPermissions(userId);
  };

  const loadUserPermissions = async (userId: number) => {
    try {
      const response = await fetch(`https://functions.poehali.dev/3bdac2b0-aad0-492f-bee6-465d1a0f71fb?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.permissions) {
          setPermissions(prevPerms => 
            prevPerms.map(perm => {
              const userPerm = data.permissions.find((p: Permission) => p.module === perm.module);
              return userPerm ? { ...perm, ...userPerm } : perm;
            })
          );
        }
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const togglePermission = (module: string, type: 'canView' | 'canEdit' | 'canDelete') => {
    setPermissions(prev =>
      prev.map(p =>
        p.module === module ? { ...p, [type]: !p[type] } : p
      )
    );
  };

  const handleAssignMiniAdmin = async () => {
    if (!selectedUserId) {
      toast.error('Выберите пользователя');
      return;
    }

    const hasAnyPermission = permissions.some(p => p.canView || p.canEdit || p.canDelete);
    if (!hasAnyPermission) {
      toast.error('Назначьте хотя бы одно право доступа');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/3bdac2b0-aad0-492f-bee6-465d1a0f71fb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          organization_id: selectedOrgId,
          permissions: permissions,
          assigned_by: localStorage.getItem('userId')
        }),
      });

      if (response.ok) {
        toast.success('Минадминистратор успешно назначен!');
        setSelectedUserId(null);
        setPermissions(permissions.map(p => ({ ...p, canView: false, canEdit: false, canDelete: false })));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка назначения');
      }
    } catch (error) {
      console.error('Failed to assign miniadmin:', error);
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.fio || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (user.email || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="border-blue-600/50 text-blue-400">
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <h1 className="text-3xl font-bold text-white">Назначение минадминистратора</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Выбор предприятия */}
          <Card className="bg-slate-800/50 border-blue-600/30 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Icon name="Building2" size={24} className="text-blue-400" />
              Предприятие
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => handleOrgSelect(org.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedOrgId === org.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="font-semibold">{org.name}</div>
                  <div className="text-xs opacity-70">{org.registration_code}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Выбор пользователя */}
          <Card className="bg-slate-800/50 border-blue-600/30 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Icon name="Users" size={24} className="text-blue-400" />
              Пользователь
            </h2>
            {selectedOrgId ? (
              <>
                <Input
                  placeholder="Поиск по ФИО или Email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4 bg-slate-700/50 border-slate-600 text-white"
                />
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedUserId === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="font-semibold">{user.fio}</div>
                      <div className="text-xs opacity-70">{user.email}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {user.role === 'miniadmin' && (
                          <span className="bg-teal-600/30 text-teal-400 px-2 py-0.5 rounded">Минадмин</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-center py-8">
                Выберите предприятие
              </p>
            )}
          </Card>

          {/* Настройка прав */}
          <Card className="bg-slate-800/50 border-blue-600/30 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Icon name="ShieldCheck" size={24} className="text-blue-400" />
              Права доступа
            </h2>
            {selectedUserId ? (
              <>
                <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                  {permissions.map(perm => (
                    <div key={perm.module} className="bg-slate-700/30 p-3 rounded-lg">
                      <div className="font-semibold text-white mb-2">{perm.label}</div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <Checkbox
                            checked={perm.canView}
                            onCheckedChange={() => togglePermission(perm.module, 'canView')}
                          />
                          Просмотр
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <Checkbox
                            checked={perm.canEdit}
                            onCheckedChange={() => togglePermission(perm.module, 'canEdit')}
                          />
                          Редактирование
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <Checkbox
                            checked={perm.canDelete}
                            onCheckedChange={() => togglePermission(perm.module, 'canDelete')}
                          />
                          Удаление
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleAssignMiniAdmin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {loading ? (
                    <>
                      <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                      Назначение...
                    </>
                  ) : (
                    <>
                      <Icon name="UserCheck" size={20} className="mr-2" />
                      Назначить минадминистратором
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-slate-400 text-center py-8">
                Выберите пользователя
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssignMiniAdmin;