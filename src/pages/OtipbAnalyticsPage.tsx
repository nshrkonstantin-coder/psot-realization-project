import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const OtipbAnalyticsPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    const department = localStorage.getItem('userDepartment');
    setHasAccess(department === 'ОТиПБ' || department === 'Отдел ОТиПБ' || department === 'Дирекция по ОТ и ПБ');
  }, [navigate]);

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    navigate('/otipb-department');
    return null;
  }

  const kpiCards = [
    { label: 'Инструктажи за месяц', value: 245, change: '+12%', icon: 'GraduationCap', color: 'blue' },
    { label: 'Проведено проверок', value: 18, change: '+3', icon: 'ClipboardCheck', color: 'green' },
    { label: 'Выявлено нарушений', value: 7, change: '-5', icon: 'AlertTriangle', color: 'orange' },
    { label: 'Выдано СИЗ', value: 156, change: '+24', icon: 'HardHat', color: 'purple' },
  ];

  const reportTypes = [
    { name: 'Отчет по инструктажам', icon: 'FileText', description: 'Статистика проведенных инструктажей' },
    { name: 'Отчет по проверкам', icon: 'ClipboardCheck', description: 'Результаты плановых и внеплановых проверок' },
    { name: 'Отчет по происшествиям', icon: 'AlertCircle', description: 'Анализ происшествий и травматизма' },
    { name: 'Отчет по СИЗ', icon: 'Package', description: 'Выдача и наличие средств защиты' },
    { name: 'Сводный отчет', icon: 'BarChart3', description: 'Общая статистика по всем направлениям' },
    { name: 'Отчет для руководства', icon: 'FileCheck', description: 'Презентация для руководства организации' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/otipb-department')}
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                <Icon name="BarChart3" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Аналитика</h1>
                <p className="text-slate-400 text-sm mt-1">Статистика и отчетность</p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white">
            <Icon name="Download" size={20} className="mr-2" />
            Экспорт данных
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className="bg-slate-800/50 border-cyan-500/30 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className={`bg-gradient-to-br from-${kpi.color}-500 to-${kpi.color}-600 p-3 rounded-xl`}>
                  <Icon name={kpi.icon} size={24} className="text-white" />
                </div>
                <span className={`text-sm font-medium ${kpi.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {kpi.change}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-1">{kpi.label}</p>
              <p className="text-3xl font-bold text-white">{kpi.value}</p>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-cyan-500/30 mb-8">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="TrendingUp" size={24} />
              Динамика показателей
            </h2>
          </div>
          <div className="p-12 text-center">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-2xl shadow-lg inline-block mb-6">
              <Icon name="LineChart" size={64} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Графики и диаграммы</h3>
            <p className="text-slate-400">Визуализация данных находится в разработке</p>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-cyan-500/30">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="FileSpreadsheet" size={24} />
              Шаблоны отчетов
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {reportTypes.map((report, index) => (
              <Card 
                key={index}
                className="group bg-slate-700/30 border-cyan-500/20 hover:border-cyan-500 p-6 cursor-pointer transition-all hover:scale-105"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-4 rounded-xl group-hover:scale-110 transition-transform">
                    <Icon name={report.icon} size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                      {report.name}
                    </h3>
                    <p className="text-sm text-slate-400">{report.description}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
                  >
                    <Icon name="FileDown" size={16} className="mr-2" />
                    Сформировать
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OtipbAnalyticsPage;