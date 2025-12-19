import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface KBTReport {
  id: number;
  department: string;
  head_name: string;
  period_from: string;
  period_to: string;
  sick_count: string;
  suspended: string;
  injuries: string;
  micro_injuries: string;
  sick_leave: string;
  accidents: string;
  acts_count: string;
  inspector: string;
  violations_count: string;
  responsible_person: string;
  fixed_count: string;
  in_progress_count: string;
  overdue_count: string;
  reasons: string;
  actions_taken: string;
  internal_checks_count: string;
  internal_violations_count: string;
  internal_responsible: string;
  internal_fixed_count: string;
  internal_in_progress_count: string;
  internal_overdue_count: string;
  internal_reasons: string;
  internal_actions_taken: string;
  gov_agency: string;
  act_number: string;
  gov_violations: string;
  gov_responsible: string;
  gov_fixed_count: string;
  gov_in_progress_count: string;
  gov_overdue_count: string;
  gov_reasons: string;
  pab_plan_department: string;
  pab_fact_department: string;
  pab_diff_department: string;
  pab_reason_department: string;
  pab_plan_personal: string;
  pab_fact_personal: string;
  pab_diff_personal: string;
  pab_reason_personal: string;
  tools_condition: string;
  workplaces_condition: string;
  improvement_measures: string;
  involved_workers_count: string;
  involved_workers_list: string;
  not_involved_workers_count: string;
  involved_engineers_count: string;
  involved_engineers_list: string;
  not_involved_engineers_count: string;
  involvement_work: string;
  created_at: string;
}

const KBTReportViewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<KBTReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadReport();
  }, [navigate, id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const orgId = localStorage.getItem('organizationId');
      const response = await fetch(`https://functions.poehali.dev/7abe1e4c-3790-4bcd-9d37-4967f7dfb8ca?organization_id=${orgId}&report_id=${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        toast.error('Отчёт не найден');
        navigate('/kbt-reports');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Ошибка загрузки отчёта');
      navigate('/kbt-reports');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-slate-800/50 border-purple-500/30 p-12">
            <div className="flex items-center justify-center gap-3">
              <Icon name="Loader2" size={32} className="text-purple-400 animate-spin" />
              <span className="text-white text-lg">Загрузка отчёта...</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/kbt-reports')}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Icon name="FileText" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Отчёт КБТ #{report.id}</h1>
                <p className="text-slate-400 text-sm">Создан: {formatDate(report.created_at)}</p>
              </div>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
          >
            <Icon name="Printer" size={20} className="mr-2" />
            Распечатать
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-purple-500/30 p-8 print:bg-white print:border-black">
          <div className="space-y-8">
            <div className="text-center border-b border-purple-500/30 pb-6 print:border-black">
              <h2 className="text-2xl font-bold text-white print:text-black mb-2">
                АО «ГРК «Западная» Рудник «Бадран»
              </h2>
              <h3 className="text-xl font-semibold text-purple-400 print:text-black">
                Форма отчета на КБТ
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white print:text-black">
              <div>
                <span className="font-semibold">Подразделение:</span> {report.department}
              </div>
              <div>
                <span className="font-semibold">Руководитель:</span> {report.head_name}
              </div>
              <div>
                <span className="font-semibold">Период:</span> {formatDate(report.period_from)} - {formatDate(report.period_to)}
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">1. Травматизм и несчастные случаи</h3>
              <div className="space-y-3 text-white print:text-black">
                <div><span className="font-semibold">Количество больничных:</span> {report.sick_count}</div>
                <div><span className="font-semibold">Отстранено от работы:</span> {report.suspended || 'Нет данных'}</div>
                <div><span className="font-semibold">Травмы:</span> {report.injuries || 'Нет данных'}</div>
                <div><span className="font-semibold">Микротравмы:</span> {report.micro_injuries || 'Нет данных'}</div>
                <div><span className="font-semibold">Больничные листы:</span> {report.sick_leave || 'Нет данных'}</div>
                <div><span className="font-semibold">Несчастные случаи:</span> {report.accidents || 'Нет данных'}</div>
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">2. Внешние проверки контролирующих органов</h3>
              <div className="space-y-3 text-white print:text-black">
                <div><span className="font-semibold">Количество актов:</span> {report.acts_count}</div>
                <div><span className="font-semibold">Инспектор:</span> {report.inspector || 'Нет данных'}</div>
                <div><span className="font-semibold">Количество нарушений:</span> {report.violations_count}</div>
                <div><span className="font-semibold">Ответственный:</span> {report.responsible_person || 'Нет данных'}</div>
                <div><span className="font-semibold">Исправлено:</span> {report.fixed_count}</div>
                <div><span className="font-semibold">На исполнении:</span> {report.in_progress_count}</div>
                <div><span className="font-semibold">Просрочено:</span> {report.overdue_count}</div>
                <div><span className="font-semibold">Причины просрочки:</span> {report.reasons || 'Нет данных'}</div>
                <div><span className="font-semibold">Принятые меры:</span> {report.actions_taken || 'Нет данных'}</div>
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">3. Внутренние проверки</h3>
              <div className="space-y-3 text-white print:text-black">
                <div><span className="font-semibold">Количество проверок:</span> {report.internal_checks_count}</div>
                <div><span className="font-semibold">Количество нарушений:</span> {report.internal_violations_count}</div>
                <div><span className="font-semibold">Ответственный:</span> {report.internal_responsible || 'Нет данных'}</div>
                <div><span className="font-semibold">Исправлено:</span> {report.internal_fixed_count}</div>
                <div><span className="font-semibold">На исполнении:</span> {report.internal_in_progress_count}</div>
                <div><span className="font-semibold">Просрочено:</span> {report.internal_overdue_count}</div>
                <div><span className="font-semibold">Причины просрочки:</span> {report.internal_reasons || 'Нет данных'}</div>
                <div><span className="font-semibold">Принятые меры:</span> {report.internal_actions_taken || 'Нет данных'}</div>
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">4. Проверки государственных органов</h3>
              <div className="space-y-3 text-white print:text-black">
                <div><span className="font-semibold">Орган контроля:</span> {report.gov_agency || 'Нет данных'}</div>
                <div><span className="font-semibold">Номер акта:</span> {report.act_number || 'Нет данных'}</div>
                <div><span className="font-semibold">Выявленные нарушения:</span> {report.gov_violations || 'Нет данных'}</div>
                <div><span className="font-semibold">Ответственный:</span> {report.gov_responsible || 'Нет данных'}</div>
                <div><span className="font-semibold">Исправлено:</span> {report.gov_fixed_count}</div>
                <div><span className="font-semibold">На исполнении:</span> {report.gov_in_progress_count}</div>
                <div><span className="font-semibold">Просрочено:</span> {report.gov_overdue_count}</div>
                <div><span className="font-semibold">Причины просрочки:</span> {report.gov_reasons || 'Нет данных'}</div>
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">5. ПАБ (План-Факт-Отклонение)</h3>
              <div className="space-y-4 text-white print:text-black">
                <div>
                  <h4 className="font-semibold mb-2">Департаментские</h4>
                  <div className="pl-4 space-y-2">
                    <div>План: {report.pab_plan_department}</div>
                    <div>Факт: {report.pab_fact_department}</div>
                    <div>Отклонение: {report.pab_diff_department}</div>
                    <div>Причина: {report.pab_reason_department || 'Нет данных'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Персональные</h4>
                  <div className="pl-4 space-y-2">
                    <div>План: {report.pab_plan_personal}</div>
                    <div>Факт: {report.pab_fact_personal}</div>
                    <div>Отклонение: {report.pab_diff_personal}</div>
                    <div>Причина: {report.pab_reason_personal || 'Нет данных'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">6. Состояние оборудования и рабочих мест</h3>
              <div className="space-y-3 text-white print:text-black">
                <div><span className="font-semibold">Состояние инструментов и оборудования:</span> {report.tools_condition || 'Нет данных'}</div>
                <div><span className="font-semibold">Состояние рабочих мест:</span> {report.workplaces_condition || 'Нет данных'}</div>
                <div><span className="font-semibold">Мероприятия по улучшению:</span> {report.improvement_measures || 'Нет данных'}</div>
              </div>
            </div>

            <div className="border-t border-purple-500/30 pt-6 print:border-black">
              <h3 className="text-xl font-bold text-purple-400 mb-4 print:text-black">7. Вовлеченность персонала</h3>
              <div className="space-y-3 text-white print:text-black">
                <div><span className="font-semibold">Вовлечено рабочих:</span> {report.involved_workers_count}</div>
                <div><span className="font-semibold">Не вовлечено рабочих:</span> {report.not_involved_workers_count}</div>
                <div><span className="font-semibold">Список вовлеченных рабочих:</span> {report.involved_workers_list || 'Нет данных'}</div>
                <div><span className="font-semibold">Вовлечено ИТР:</span> {report.involved_engineers_count}</div>
                <div><span className="font-semibold">Не вовлечено ИТР:</span> {report.not_involved_engineers_count}</div>
                <div><span className="font-semibold">Список вовлеченных ИТР:</span> {report.involved_engineers_list || 'Нет данных'}</div>
                <div><span className="font-semibold">Проделанная работа:</span> {report.involvement_work || 'Нет данных'}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default KBTReportViewPage;
