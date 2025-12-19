import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

const OtipbIncidentsPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    const department = localStorage.getItem('userDepartment');
    setHasAccess(department === 'ОТиПБ');
  }, [navigate]);

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    navigate('/otipb-department');
    return null;
  }

  const incidentStats = [
    { label: 'Всего происшествий', value: 8, icon: 'AlertTriangle', color: 'orange' },
    { label: 'Расследуются', value: 2, icon: 'Search', color: 'blue' },
    { label: 'Завершено', value: 6, icon: 'CheckCircle', color: 'green' },
    { label: 'Без травм', value: 5, icon: 'Shield', color: 'cyan' },
  ];

  const incidents = [
    { 
      id: 1, 
      date: '15.12.2024', 
      type: 'Микротравма', 
      location: 'Цех №1', 
      employee: 'Иванов И.И.', 
      severity: 'low',
      status: 'investigated' 
    },
    { 
      id: 2, 
      date: '12.12.2024', 
      type: 'Несчастный случай', 
      location: 'Склад', 
      employee: 'Петров П.П.', 
      severity: 'medium',
      status: 'investigating' 
    },
    { 
      id: 3, 
      date: '08.12.2024', 
      type: 'Опасная ситуация', 
      location: 'Административный корпус', 
      employee: 'Не применимо', 
      severity: 'low',
      status: 'investigated' 
    },
    { 
      id: 4, 
      date: '05.12.2024', 
      type: 'Микротравма', 
      location: 'Цех №2', 
      employee: 'Сидорова А.С.', 
      severity: 'low',
      status: 'investigated' 
    },
    { 
      id: 5, 
      date: '01.12.2024', 
      type: 'Несчастный случай', 
      location: 'Котельная', 
      employee: 'Козлов В.Н.', 
      severity: 'high',
      status: 'investigating' 
    },
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Высокая</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Средняя</Badge>;
      case 'low':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Низкая</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/otipb-department')}
              variant="outline"
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 rounded-xl shadow-lg">
                <Icon name="AlertTriangle" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Происшествия</h1>
                <p className="text-slate-400 text-sm mt-1">Регистрация и расследование происшествий</p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
            <Icon name="Plus" size={20} className="mr-2" />
            Зарегистрировать происшествие
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {incidentStats.map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-orange-500/30 p-6">
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

        <Card className="bg-slate-800/50 border-orange-500/30">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="FileWarning" size={24} />
              Журнал происшествий
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Дата</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Тип</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Место</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Пострадавший</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Степень</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{incident.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{incident.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{incident.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{incident.employee}</td>
                    <td className="px-6 py-4">{getSeverityBadge(incident.severity)}</td>
                    <td className="px-6 py-4">
                      {incident.status === 'investigated' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Расследовано
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          Расследуется
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                        >
                          <Icon name="Eye" size={16} className="mr-1" />
                          Подробнее
                        </Button>
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

export default OtipbIncidentsPage;
