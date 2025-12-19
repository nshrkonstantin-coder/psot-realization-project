import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

const OtipbInspectionsPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    const department = localStorage.getItem('userDepartment');
    setHasAccess(department === 'ОТиПБ' || department === 'Отдел ОТиПБ');
  }, [navigate]);

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    navigate('/otipb-department');
    return null;
  }

  const inspectionStats = [
    { label: 'Всего проверок', value: 156, icon: 'ClipboardCheck', color: 'blue' },
    { label: 'Выполнено', value: 134, icon: 'CheckCircle', color: 'green' },
    { label: 'Запланировано', value: 22, icon: 'Clock', color: 'yellow' },
    { label: 'Нарушения', value: 47, icon: 'AlertTriangle', color: 'red' },
  ];

  const upcomingInspections = [
    { id: 1, object: 'Цех №1', type: 'Плановая', date: '20.12.2024', inspector: 'Петров П.П.', status: 'scheduled' },
    { id: 2, object: 'Склад материалов', type: 'Внеплановая', date: '21.12.2024', inspector: 'Семенов С.С.', status: 'scheduled' },
    { id: 3, object: 'Административный корпус', type: 'Плановая', date: '22.12.2024', inspector: 'Петров П.П.', status: 'scheduled' },
    { id: 4, object: 'Цех №2', type: 'Повторная', date: '18.12.2024', inspector: 'Семенов С.С.', status: 'completed' },
    { id: 5, object: 'Котельная', type: 'Плановая', date: '15.12.2024', inspector: 'Петров П.П.', status: 'completed' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/otipb-department')}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
                <Icon name="ClipboardCheck" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Проверки</h1>
                <p className="text-slate-400 text-sm mt-1">График и результаты проверок</p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
            <Icon name="Plus" size={20} className="mr-2" />
            Запланировать проверку
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {inspectionStats.map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-green-500/30 p-6">
              <div className="flex items-center gap-3">
                <div className={`bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 p-3 rounded-xl`}>
                  <Icon name={stat.icon} size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-green-500/30">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="Calendar" size={24} />
              График проверок
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Объект</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Тип проверки</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Дата</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Проверяющий</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {upcomingInspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{inspection.object}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{inspection.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{inspection.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{inspection.inspector}</td>
                    <td className="px-6 py-4">
                      {inspection.status === 'completed' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Выполнена
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          Запланирована
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        >
                          <Icon name="Eye" size={16} className="mr-1" />
                          Просмотр
                        </Button>
                        {inspection.status === 'scheduled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Icon name="Edit" size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OtipbInspectionsPage;