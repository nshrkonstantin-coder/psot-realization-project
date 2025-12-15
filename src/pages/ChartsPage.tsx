import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const ChartsPage = () => {
  const navigate = useNavigate();
  const [userFio, setUserFio] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    const fio = localStorage.getItem('userFio') || 'Пользователь';
    setUserFio(fio);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Фоновые эффекты */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-700 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Шапка */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/additional')}
                variant="outline"
                className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10"
              >
                <Icon name="ArrowLeft" size={20} className="mr-2" />
                Назад
              </Button>
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-xl shadow-lg">
                  <Icon name="BarChart3" size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Личные показатели ПАБ</h1>
                  <p className="text-blue-300 text-sm mt-1">{userFio}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Основной контент */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Карточка общей статистики */}
            <Card className="bg-slate-800/50 border-blue-600/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-2 rounded-lg">
                  <Icon name="TrendingUp" size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Общая статистика</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-300">Всего наблюдений</span>
                  <span className="text-2xl font-bold text-white">124</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-300">Выявлено нарушений</span>
                  <span className="text-2xl font-bold text-orange-400">38</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-300">Процент безопасности</span>
                  <span className="text-2xl font-bold text-green-400">69%</span>
                </div>
              </div>
            </Card>

            {/* Карточка по месяцам */}
            <Card className="bg-slate-800/50 border-blue-600/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                  <Icon name="Calendar" size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Статистика за месяц</h2>
              </div>
              <div className="space-y-3">
                {['Январь', 'Февраль', 'Март', 'Апрель'].map((month, idx) => (
                  <div key={month} className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-medium">{month}</span>
                      <span className="text-white font-bold">{85 - idx * 5}%</span>
                    </div>
                    <div className="w-full bg-slate-600/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${85 - idx * 5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Карточка категорий нарушений */}
            <Card className="bg-slate-800/50 border-blue-600/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-orange-600 to-red-600 p-2 rounded-lg">
                  <Icon name="AlertTriangle" size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Категории нарушений</h2>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'СИЗ', count: 12, color: 'from-red-500 to-red-600' },
                  { name: 'Безопасность работ', count: 8, color: 'from-orange-500 to-orange-600' },
                  { name: 'Оборудование', count: 6, color: 'from-yellow-500 to-yellow-600' },
                  { name: 'Документация', count: 12, color: 'from-blue-500 to-blue-600' },
                ].map((category) => (
                  <div key={category.name} className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300">{category.name}</span>
                      <span className="text-white font-bold">{category.count}</span>
                    </div>
                    <div className="w-full bg-slate-600/50 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r ${category.color} h-2 rounded-full`}
                        style={{ width: `${(category.count / 38) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Карточка рейтинга */}
            <Card className="bg-slate-800/50 border-blue-600/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Icon name="Award" size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Ваш рейтинг</h2>
              </div>
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-32 h-32 mb-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full">
                  <span className="text-5xl font-bold text-white">3</span>
                </div>
                <p className="text-slate-300 text-lg">место в отделе</p>
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border border-purple-600/30">
                  <p className="text-sm text-slate-300">
                    До 2 места осталось <span className="text-white font-bold">12</span> наблюдений
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Дополнительные действия */}
          <div className="mt-8 flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/reports')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <Icon name="FileText" size={20} className="mr-2" />
              Сформировать отчёт
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10"
            >
              <Icon name="Home" size={20} className="mr-2" />
              На главную
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;
