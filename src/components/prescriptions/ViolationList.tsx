import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Violation {
  id: number;
  prescription_id: number;
  violation_text: string;
  assigned_user_id: number;
  assigned_user_fio: string;
  status: string;
  deadline: string;
  completed_at?: string;
  confirmed_by_issuer: boolean;
  issuer_fio: string;
  issuer_position: string;
  issuer_department?: string;
  issuer_organization: string;
  actual_status: string;
  created_at: string;
}

interface ViolationListProps {
  violations: Violation[];
  currentUserId: number;
  onConfirm: (violationId: number) => void;
  onRedirect: (violationId: number) => void;
  onMarkCompleted: (violationId: number) => void;
  onPrint: (violationId: number) => void;
}

export default function ViolationList({
  violations,
  currentUserId,
  onConfirm,
  onRedirect,
  onMarkCompleted,
  onPrint
}: ViolationListProps) {
  const getStatusBadge = (status: string) => {
    const configs: any = {
      completed: { label: 'Выполнено', className: 'bg-green-500' },
      in_work: { label: 'В работе', className: 'bg-yellow-500' },
      overdue: { label: 'Просрочено', className: 'bg-red-500 animate-pulse' }
    };
    const config = configs[status] || { label: status, className: 'bg-gray-500' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const isDeadlineNear = (deadline: string) => {
    const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3 && daysLeft > 0;
  };

  if (violations.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700 p-12 text-center">
        <Icon name="Inbox" size={48} className="mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400">Нет нарушений для отображения</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {violations.map((violation) => (
        <Card key={violation.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-4 h-4 rounded mt-1 ${
                  violation.confirmed_by_issuer ? 'bg-green-500' : 'bg-red-500 animate-pulse'
                }`}
              />

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-white font-semibold">Предписание #{violation.prescription_id}</h3>
                  {getStatusBadge(violation.actual_status)}
                  {isDeadlineNear(violation.deadline) && (
                    <Badge className="bg-orange-500 animate-pulse">Скоро срок!</Badge>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
                  <p className="text-slate-200 text-sm leading-relaxed">{violation.violation_text}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-slate-500">Выдал:</span>
                    <p className="text-white">{violation.issuer_fio}</p>
                    <p className="text-slate-400 text-xs">{violation.issuer_position}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Ответственный:</span>
                    <p className="text-white">{violation.assigned_user_fio}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Организация:</span>
                    <p className="text-white">{violation.issuer_organization}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Срок выполнения:</span>
                    <p className="text-white">{new Date(violation.deadline).toLocaleDateString('ru-RU')}</p>
                  </div>
                  {violation.completed_at && (
                    <div>
                      <span className="text-slate-500">Выполнено:</span>
                      <p className="text-green-400">{new Date(violation.completed_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                  {violation.assigned_user_id === currentUserId && violation.actual_status !== 'completed' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => onMarkCompleted(violation.id)}
                      >
                        <Icon name="Check" size={16} className="mr-1" />
                        Отметить выполненным
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600"
                        onClick={() => onRedirect(violation.id)}
                      >
                        <Icon name="Share" size={16} className="mr-1" />
                        Перенаправить
                      </Button>
                    </>
                  )}

                  {violation.status === 'completed' && !violation.confirmed_by_issuer && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => onConfirm(violation.id)}
                    >
                      <Icon name="CheckCircle" size={16} className="mr-1" />
                      Подтвердить выполнение
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600"
                    onClick={() => onPrint(violation.id)}
                  >
                    <Icon name="Printer" size={16} className="mr-1" />
                    Печать
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
