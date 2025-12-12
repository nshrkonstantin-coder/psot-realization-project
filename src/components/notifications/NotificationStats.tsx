import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Stats {
  total: number;
  unread: number;
  errors: number;
  warnings: number;
}

interface NotificationStatsProps {
  stats: Stats;
}

export default function NotificationStats({ stats }: NotificationStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-3 rounded-lg">
            <Icon name="Bell" className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Всего</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/20 p-3 rounded-lg">
            <Icon name="Mail" className="text-yellow-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Непрочитанные</p>
            <p className="text-2xl font-bold text-white">{stats.unread}</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-3 rounded-lg">
            <Icon name="AlertCircle" className="text-red-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Ошибки</p>
            <p className="text-2xl font-bold text-white">{stats.errors}</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 p-3 rounded-lg">
            <Icon name="AlertTriangle" className="text-orange-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Предупреждения</p>
            <p className="text-2xl font-bold text-white">{stats.warnings}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
