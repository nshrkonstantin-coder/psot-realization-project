import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

const OtipbInstructionsPage = () => {
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

  const instructionTypes = [
    { name: 'Вводный инструктаж', count: 45, icon: 'UserPlus', color: 'blue' },
    { name: 'Первичный на рабочем месте', count: 38, icon: 'Briefcase', color: 'green' },
    { name: 'Повторный', count: 127, icon: 'RefreshCw', color: 'yellow' },
    { name: 'Внеплановый', count: 12, icon: 'AlertCircle', color: 'orange' },
    { name: 'Целевой', count: 23, icon: 'Target', color: 'purple' },
  ];

  const recentInstructions = [
    { id: 1, employee: 'Иванов И.И.', type: 'Вводный', date: '18.12.2024', instructor: 'Петров П.П.', status: 'completed' },
    { id: 2, employee: 'Сидорова А.С.', type: 'Повторный', date: '18.12.2024', instructor: 'Петров П.П.', status: 'completed' },
    { id: 3, employee: 'Козлов В.Н.', type: 'Внеплановый', date: '17.12.2024', instructor: 'Семенов С.С.', status: 'completed' },
    { id: 4, employee: 'Морозова Е.А.', type: 'Первичный', date: '17.12.2024', instructor: 'Петров П.П.', status: 'scheduled' },
    { id: 5, employee: 'Николаев Д.М.', type: 'Целевой', date: '16.12.2024', instructor: 'Семенов С.С.', status: 'completed' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/otipb-department')}
              variant="outline"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                <Icon name="GraduationCap" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Инструктажи</h1>
                <p className="text-slate-400 text-sm mt-1">Проведение и учет инструктажей</p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
            <Icon name="Plus" size={20} className="mr-2" />
            Провести инструктаж
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {instructionTypes.map((type, index) => (
            <Card key={index} className="bg-slate-800/50 border-blue-500/30 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`bg-gradient-to-br from-${type.color}-500 to-${type.color}-600 p-2 rounded-lg`}>
                  <Icon name={type.icon} size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">{type.name}</p>
                  <p className="text-2xl font-bold text-white">{type.count}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="List" size={24} />
              Последние инструктажи
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Сотрудник</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Тип инструктажа</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Дата</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Инструктор</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {recentInstructions.map((instruction) => (
                  <tr key={instruction.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{instruction.employee}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{instruction.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{instruction.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{instruction.instructor}</td>
                    <td className="px-6 py-4">
                      {instruction.status === 'completed' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Проведён
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          Запланирован
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      >
                        <Icon name="Eye" size={16} className="mr-1" />
                        Просмотр
                      </Button>
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

export default OtipbInstructionsPage;
