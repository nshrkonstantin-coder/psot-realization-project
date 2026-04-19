import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  base_price: number;
  is_active: boolean;
  is_points_enabled: boolean;
  points_value: number;
  price: number;
  trial_days: number;
  max_users: number;
  component_count: number;
  components_total: number;
  created_at: string;
}

const SubscriptionPlansPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'superadmin') {
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      return;
    }
    
    loadPlans();
  }, [navigate]);

  const loadPlans = async () => {
    try {
      const response = await apiFetch('https://functions.poehali.dev/74e617c7-d1e0-48d6-a5a6-0d25d554958e');
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      toast.error('Не удалось загрузить список тарифов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    const name = prompt('Введите название тарифа:');
    if (!name) return;

    try {
      const response = await apiFetch('https://functions.poehali.dev/74e617c7-d1e0-48d6-a5a6-0d25d554958e', {
        method: 'POST',
        body: JSON.stringify({ name, description: '' })
      });

      if (!response.ok) throw new Error('Failed to create');

      toast.success('Тариф создан');
      loadPlans();
    } catch (error) {
      toast.error('Ошибка создания тарифа');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/superadmin')} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10"
          >
            <Icon name="LogOut" size={20} className="mr-2" />
            Выход
          </Button>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-3 rounded-xl shadow-lg">
              <Icon name="CreditCard" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Тарифные планы</h1>
              <p className="text-purple-400">Настройка стоимости и компонентов</p>
            </div>
          </div>
          <Button
            onClick={handleCreatePlan}
            className="bg-gradient-to-r from-green-600 to-emerald-700"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Создать тариф
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {plans.length === 0 ? (
          <Card className="p-12 text-center bg-slate-800/50 border-purple-600/30">
            <Icon name="CreditCard" size={64} className="mx-auto text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Нет тарифных планов</h3>
            <p className="text-gray-400 mb-6">Создайте первый тарифный план</p>
            <Button
              onClick={handleCreatePlan}
              className="bg-gradient-to-r from-green-600 to-emerald-700"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Создать тариф
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="bg-slate-800/50 border-purple-600/30 hover:border-purple-600 transition-all p-6 cursor-pointer"
                onClick={() => navigate(`/subscription-plan/${plan.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      plan.is_active ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                    }`}
                  >
                    {plan.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between bg-blue-600/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon name="DollarSign" size={18} className="text-blue-400" />
                      <span className="text-sm text-blue-400">Базовая цена</span>
                    </div>
                    <span className="text-lg font-bold text-white">{plan.base_price.toLocaleString()} ₽</span>
                  </div>

                  <div className="flex items-center justify-between bg-purple-600/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon name="Package" size={18} className="text-purple-400" />
                      <span className="text-sm text-purple-400">Компонентов</span>
                    </div>
                    <span className="text-lg font-bold text-white">{plan.component_count}</span>
                  </div>

                  <div className="flex items-center justify-between bg-pink-600/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon name="Calculator" size={18} className="text-pink-400" />
                      <span className="text-sm text-pink-400">Итоговая цена</span>
                    </div>
                    <span className="text-lg font-bold text-white">{plan.components_total.toLocaleString()} ₽</span>
                  </div>
                </div>

                {plan.is_points_enabled && (
                  <div className="bg-orange-600/10 p-3 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <Icon name="Star" size={18} className="text-orange-400" />
                      <span className="text-sm text-orange-400">Баллы: {plan.points_value}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/subscription-plan/${plan.id}`);
                  }}
                >
                  <Icon name="Settings" size={18} className="mr-2" />
                  Настроить
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlansPage;