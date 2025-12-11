import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface UserStats {
  user_id: number;
  display_name: string;
  fio: string;
  email: string;
  company: string;
  subdivision: string;
  position: string;
  registered_count: number;
  online_count: number;
  offline_count: number;
  pab_total: number;
  pab_completed: number;
  pab_in_progress: number;
  pab_overdue: number;
  observations_issued: number;
  observations_completed: number;
  observations_in_progress: number;
  observations_overdue: number;
  prescriptions_issued: number;
  prescriptions_completed: number;
  prescriptions_in_progress: number;
  prescriptions_overdue: number;
  audits_conducted: number;
}

const UserCabinet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadUserStats();
    
    // Автоматическое обновление каждые 30 секунд
    const interval = setInterval(() => {
      loadUserStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const loadUserStats = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=user_cabinet&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        toast({ title: 'Ошибка загрузки данных', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-red-600/30 p-8">
          <p className="text-red-500 text-lg">Данные не найдены</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
              <Icon name="User" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Личный кабинет</h1>
              {stats.company && (
                <p className="text-blue-400 font-semibold text-lg">{stats.company}</p>
              )}
              <p className="text-slate-400">{stats.fio}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              На главную
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-600/50 text-red-500 hover:bg-red-600/10"
            >
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="IdCard" size={24} className="text-yellow-500" />
            Информация о пользователе
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-400">ID</p>
              <p className="text-lg text-white font-semibold">{stats.display_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-lg text-white">{stats.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Компания</p>
              <p className="text-lg text-white">{stats.company}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Подразделение</p>
              <p className="text-lg text-white">{stats.subdivision}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Должность</p>
              <p className="text-lg text-white">{stats.position}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Проведено аудитов</p>
              <p className="text-lg text-white font-semibold">{stats.audits_conducted}</p>
            </div>
          </div>
        </Card>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl">
                <Icon name="CheckCircle" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Прошедшие регистрацию</p>
                <p className="text-3xl font-bold text-green-500">{stats.registered_count}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl">
                <Icon name="Wifi" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Онлайн активность</p>
                <p className="text-3xl font-bold text-blue-500">{stats.online_count}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl">
                <Icon name="WifiOff" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Офлайн активность</p>
                <p className="text-3xl font-bold text-slate-400">{stats.offline_count}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ПАБ Statistics */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="FileText" size={24} className="text-yellow-500" />
            Статистика ПАБ (Поведенческий Аудит Безопасности)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Всего ПАБов</p>
              <p className="text-2xl font-bold text-white">{stats.pab_total}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600/30">
              <p className="text-sm text-slate-400 mb-1">Завершено</p>
              <p className="text-2xl font-bold text-green-500">{stats.pab_completed}</p>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
              <p className="text-sm text-slate-400 mb-1">В работе</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pab_in_progress}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
              <p className="text-sm text-slate-400 mb-1">Просроченные</p>
              <p className="text-2xl font-bold text-red-500">{stats.pab_overdue}</p>
            </div>
          </div>
        </Card>

        {/* Observations Statistics */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="Eye" size={24} className="text-yellow-500" />
            Статистика наблюдений
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Выписано наблюдений</p>
              <p className="text-2xl font-bold text-white">{stats.observations_issued}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600/30">
              <p className="text-sm text-slate-400 mb-1">Устранено</p>
              <p className="text-2xl font-bold text-green-500">{stats.observations_completed}</p>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
              <p className="text-sm text-slate-400 mb-1">В работе</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.observations_in_progress}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
              <p className="text-sm text-slate-400 mb-1">Просроченные</p>
              <p className="text-2xl font-bold text-red-500">{stats.observations_overdue}</p>
            </div>
          </div>
        </Card>

        {/* Prescriptions Statistics */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="ClipboardList" size={24} className="text-yellow-500" />
            Статистика предписаний
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Выписано предписаний</p>
              <p className="text-2xl font-bold text-white">{stats.prescriptions_issued}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600/30">
              <p className="text-sm text-slate-400 mb-1">Устранено</p>
              <p className="text-2xl font-bold text-green-500">{stats.prescriptions_completed}</p>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
              <p className="text-sm text-slate-400 mb-1">В работе</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.prescriptions_in_progress}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
              <p className="text-sm text-slate-400 mb-1">Просроченные</p>
              <p className="text-2xl font-bold text-red-500">{stats.prescriptions_overdue}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserCabinet;