import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import PrescriptionStats from '@/components/prescriptions/PrescriptionStats';
import ViolationList from '@/components/prescriptions/ViolationList';

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

interface Stats {
  total_prescriptions: number;
  total_violations: number;
  completed: number | null;
  in_work: number | null;
  overdue: number | null;
}

interface User {
  id: number;
  fio: string;
}

const PrescriptionsPage = () => {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_prescriptions: 0,
    total_violations: 0,
    completed: 0,
    in_work: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [redirectDialogOpen, setRedirectDialogOpen] = useState(false);
  const [selectedViolationId, setSelectedViolationId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadData();
    loadUsers();
  }, [navigate, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      let url = 'https://functions.poehali.dev/00b936d6-c4d0-4492-97b6-f42ae7c3a29b';
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-User-Id': localStorage.getItem('userId') || '',
          'X-User-Role': localStorage.getItem('userRole') || 'user',
          'X-User-Fio': encodeURIComponent(localStorage.getItem('userFio') || '')
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();
      setStats(data.stats);
      setViolations(data.violations);
    } catch (error) {
      toast.error('Не удалось загрузить данные');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf');
      if (!response.ok) throw new Error('Ошибка загрузки пользователей');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(statusFilter === status ? '' : status);
  };

  const handleMarkCompleted = async (violationId: number) => {
    try {
      const response = await fetch('https://functions.poehali.dev/00b936d6-c4d0-4492-97b6-f42ae7c3a29b', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: violationId,
          status: 'completed'
        })
      });

      if (!response.ok) throw new Error('Ошибка');

      toast.success('Нарушение отмечено как выполненное');
      loadData();
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
      console.error(error);
    }
  };

  const handleConfirm = async (violationId: number) => {
    try {
      const response = await fetch('https://functions.poehali.dev/00b936d6-c4d0-4492-97b6-f42ae7c3a29b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_completion',
          violation_id: violationId
        })
      });

      if (!response.ok) throw new Error('Ошибка');

      toast.success('Выполнение подтверждено');
      loadData();
    } catch (error) {
      toast.error('Ошибка при подтверждении');
      console.error(error);
    }
  };

  const openRedirectDialog = (violationId: number) => {
    setSelectedViolationId(violationId);
    setSelectedUserId('');
    setRedirectDialogOpen(true);
  };

  const handleRedirect = async () => {
    if (!selectedViolationId || !selectedUserId) {
      toast.error('Выберите пользователя');
      return;
    }

    const user = users.find(u => u.id === parseInt(selectedUserId));
    if (!user) return;

    try {
      const response = await fetch('https://functions.poehali.dev/00b936d6-c4d0-4492-97b6-f42ae7c3a29b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redirect_violation',
          violation_id: selectedViolationId,
          new_user_id: parseInt(selectedUserId),
          new_user_fio: user.fio
        })
      });

      if (!response.ok) throw new Error('Ошибка');

      const data = await response.json();
      toast.success(data.message);
      setRedirectDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error('Ошибка при перенаправлении');
      console.error(error);
    }
  };

  const handlePrint = (violationId: number) => {
    const violation = violations.find(v => v.id === violationId);
    if (!violation) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Предписание #${violation.prescription_id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; }
            .info { margin: 20px 0; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Предписание #${violation.prescription_id}</h1>
          <div class="info">
            <p><span class="label">Нарушение:</span> ${violation.violation_text}</p>
            <p><span class="label">Выдал:</span> ${violation.issuer_fio}, ${violation.issuer_position}</p>
            <p><span class="label">Организация:</span> ${violation.issuer_organization}</p>
            <p><span class="label">Ответственный:</span> ${violation.assigned_user_fio}</p>
            <p><span class="label">Срок выполнения:</span> ${new Date(violation.deadline).toLocaleDateString('ru-RU')}</p>
            <p><span class="label">Статус:</span> ${
              violation.actual_status === 'completed' ? 'Выполнено' :
              violation.actual_status === 'in_work' ? 'В работе' : 'Просрочено'
            }</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" className="animate-spin text-white" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-700 p-3 rounded-xl shadow-lg">
              <Icon name="ClipboardList" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Реестр предписаний</h1>
              <p className="text-slate-400">Производственный контроль</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => loadData()}
              className="bg-slate-700 text-white hover:bg-slate-600"
            >
              <Icon name="RefreshCw" size={20} className="mr-2" />
              Обновить
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-slate-700 text-white hover:bg-slate-600"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
          </div>
        </div>

        <PrescriptionStats
          totalPrescriptions={stats.total_prescriptions}
          totalViolations={stats.total_violations}
          completed={stats.completed || 0}
          inWork={stats.in_work || 0}
          overdue={stats.overdue || 0}
          onFilterChange={handleFilterChange}
        />

        {statusFilter && (
          <div className="mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusFilter('')}
              className="border-slate-700 text-white"
            >
              <Icon name="X" size={16} className="mr-1" />
              Сбросить фильтр
            </Button>
          </div>
        )}

        <ViolationList
          violations={violations}
          currentUserId={currentUserId}
          onConfirm={handleConfirm}
          onRedirect={openRedirectDialog}
          onMarkCompleted={handleMarkCompleted}
          onPrint={handlePrint}
        />
      </div>

      <Dialog open={redirectDialogOpen} onOpenChange={setRedirectDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Перенаправить нарушение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Выберите ответственного:</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()} className="text-white">
                      {user.fio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedirectDialogOpen(false)}
              className="border-slate-700 text-white hover:bg-slate-700"
            >
              Отмена
            </Button>
            <Button
              onClick={handleRedirect}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icon name="Send" size={16} className="mr-2" />
              Перенаправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrescriptionsPage;