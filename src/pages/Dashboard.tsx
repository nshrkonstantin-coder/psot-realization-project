import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { TechnicalSupport } from '@/components/TechnicalSupport';
import OrganizationLogo from '@/components/OrganizationLogo';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { useImpersonationState } from '@/hooks/useImpersonationState';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userFio, setUserFio] = useState('');
  const [userCompany, setUserCompany] = useState('');
  const [userRole, setUserRole] = useState('');
  
  useImpersonationState();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    setUserFio(localStorage.getItem('userFio') || '');
    setUserCompany(localStorage.getItem('userCompany') || '');
    setUserRole(localStorage.getItem('userRole') || '');
    
    // Проверяем, было ли уже воспроизведено приветствие в этой сессии
    const greetingPlayed = sessionStorage.getItem('greetingPlayed');
    if (!greetingPlayed) {
      playWelcomeGreeting();
      sessionStorage.setItem('greetingPlayed', 'true');
    }
  }, [navigate]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'утра';
    if (hour >= 12 && hour < 18) return 'дня';
    return 'вечера';
  };

  const playWelcomeGreeting = async () => {
    try {
      const timeOfDay = getTimeOfDay();
      const greetingText = `Дорогой коллега! Вас приветствует Автоматизированная система управления безопасностью труда <[100]>А, Су, Бэ, Тэ<[100]>, хорошего Вам ${timeOfDay}, приятной работы в нашей системе.`;
      
      const response = await fetch('https://functions.poehali.dev/6b198c7d-ed06-44c5-8e63-8647c67ebf53', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: greetingText,
          voice: 'alena'
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.volume = 0.7;
        
        // Небольшая задержка перед воспроизведением
        setTimeout(() => {
          audio.play().catch(err => {
            console.log('Autoplay prevented:', err);
          });
        }, 500);
      }
    } catch (error) {
      console.error('Ошибка воспроизведения приветствия:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
  };

  const navigationButtons = [
    { label: 'Личный кабинет', icon: 'User', color: 'from-purple-500 to-purple-600', route: '/user-cabinet' },
    { label: 'Профиль', icon: 'Settings', color: 'from-slate-500 to-slate-600', route: '/profile' },
    { label: 'Дополнительно', icon: 'Plus', color: 'from-yellow-500 to-yellow-600', route: '/additional' },
    { label: 'Регистрация ПАБ', icon: 'FileText', color: 'from-red-500 to-red-600', route: '/pab-registration' },
    { label: 'Список ПАБ', icon: 'List', color: 'from-green-500 to-green-600', route: '/pab-list' },
    { label: 'Реестр пользователя ПАБ', icon: 'Users', color: 'from-indigo-500 to-indigo-600', route: '/pab-user-registry' },
    { label: 'Реестр всех пользователей ПАБ', icon: 'UsersRound', color: 'from-violet-500 to-violet-600', route: '/admin-pab-registry' },
    { label: 'Производственный контроль', icon: 'Shield', color: 'from-red-600 to-red-700', route: '/production-control' },
    { label: 'Список ПК', icon: 'ClipboardList', color: 'from-emerald-500 to-emerald-600', route: '/pc-list' },
    { label: 'Аналитика ПК', icon: 'BarChart2', color: 'from-teal-500 to-teal-600', route: '/pc-analytics' },
    { label: 'Мои показатели', icon: 'TrendingUp', color: 'from-blue-500 to-blue-600', route: '/my-metrics' },
    { label: 'Журнал поручений', icon: 'BookOpen', color: 'from-red-500 to-red-600', route: '/orders' },
    { label: 'Реестр предписаний', icon: 'ClipboardList', color: 'from-blue-600 to-cyan-600', route: '/prescriptions' },
    { label: 'Статистика нарушений', icon: 'BarChart3', color: 'from-blue-600 to-cyan-600', route: '/violations-stats' },
  ];

  return (
    <>
      <ImpersonationBanner />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={false} />
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
          {navigationButtons.map((button, index) => {
            if (button.route === '/admin-pab-registry' && !['superadmin', 'org_admin', 'org_mini_admin'].includes(userRole)) {
              return null;
            }
            return (
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
            );
          })}
        </div>
      </div>

        {/* Mining Background Effects */}
        <div className="fixed inset-0 pointer-events-none opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-pulse" />
        </div>
      </div>
    </>
  );
};

export default Dashboard;