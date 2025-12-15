import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { TechnicalSupport } from '@/components/TechnicalSupport';
import OrganizationLogo from '@/components/OrganizationLogo';

const Admin = () => {
  const navigate = useNavigate();
  const [userFio, setUserFio] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'admin') {
      // Перенаправляем на соответствующую страницу
      if (role === 'superadmin') {
        navigate('/superadmin');
      } else if (role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      return;
    }
    
    setUserFio(localStorage.getItem('userFio') || '');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const adminButtons = [
    { label: 'Управление пользователями', icon: 'Users', color: 'from-blue-500 to-blue-600', route: '/users-management' },
    { label: 'Сообщения', icon: 'MessageSquare', color: 'from-violet-500 to-purple-600', route: '/admin-messages' },
    { label: 'Видео конференция', icon: 'Video', color: 'from-pink-500 to-rose-600', route: '/video-conference' },
    { label: 'Управление ПАБ', icon: 'FileText', color: 'from-blue-500 to-indigo-600', route: '/pab-list' },
    { label: 'Управление ПК', icon: 'ClipboardList', color: 'from-emerald-500 to-teal-600', route: '/pc-list' },
    { label: 'Назначить минадминистратора', icon: 'UserCog', color: 'from-teal-500 to-teal-600', route: '/assign-miniadmin' },
    { label: 'Интеграция с 1С', icon: 'Database', color: 'from-emerald-500 to-emerald-600', route: '/integration-1c' },
    { label: 'Управление регистрацией ПАБ', icon: 'Settings', color: 'from-orange-500 to-orange-600', route: '/pab-dictionaries' },
    { label: 'Мониторинг предписаний', icon: 'ClipboardCheck', color: 'from-cyan-500 to-cyan-600', route: '/prescriptions-monitor' },
    { label: 'Отчёты и статистика', icon: 'BarChart3', color: 'from-green-500 to-green-600', route: '/reports-stats' },
    { label: 'Управление аудитами', icon: 'Search', color: 'from-yellow-500 to-yellow-600', route: '/audits-management' },
    { label: 'Нарушения ПБ', icon: 'AlertTriangle', color: 'from-red-500 to-red-600', route: '/violations-management' },
    { label: 'Настройки раздела', icon: 'Settings', color: 'from-slate-500 to-slate-600', route: '/section-settings' },
    { label: 'Уведомления', icon: 'Bell', color: 'from-purple-500 to-purple-600', route: '/system-notifications' },
    { label: 'Журнал действий', icon: 'BookOpen', color: 'from-indigo-500 to-indigo-600', route: '/action-log' },
    { label: 'Управление Графиком личных показателей ПАБ', icon: 'LineChart', color: 'from-amber-500 to-amber-600', route: '/charts' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={true} />
            <div>
              <h1 className="text-3xl font-bold text-white">Панель администратора</h1>
              <p className="text-blue-400">{userFio}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <TechnicalSupport />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10"
            >
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminButtons.map((button, index) => (
            <Card
              key={index}
              onClick={() => navigate(button.route)}
              className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-blue-600/30 hover:border-blue-600 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${button.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              
              <div className="p-8 relative z-10">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`bg-gradient-to-br ${button.color} p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                    <Icon name={button.icon} size={40} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {button.label}
                  </h3>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>
          ))}
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-700 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default Admin;