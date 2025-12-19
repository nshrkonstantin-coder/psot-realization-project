import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const KBTMainPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
    }
  }, [navigate]);

  const kbtSections = [
    { 
      label: 'Отчитаться по КБТ', 
      icon: 'FileText', 
      color: 'from-blue-500 to-blue-600', 
      route: '/kbt-report-form',
      description: 'Подать отчет по комитету безопасности труда'
    },
    { 
      label: 'Протоколы КБТ', 
      icon: 'FileCheck', 
      color: 'from-green-500 to-green-600', 
      route: '/kbt-protocols',
      description: 'Просмотр протоколов заседаний КБТ'
    },
    { 
      label: 'Отчеты по КБТ', 
      icon: 'BarChart3', 
      color: 'from-purple-500 to-purple-600', 
      route: '/kbt-reports',
      description: 'Аналитические отчеты и статистика'
    },
    { 
      label: 'Программы по КБТ', 
      icon: 'BookOpen', 
      color: 'from-orange-500 to-orange-600', 
      route: '/kbt-programs',
      description: 'Программы обучения и мероприятий'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/additional')}
            variant="outline"
            className="border-amber-700/50 text-amber-500 hover:bg-amber-700/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-700 to-amber-800 p-3 rounded-xl shadow-lg">
              <Icon name="Briefcase" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Комитет по безопасности труда</h1>
              <p className="text-slate-400 text-sm mt-1">Управление деятельностью КБТ</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kbtSections.map((section, index) => (
            <Card
              key={index}
              onClick={() => navigate(section.route)}
              className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-amber-700/30 hover:border-amber-700 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              
              <div className="p-8 relative z-10">
                <div className="flex items-center gap-6">
                  <div className={`bg-gradient-to-br ${section.color} p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <Icon name={section.icon} size={48} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                      {section.label}
                    </h3>
                    <p className="text-sm text-slate-400">{section.description}</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 to-amber-800 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KBTMainPage;
