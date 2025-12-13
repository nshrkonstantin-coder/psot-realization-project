import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface PrescriptionStatsProps {
  totalPrescriptions: number;
  totalViolations: number;
  completed: number;
  inWork: number;
  overdue: number;
  onFilterChange: (status: string) => void;
}

export default function PrescriptionStats({
  totalPrescriptions,
  totalViolations,
  completed,
  inWork,
  overdue,
  onFilterChange
}: PrescriptionStatsProps) {
  const stats = [
    {
      title: 'Всего предписаний',
      value: totalPrescriptions,
      icon: 'FileText',
      color: 'from-blue-600 to-blue-700',
      clickable: false
    },
    {
      title: 'Всего нарушений',
      value: totalViolations,
      icon: 'AlertTriangle',
      color: 'from-purple-600 to-purple-700',
      clickable: false
    },
    {
      title: 'Выполнено',
      value: completed || 0,
      icon: 'CheckCircle',
      color: 'from-green-600 to-green-700',
      clickable: true,
      filterStatus: 'completed'
    },
    {
      title: 'В работе',
      value: inWork || 0,
      icon: 'Clock',
      color: 'from-yellow-600 to-yellow-700',
      clickable: true,
      filterStatus: 'in_work'
    },
    {
      title: 'Просрочено',
      value: overdue || 0,
      icon: 'AlertCircle',
      color: 'from-red-600 to-red-700 animate-pulse',
      clickable: true,
      filterStatus: 'overdue'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`bg-gradient-to-br ${stat.color} border-none cursor-pointer hover:scale-105 transition-transform`}
          onClick={() => stat.clickable && stat.filterStatus && onFilterChange(stat.filterStatus)}
        >
          <div className="p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Icon name={stat.icon} size={32} />
              <div className="text-3xl font-bold">{stat.value}</div>
            </div>
            <div className="text-sm font-medium opacity-90">{stat.title}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
