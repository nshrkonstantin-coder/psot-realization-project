import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { TechnicalSupport } from '@/components/TechnicalSupport';
import OrganizationLogo from '@/components/OrganizationLogo';

interface Permission {
  module: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const OrgMiniAdmin = () => {
  const navigate = useNavigate();
  const [userFio, setUserFio] = useState('');
  const [userCompany, setUserCompany] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'miniadmin') {
      navigate('/dashboard');
      return;
    }
    
    setUserFio(localStorage.getItem('userFio') || '');
    setUserCompany(localStorage.getItem('userCompany') || '');
    
    loadPermissions();
  }, [navigate]);

  const loadPermissions = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/3bdac2b0-aad0-492f-bee6-465d1a0f71fb?user_id=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const hasPermission = (module: string) => {
    const perm = permissions.find(p => p.module === module);
    return perm && (perm.canView || perm.canEdit || perm.canDelete);
  };

  const availableModules = [
    { 
      label: 'Управление пользователями', 
      icon: 'Users', 
      color: 'from-blue-500 to-blue-600', 
      route: '/miniadmin/users',
      module: 'users_management'
    },
    { 
      label: 'Регистрация ПАБ', 
      icon: 'FileText', 
      color: 'from-red-500 to-red-600', 
      route: '/miniadmin/pab',
      module: 'pab_registration'
    },
    { 
      label: 'Производственный контроль', 
      icon: 'Shield', 
      color: 'from-red-600 to-red-700', 
      route: '/miniadmin/production-control',
      module: 'production_control'
    },
    { 
      label: 'Реестр предписаний', 
      icon: 'ClipboardList', 
      color: 'from-blue-600 to-cyan-600', 
      route: '/miniadmin/prescriptions',
      module: 'prescriptions'
    },
    { 
      label: 'Статистика нарушений', 
      icon: 'BarChart3', 
      color: 'from-cyan-500 to-cyan-600', 
      route: '/miniadmin/violations-stats',
      module: 'violations_stats'
    },
    { 
      label: 'Журнал поручений', 
      icon: 'BookOpen', 
      color: 'from-orange-500 to-orange-600', 
      route: '/miniadmin/orders',
      module: 'orders'
    },
    { 
      label: 'Настройки предприятия', 
      icon: 'Settings', 
      color: 'from-slate-500 to-slate-600', 
      route: '/miniadmin/org-settings',
      module: 'org_settings'
    },
    { 
      label: 'Отчёты', 
      icon: 'FileBarChart', 
      color: 'from-green-500 to-green-600', 
      route: '/miniadmin/reports',
      module: 'reports'
    },
  ];

  const accessibleModules = availableModules.filter(module => 
    hasPermission(module.module)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">
          <Icon name="Loader2" size={40} className="animate-spin mx-auto mb-4" />
          Загрузка прав доступа...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={true} />
            <div>
              <Icon name="UserCog" size={24} className="text-teal-400 inline mr-2" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Панель минадминистратора</h1>
              {userCompany && (
                <p className="text-teal-400 font-semibold text-lg">{userCompany}</p>
              )}
              <p className="text-cyan-400">{userFio}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <TechnicalSupport />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-teal-600/50 text-teal-400 hover:bg-teal-600/10"
            >
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {accessibleModules.length === 0 ? (
          <Card className="bg-slate-800/50 border-teal-600/30 p-12 text-center">
            <Icon name="Lock" size={64} className="text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Нет доступных модулей</h2>
            <p className="text-slate-400">
              У вас пока нет прав доступа к модулям управления.
              <br />
              Обратитесь к администратору предприятия для получения прав.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleModules.map((button, index) => (
              <Card
                key={index}
                onClick={() => navigate(button.route)}
                className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-teal-600/30 hover:border-teal-600 transition-all hover:scale-105 hover:shadow-2xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${button.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <div className="p-8 relative z-10">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className={`bg-gradient-to-br ${button.color} p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                      <Icon name={button.icon} size={40} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
                      {button.label}
                    </h3>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 to-cyan-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-teal-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-700 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default OrgMiniAdmin;