import { Button } from '@/components/ui/button';
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

interface UserInfoHeaderProps {
  stats: UserStats;
  unreadCount: number;
  onBack: () => void;
  onOpenMessages: () => void;
  onLogout: () => void;
}

export default function UserInfoHeader({ 
  stats, 
  unreadCount, 
  onBack, 
  onOpenMessages, 
  onLogout 
}: UserInfoHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
            <Icon name="User" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Личный кабинет</h1>
            {stats.company && (
              <p className="text-blue-300 text-sm">{stats.company}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-800"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          
          <div className="relative">
            <Button
              onClick={onOpenMessages}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              <Icon name="MessageSquare" size={20} className="mr-2" />
              Сообщения
            </Button>
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {unreadCount}
              </div>
            )}
          </div>
          
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
          >
            <Icon name="LogOut" size={20} className="mr-2" />
            Выход
          </Button>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <span className="text-slate-400 text-sm">ФИО:</span>
            <p className="text-white font-semibold">{stats.fio || stats.display_name}</p>
          </div>
          {stats.position && (
            <div>
              <span className="text-slate-400 text-sm">Должность:</span>
              <p className="text-white font-semibold">{stats.position}</p>
            </div>
          )}
          {stats.subdivision && (
            <div>
              <span className="text-slate-400 text-sm">Подразделение:</span>
              <p className="text-white font-semibold">{stats.subdivision}</p>
            </div>
          )}
          {stats.email && (
            <div>
              <span className="text-slate-400 text-sm">Email:</span>
              <p className="text-white font-semibold">{stats.email}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
