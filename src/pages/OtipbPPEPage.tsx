import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const OtipbPPEPage = () => {
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

  const ppeCategories = [
    { name: 'Каски', total: 150, issued: 142, icon: 'HardHat', color: 'blue' },
    { name: 'Респираторы', total: 80, issued: 67, icon: 'Wind', color: 'green' },
    { name: 'Перчатки', total: 200, issued: 189, icon: 'Hand', color: 'purple' },
    { name: 'Огнетушители', total: 45, issued: 45, icon: 'Flame', color: 'red' },
  ];

  const ppeItems = [
    { id: 1, name: 'Каска защитная', category: 'Головная защита', quantity: 150, issued: 142, available: 8, status: 'good' },
    { id: 2, name: 'Респиратор 3М', category: 'Защита органов дыхания', quantity: 80, issued: 67, available: 13, status: 'good' },
    { id: 3, name: 'Перчатки х/б', category: 'Защита рук', quantity: 200, issued: 189, available: 11, status: 'low' },
    { id: 4, name: 'Очки защитные', category: 'Защита глаз', quantity: 120, issued: 98, available: 22, status: 'good' },
    { id: 5, name: 'Огнетушитель ОП-5', category: 'Пожаротушение', quantity: 45, issued: 45, available: 0, status: 'critical' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Критично</Badge>;
      case 'low':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Мало</Badge>;
      case 'good':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">В норме</Badge>;
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
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Icon name="HardHat" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Средства защиты</h1>
                <p className="text-slate-400 text-sm mt-1">Учет СИЗ и средств пожаротушения</p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white">
            <Icon name="Plus" size={20} className="mr-2" />
            Выдать СИЗ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {ppeCategories.map((category, index) => (
            <Card key={index} className="bg-slate-800/50 border-purple-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`bg-gradient-to-br from-${category.color}-500 to-${category.color}-600 p-3 rounded-xl`}>
                  <Icon name={category.icon} size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">{category.name}</p>
                  <p className="text-xl font-bold text-white">{category.issued}/{category.total}</p>
                </div>
              </div>
              <Progress value={(category.issued / category.total) * 100} className="h-2" />
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-purple-500/30">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="Package" size={24} />
              Инвентаризация средств защиты
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Наименование</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Категория</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Всего</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Выдано</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Доступно</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {ppeItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.issued}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{item.available}</td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Icon name="Package" size={16} className="mr-1" />
                          Выдать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Icon name="History" size={16} />
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

export default OtipbPPEPage;
