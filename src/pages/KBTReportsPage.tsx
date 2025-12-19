import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface KBTReport {
  id: number;
  company: string;
  department: string;
  head_name: string;
  period_from: string;
  period_to: string;
  user_id: number;
  organization_id: number;
  created_at: string;
}

const KBTReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<KBTReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadReports();
  }, [navigate]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const orgId = localStorage.getItem('organizationId');
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/7abe1e4c-3790-4bcd-9d37-4967f7dfb8ca?organization_id=${orgId}&user_id=${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        toast.error('Ошибка загрузки отчётов');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleReportClick = (reportId: number) => {
    navigate(`/kbt-report-view/${reportId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/kbt')}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Icon name="BarChart3" size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Отчеты по КБТ</h1>
            </div>
          </div>
          <Button
            onClick={() => navigate('/kbt-report-form')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Создать отчёт
          </Button>
        </div>

        {loading ? (
          <Card className="bg-slate-800/50 border-purple-500/30 p-12">
            <div className="flex items-center justify-center gap-3">
              <Icon name="Loader2" size={32} className="text-purple-400 animate-spin" />
              <span className="text-white text-lg">Загрузка отчётов...</span>
            </div>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="bg-slate-800/50 border-purple-500/30 p-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg inline-block mb-6">
                <Icon name="FileText" size={64} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Нет отчётов</h2>
              <p className="text-slate-400 mb-6">Создайте первый отчёт по КБТ</p>
              <Button
                onClick={() => navigate('/kbt-report-form')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
              >
                <Icon name="Plus" size={20} className="mr-2" />
                Создать отчёт
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="bg-slate-800/50 border-purple-500/30 hover:bg-slate-800/70 hover:border-purple-500/50 transition-all cursor-pointer p-6"
                onClick={() => handleReportClick(report.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                      <Icon name="FileText" size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">
                          Отчёт КБТ - {report.department}
                        </h3>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
                          ID: {report.id}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon name="Building2" size={16} className="text-purple-400" />
                          <span>{report.company}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon name="Calendar" size={16} className="text-purple-400" />
                          <span>Создан: {formatDate(report.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon name="CalendarRange" size={16} className="text-purple-400" />
                          <span>Период: {formatDate(report.period_from)} - {formatDate(report.period_to)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon name="User" size={16} className="text-purple-400" />
                          <span>{report.head_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportClick(report.id);
                      }}
                    >
                      <Icon name="Eye" size={16} className="mr-2" />
                      Просмотр
                    </Button>
                    <Icon name="ChevronRight" size={24} className="text-purple-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KBTReportsPage;