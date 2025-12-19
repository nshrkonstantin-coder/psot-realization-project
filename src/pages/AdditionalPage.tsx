import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const AdditionalPage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    const role = localStorage.getItem('userRole');
    setUserRole(role);
  }, [navigate]);

  const additionalFeatures = [
    { 
      label: 'Сообщения', 
      icon: 'MessageCircle', 
      color: 'from-cyan-500 to-blue-600', 
      route: '/chat-history',
      description: 'Обмен сообщениями с коллегами'
    },
    { 
      label: 'Видео конференция', 
      icon: 'Video', 
      color: 'from-pink-500 to-rose-600', 
      route: '/video-conference',
      description: 'Проведение видеоконференций'
    },
    { 
      label: 'Хранилище', 
      icon: 'FolderOpen', 
      color: 'from-purple-500 to-purple-600', 
      route: '/storage',
      description: 'Управление файлами и документами',
      adminOnly: true
    },
    { 
      label: 'Графики', 
      icon: 'BarChart3', 
      color: 'from-blue-500 to-blue-600', 
      route: '/charts',
      description: 'Аналитические графики и диаграммы'
    },
    { 
      label: 'ОтПБ', 
      icon: 'Flame', 
      color: 'from-orange-500 to-red-600', 
      route: '/otpb',
      description: 'Отдел пожарной безопасности'
    },
    { 
      label: 'Сформировать отчёт', 
      icon: 'FileCheck', 
      color: 'from-green-600 to-green-700', 
      route: '/reports',
      description: 'Создание отчётных документов'
    },
    { 
      label: 'АСУБТ', 
      icon: 'Mountain', 
      color: 'from-blue-500 to-blue-600', 
      route: '/asubt',
      description: 'Автоматизированная система управления безопасностью труда'
    },
    { 
      label: 'КБТ', 
      icon: 'Briefcase', 
      color: 'from-amber-700 to-amber-800', 
      route: '/kbt',
      description: 'Комитет по безопасности труда'
    },
    { 
      label: 'Отдел ОТиПБ', 
      icon: 'ShieldAlert', 
      color: 'from-red-600 to-orange-600', 
      route: '/otipb-department',
      description: 'Отдел охраны труда и пожарной безопасности'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 p-3 rounded-xl shadow-lg">
              <Icon name="Plus" size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Дополнительно</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {additionalFeatures
            .filter(feature => !feature.adminOnly || userRole === 'admin' || userRole === 'superadmin')
            .map((feature, index) => (
            <Card
              key={index}
              onClick={() => navigate(feature.route)}
              className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-yellow-600/30 hover:border-yellow-600 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              
              <div className="p-8 relative z-10">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`bg-gradient-to-br ${feature.color} p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                    <Icon name={feature.icon} size={40} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors mb-2">
                      {feature.label}
                    </h3>
                    <p className="text-sm text-slate-400">{feature.description}</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdditionalPage;