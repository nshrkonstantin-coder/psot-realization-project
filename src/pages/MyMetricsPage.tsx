import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { generatePabHtml } from '@/utils/generatePabHtml';
import { MetricsDateFilter } from '@/components/metrics/MetricsDateFilter';
import { MetricsTabSwitcher } from '@/components/metrics/MetricsTabSwitcher';
import { MetricsCards } from '@/components/metrics/MetricsCards';
import { ObservationsDialog } from '@/components/metrics/ObservationsDialog';
import { Card } from '@/components/ui/card';

interface Observation {
  id: number;
  doc_number: string;
  doc_date: string;
  observation_number: number;
  description: string;
  status: string;
  deadline: string;
  responsible_person: string;
  inspector_fio: string;
  inspector_position: string;
  department: string;
  location: string;
  checked_object: string;
}

const MyMetricsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pab' | 'pk'>('pab');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userCompany, setUserCompany] = useState('');
  const [metrics, setMetrics] = useState({
    totalAudits: 0,
    totalObservations: 0,
    resolved: 0,
    inProgress: 0,
    overdue: 0,
  });
  const [pkMetrics, setPkMetrics] = useState({
    totalInspections: 0,
    totalViolations: 0,
    resolved: 0,
    inProgress: 0,
    overdue: 0,
  });
  const [selectedObservations, setSelectedObservations] = useState<Observation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    setUserCompany(localStorage.getItem('userCompany') || '');
    setUserRole(localStorage.getItem('userRole') || '');

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(firstDayOfMonth.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);

    loadMetrics(firstDayOfMonth.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    loadPkMetrics(firstDayOfMonth.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    loadChart();
  }, [navigate]);

  const loadChart = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/f75c6d34-b244-49c1-a03d-9c3473e0189e', {
        method: 'GET',
      });
      const data = await response.json();
      if (data.exists && data.url) {
        setChartUrl(data.url);
      }
    } catch (error) {
      console.error('Error loading chart:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Пожалуйста, загрузите Excel файл (.xlsx или .xls)');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (!base64) {
          toast.error('Ошибка чтения файла');
          setIsUploading(false);
          return;
        }

        const response = await fetch('https://functions.poehali.dev/f75c6d34-b244-49c1-a03d-9c3473e0189e', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: base64,
            filename: 'metrics-chart.xlsx',
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setChartUrl(data.url);
          toast.success('График успешно загружен и доступен всем пользователям');
        } else {
          toast.error(data.error || 'Ошибка загрузки файла');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Ошибка загрузки файла');
      setIsUploading(false);
    }
  };

  const handleDeleteChart = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить график? Он исчезнет у всех пользователей.')) {
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/f75c6d34-b244-49c1-a03d-9c3473e0189e', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setChartUrl(null);
        toast.success('График успешно удален');
      } else {
        toast.error(data.error || 'Ошибка удаления файла');
      }
    } catch (error) {
      console.error('Error deleting chart:', error);
      toast.error('Ошибка удаления файла');
    }
  };

  const loadPkMetrics = async (from: string, to: string) => {
    try {
      const mockPkViolations = [
        {
          id: 1,
          doc_number: 'ПК-001-25',
          doc_date: '2025-12-02',
          description: 'Нарушение правил охраны труда',
          status: 'new',
          deadline: '2025-12-20',
          responsible_person: 'Смирнов Дмитрий Александрович',
        },
        {
          id: 2,
          doc_number: 'ПК-002-25',
          doc_date: '2025-11-25',
          description: 'Отсутствие СИЗ на рабочем месте',
          status: 'in_progress',
          deadline: '2025-12-18',
          responsible_person: 'Волков Сергей Николаевич',
        },
        {
          id: 3,
          doc_number: 'ПК-003-25',
          doc_date: '2025-11-30',
          description: 'Нарушение технологического процесса',
          status: 'resolved',
          deadline: '2025-12-15',
          responsible_person: 'Морозов Игорь Валерьевич',
        },
        {
          id: 4,
          doc_number: 'ПК-004-25',
          doc_date: '2025-11-15',
          description: 'Просроченное нарушение - отсутствие инструктажа',
          status: 'new',
          deadline: '2025-11-20',
          responsible_person: 'Павлов Андрей Викторович',
        },
      ];

      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const filteredViolations = mockPkViolations.filter(v => {
        const vDate = new Date(v.doc_date);
        return vDate >= fromDate && vDate <= toDate;
      });

      const uniqueInspections = new Set(filteredViolations.map(v => v.doc_number));

      const now = new Date();
      let resolved = 0;
      let inProgress = 0;
      let overdue = 0;

      filteredViolations.forEach(v => {
        const deadlineDate = new Date(v.deadline);
        if (v.status === 'resolved') {
          resolved++;
        } else if (v.status === 'in_progress') {
          if (deadlineDate < now) {
            overdue++;
          } else {
            inProgress++;
          }
        } else if (v.status === 'new') {
          if (deadlineDate < now) {
            overdue++;
          } else {
            inProgress++;
          }
        }
      });

      setPkMetrics({
        totalInspections: uniqueInspections.size,
        totalViolations: filteredViolations.length,
        resolved,
        inProgress,
        overdue,
      });
    } catch (error) {
      console.error('Error loading PK metrics:', error);
      toast.error('Ошибка загрузки статистики ПК');
    }
  };

  const loadMetrics = async (from: string, to: string) => {
    try {
      const mockObservations: Observation[] = [
        {
          id: 1,
          doc_number: 'ПАБ-001-25',
          doc_date: '2025-12-01',
          observation_number: 1,
          description: 'Деформация рам на рабочем месте',
          status: 'new',
          deadline: '2025-12-15',
          responsible_person: 'Изварин Виталий Георгиевич',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-1',
          checked_object: 'Квершлаг 158 восток, НТС-1',
        },
        {
          id: 2,
          doc_number: 'ПАБ-001-25',
          doc_date: '2025-12-01',
          observation_number: 2,
          description: 'Деформация рам квершлага 160',
          status: 'in_progress',
          deadline: '2025-12-17',
          responsible_person: 'Изварин Виталий Георгиевич',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-1',
          checked_object: 'НТС 1 квершлаг 160',
        },
        {
          id: 3,
          doc_number: 'ПАБ-002-25',
          doc_date: '2025-11-28',
          observation_number: 1,
          description: 'Отсутствие крепления оборудования',
          status: 'resolved',
          deadline: '2025-12-10',
          responsible_person: 'Сидоров Иван Петрович',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-2',
          checked_object: 'Участок 42',
        },
        {
          id: 4,
          doc_number: 'ПАБ-003-25',
          doc_date: '2025-11-20',
          observation_number: 1,
          description: 'Просроченное наблюдение - нарушение техники безопасности',
          status: 'new',
          deadline: '2025-11-25',
          responsible_person: 'Кузнецов Алексей Владимирович',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-3',
          checked_object: 'Шахта 5',
        },
      ];

      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const filteredObs = mockObservations.filter(obs => {
        const obsDate = new Date(obs.doc_date);
        return obsDate >= fromDate && obsDate <= toDate;
      });

      const uniqueAudits = new Set(filteredObs.map(obs => obs.doc_number));

      const now = new Date();
      let resolved = 0;
      let inProgress = 0;
      let overdue = 0;

      filteredObs.forEach(obs => {
        const deadlineDate = new Date(obs.deadline);
        if (obs.status === 'resolved') {
          resolved++;
        } else if (obs.status === 'in_progress') {
          if (deadlineDate < now) {
            overdue++;
          } else {
            inProgress++;
          }
        } else if (obs.status === 'new') {
          if (deadlineDate < now) {
            overdue++;
          } else {
            inProgress++;
          }
        }
      });

      setMetrics({
        totalAudits: uniqueAudits.size,
        totalObservations: filteredObs.length,
        resolved,
        inProgress,
        overdue,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Ошибка загрузки статистики');
    }
  };

  const handleMetricClick = async (type: string) => {
    try {
      const mockObservations: Observation[] = [
        {
          id: 1,
          doc_number: 'ПАБ-001-25',
          doc_date: '2025-12-01',
          observation_number: 1,
          description: 'Деформация рам на рабочем месте',
          status: 'new',
          deadline: '2025-12-15',
          responsible_person: 'Изварин Виталий Георгиевич',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-1',
          checked_object: 'Квершлаг 158 восток, НТС-1',
        },
        {
          id: 2,
          doc_number: 'ПАБ-001-25',
          doc_date: '2025-12-01',
          observation_number: 2,
          description: 'Деформация рам квершлага 160',
          status: 'in_progress',
          deadline: '2025-12-17',
          responsible_person: 'Изварин Виталий Георгиевич',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-1',
          checked_object: 'НТС 1 квершлаг 160',
        },
        {
          id: 3,
          doc_number: 'ПАБ-002-25',
          doc_date: '2025-11-28',
          observation_number: 1,
          description: 'Отсутствие крепления оборудования',
          status: 'resolved',
          deadline: '2025-12-10',
          responsible_person: 'Сидоров Иван Петрович',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-2',
          checked_object: 'Участок 42',
        },
        {
          id: 4,
          doc_number: 'ПАБ-003-25',
          doc_date: '2025-11-20',
          observation_number: 1,
          description: 'Просроченное наблюдение - нарушение техники безопасности',
          status: 'new',
          deadline: '2025-11-25',
          responsible_person: 'Кузнецов Алексей Владимирович',
          inspector_fio: 'Петров Сергей Иванович',
          inspector_position: 'Начальник ПГУ',
          department: 'ПГУ',
          location: 'НТС-3',
          checked_object: 'Шахта 5',
        },
      ];

      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);

      const filteredObs = mockObservations.filter(obs => {
        const obsDate = new Date(obs.doc_date);
        return obsDate >= fromDate && obsDate <= toDate;
      });

      const now = new Date();
      let filtered: Observation[] = [];

      switch (type) {
        case 'all':
          filtered = filteredObs;
          setDialogTitle('Все наблюдения');
          break;
        case 'resolved':
          filtered = filteredObs.filter(o => o.status === 'resolved');
          setDialogTitle('Устраненные наблюдения');
          break;
        case 'in_progress':
          filtered = filteredObs.filter(o => {
            const deadlineDate = new Date(o.deadline);
            return (o.status === 'in_progress' || o.status === 'new') && deadlineDate >= now;
          });
          setDialogTitle('Наблюдения в работе');
          break;
        case 'overdue':
          filtered = filteredObs.filter(o => {
            const deadlineDate = new Date(o.deadline);
            return (o.status === 'in_progress' || o.status === 'new') && deadlineDate < now;
          });
          setDialogTitle('Просроченные наблюдения');
          break;
      }

      setSelectedObservations(filtered);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error loading observations:', error);
      toast.error('Ошибка загрузки списка наблюдений');
    }
  };

  const handleObservationClick = (obs: Observation) => {
    try {
      const htmlContent = generatePabHtml({
        doc_number: obs.doc_number,
        doc_date: obs.doc_date,
        inspector_fio: obs.inspector_fio,
        inspector_position: obs.inspector_position,
        department: obs.department,
        location: obs.location,
        checked_object: obs.checked_object,
        observations: [{
          observation_number: obs.observation_number,
          description: obs.description,
          category: 'Порядок на рабочем месте (ПМ)',
          conditions_actions: 'Опасное условие',
          hazard_factors: 'Пожарная безопасность',
          measures: 'Устранить нарушение',
          responsible_person: obs.responsible_person,
          deadline: obs.deadline,
          photo_base64: undefined,
        }],
      });

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error opening observation:', error);
      toast.error('Ошибка открытия наблюдения');
    }
  };

  const handleUpdateMetrics = () => {
    loadMetrics(dateFrom, dateTo);
    loadPkMetrics(dateFrom, dateTo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
              <Icon name="TrendingUp" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Мои показатели</h1>
              {userCompany && (
                <p className="text-blue-400 font-semibold text-lg">{userCompany}</p>
              )}
            </div>
          </div>
        </div>

        <MetricsDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onUpdate={handleUpdateMetrics}
        />

        <MetricsTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {userRole === 'super_admin' && (
          <Card className="mb-6 p-6 bg-slate-800/50 border-yellow-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-600/20 p-3 rounded-lg">
                  <Icon name="BarChart3" size={24} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">График личных показателей ПАБ</h3>
                  <p className="text-slate-400 text-sm">Загрузите Excel-файл с графиком для отображения всем пользователям</p>
                </div>
              </div>
              <div className="flex gap-3">
                {chartUrl && (
                  <Button
                    onClick={handleDeleteChart}
                    variant="outline"
                    className="border-red-600/50 text-red-500 hover:bg-red-600/10"
                  >
                    <Icon name="Trash2" size={18} className="mr-2" />
                    Удалить
                  </Button>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  id="excel-upload"
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById('excel-upload')?.click()}
                  disabled={isUploading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Icon name="Upload" size={18} className="mr-2" />
                  {isUploading ? 'Загрузка...' : 'Загрузить Excel'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {chartUrl && (
          <Card className="mb-6 p-6 bg-slate-800/50 border-blue-600/30">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="FileSpreadsheet" size={24} className="text-blue-500" />
              <h3 className="text-lg font-semibold text-white">График личных показателей ПАБ</h3>
            </div>
            <a
              href={chartUrl}
              download="metrics-chart.xlsx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Icon name="Download" size={18} />
              Скачать график
            </a>
          </Card>
        )}

        {activeTab === 'pab' && (
          <MetricsCards type="pab" metrics={metrics} onMetricClick={handleMetricClick} />
        )}

        {activeTab === 'pk' && (
          <MetricsCards type="pk" metrics={pkMetrics} />
        )}
      </div>

      <ObservationsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        observations={selectedObservations}
        onObservationClick={handleObservationClick}
      />
    </div>
  );
};

export default MyMetricsPage;