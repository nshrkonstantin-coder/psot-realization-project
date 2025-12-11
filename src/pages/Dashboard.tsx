import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { TechnicalSupport } from '@/components/TechnicalSupport';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userFio, setUserFio] = useState('');
  const [userCompany, setUserCompany] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    setUserFio(localStorage.getItem('userFio') || '');
    setUserCompany(localStorage.getItem('userCompany') || '');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const navigationButtons = [
    { label: 'Личный кабинет', icon: 'User', color: 'from-purple-500 to-purple-600', route: '/user-cabinet' },
    { label: 'Профиль', icon: 'Settings', color: 'from-slate-500 to-slate-600', route: '/profile' },
    { label: 'Сообщения', icon: 'MessageCircle', color: 'from-cyan-500 to-blue-600', route: '/chat-history' },
    { label: 'Регистрация ПАБ', icon: 'FileText', color: 'from-red-500 to-red-600', route: '/pab-registration' },
    { label: 'Список ПАБ', icon: 'List', color: 'from-green-500 to-green-600', route: '/pab-list' },
    { label: 'Мои показатели', icon: 'TrendingUp', color: 'from-blue-500 to-blue-600', route: '/my-metrics' },
    { label: 'Производственный контроль', icon: 'Shield', color: 'from-red-600 to-red-700', route: '/production-control' },
    { label: 'Реестр предписаний', icon: 'ClipboardList', color: 'from-blue-600 to-cyan-600', route: '/prescriptions' },
    { label: 'Статистика нарушений', icon: 'BarChart3', color: 'from-blue-600 to-cyan-600', route: '/violations-stats' },
    { label: 'Дополнительно', icon: 'Plus', color: 'from-yellow-500 to-yellow-600', route: '/additional' },
    { label: 'Журнал поручений', icon: 'BookOpen', color: 'from-red-500 to-red-600', route: '/orders' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-yellow-600 to-orange-700 p-3 rounded-xl shadow-lg">
              <Icon name="Mountain" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">АСУБТ</h1>
              {userCompany && (
                <p className="text-blue-400 font-semibold text-lg">{userCompany}</p>
              )}
              <p className="text-yellow-500">Добро пожаловать, {userFio}</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <TechnicalSupport />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationButtons.map((button, index) => (
            <Card
              key={index}
              onClick={() => navigate(button.route)}
              className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-yellow-600/30 hover:border-yellow-600 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${button.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              
              <div className="p-8 relative z-10">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`bg-gradient-to-br ${button.color} p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                    <Icon name={button.icon} size={40} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                    {button.label}
                  </h3>
                </div>
              </div>

              {/* 3D Border Effect */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>
          ))}
        </div>
      </div>

      {/* Mining Background Effects */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default Dashboard;