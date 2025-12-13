import { Card } from '@/components/ui/card';
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

interface UserStatsCardsProps {
  stats: UserStats;
  onLoadRegisteredUsers: () => void;
  onLoadOnlineUsers: () => void;
}

export default function UserStatsCards({ stats, onLoadRegisteredUsers, onLoadOnlineUsers }: UserStatsCardsProps) {
  return (
    <>
      {/* Карточки активности */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          className="bg-gradient-to-br from-blue-600 to-blue-700 border-none cursor-pointer hover:scale-105 transition-transform shadow-xl" 
          onClick={onLoadRegisteredUsers}
        >
          <div className="p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Icon name="Users" size={32} />
              <div className="text-4xl font-bold">{stats.registered_count}</div>
            </div>
            <div className="text-sm font-medium opacity-90">Зарегистрировано пользователей</div>
          </div>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-600 to-green-700 border-none cursor-pointer hover:scale-105 transition-transform shadow-xl" 
          onClick={onLoadOnlineUsers}
        >
          <div className="p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Icon name="UserCheck" size={32} />
              <div className="text-4xl font-bold">{stats.online_count}</div>
            </div>
            <div className="text-sm font-medium opacity-90">Онлайн сейчас</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-gray-600 to-gray-700 border-none shadow-xl">
          <div className="p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Icon name="UserX" size={32} />
              <div className="text-4xl font-bold">{stats.offline_count}</div>
            </div>
            <div className="text-sm font-medium opacity-90">Офлайн</div>
          </div>
        </Card>
      </div>

      {/* Статистика по модулям */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* ПАБ */}
        <Card className="bg-slate-800/50 border-slate-700/50 hover:border-purple-600/50 transition-colors shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2 rounded-lg">
                <Icon name="ClipboardCheck" size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">ПАБ</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Всего:</span>
                <span className="text-white font-semibold">{stats.pab_total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Выполнено:</span>
                <span className="text-green-400 font-semibold">{stats.pab_completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">В работе:</span>
                <span className="text-yellow-400 font-semibold">{stats.pab_in_progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Просрочено:</span>
                <span className="text-red-400 font-semibold">{stats.pab_overdue}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Наблюдения */}
        <Card className="bg-slate-800/50 border-slate-700/50 hover:border-blue-600/50 transition-colors shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                <Icon name="Eye" size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Наблюдения</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Выдано:</span>
                <span className="text-white font-semibold">{stats.observations_issued}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Выполнено:</span>
                <span className="text-green-400 font-semibold">{stats.observations_completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">В работе:</span>
                <span className="text-yellow-400 font-semibold">{stats.observations_in_progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Просрочено:</span>
                <span className="text-red-400 font-semibold">{stats.observations_overdue}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Предписания */}
        <Card className="bg-slate-800/50 border-slate-700/50 hover:border-orange-600/50 transition-colors shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-2 rounded-lg">
                <Icon name="FileText" size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Предписания</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Выдано:</span>
                <span className="text-white font-semibold">{stats.prescriptions_issued}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Выполнено:</span>
                <span className="text-green-400 font-semibold">{stats.prescriptions_completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">В работе:</span>
                <span className="text-yellow-400 font-semibold">{stats.prescriptions_in_progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Просрочено:</span>
                <span className="text-red-400 font-semibold">{stats.prescriptions_overdue}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Аудиты */}
        <Card className="bg-slate-800/50 border-slate-700/50 hover:border-cyan-600/50 transition-colors shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-2 rounded-lg">
                <Icon name="Search" size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Аудиты</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Проведено:</span>
                <span className="text-white font-semibold text-2xl">{stats.audits_conducted}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
