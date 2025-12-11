import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle } from 'docx';

interface KBTFormData {
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
}

export default function KBTReportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<KBTFormData>({
    department: '',
    head_name: '',
    period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    sick_count: '0',
    suspended: '',
    injuries: '',
    micro_injuries: '',
    sick_leave: '',
    accidents: '',
    acts_count: '0',
    inspector: '',
    violations_count: '0',
    responsible_person: '',
    fixed_count: '0',
    in_progress_count: '0',
    overdue_count: '0',
    reasons: '',
    actions_taken: '',
    internal_checks_count: '0',
    internal_violations_count: '0',
    internal_responsible: '',
    internal_fixed_count: '0',
    internal_in_progress_count: '0',
    internal_overdue_count: '0',
    internal_reasons: '',
    internal_actions_taken: '',
    gov_agency: '',
    act_number: '',
    gov_violations: '',
    gov_responsible: '',
    gov_fixed_count: '0',
    gov_in_progress_count: '0',
    gov_overdue_count: '0',
    gov_reasons: '',
    pab_plan_department: '0',
    pab_fact_department: '0',
    pab_diff_department: '0',
    pab_reason_department: '',
    pab_plan_personal: '0',
    pab_fact_personal: '0',
    pab_diff_personal: '0',
    pab_reason_personal: '',
    tools_condition: '',
    workplaces_condition: '',
    improvement_measures: '',
    involved_workers_count: '0',
    involved_workers_list: '',
    not_involved_workers_count: '0',
    involved_engineers_count: '0',
    involved_engineers_list: '',
    not_involved_engineers_count: '0',
    involvement_work: ''
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    
    const userFio = localStorage.getItem('userFio') || '';
    const userCompany = localStorage.getItem('userCompany') || 'АО "ГРК "Западная"';
    const userDepartment = localStorage.getItem('userDepartment') || '';
    
    setFormData(prev => ({
      ...prev,
      head_name: userFio,
      department: userDepartment || userCompany
    }));
  }, [navigate]);

  const updateField = (field: keyof KBTFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'pab_plan_department' || field === 'pab_fact_department') {
        const plan = parseFloat(field === 'pab_plan_department' ? value : prev.pab_plan_department) || 0;
        const fact = parseFloat(field === 'pab_fact_department' ? value : prev.pab_fact_department) || 0;
        updated.pab_diff_department = String(fact - plan);
      }
      
      if (field === 'pab_plan_personal' || field === 'pab_fact_personal') {
        const plan = parseFloat(field === 'pab_plan_personal' ? value : prev.pab_plan_personal) || 0;
        const fact = parseFloat(field === 'pab_fact_personal' ? value : prev.pab_fact_personal) || 0;
        updated.pab_diff_personal = String(fact - plan);
      }
      
      return updated;
    });
  };

  const handleTextareaChange = (field: keyof KBTFormData, value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateField(field, value);
    event.target.style.height = 'auto';
    event.target.style.height = event.target.scrollHeight + 'px';
  };

  const handleSave = async () => {
    if (!formData.department || !formData.head_name) {
      toast.error('Заполните обязательные поля: Подразделение и ФИО руководителя');
      return;
    }

    setLoading(true);
    
    try {
      const reportData = {
        ...formData,
        user_id: localStorage.getItem('userId'),
        organization_id: localStorage.getItem('organizationId'),
        created_at: new Date().toISOString()
      };

      const reportsKey = 'kbt_reports';
      const existingReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');
      existingReports.push(reportData);
      localStorage.setItem(reportsKey, JSON.stringify(existingReports));

      toast.success('Отчет успешно сохранен!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Ошибка при сохранении отчета');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: 'АО «ГРК «Западная» Рудник «Бадран»',
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                style: 'Heading1'
              }),
              new Paragraph({
                text: 'Форма отчета на КБТ',
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                style: 'Heading2'
              }),
              new Paragraph({
                text: 'Любое совещание всегда начинать с Контакта по безопасности. После отчета будьте готовы ответить на вопросы.',
                spacing: { after: 300 },
                italics: true
              }),
              new Paragraph({
                text: 'Основная информация',
                spacing: { after: 200 },
                bold: true
              }),
              new Paragraph({ text: `Подразделение: ${formData.department}`, spacing: { after: 100 } }),
              new Paragraph({ text: `ФИО руководителя подразделения: ${formData.head_name}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Отчетный период: С ${formData.period_from} ПО ${formData.period_to}`, spacing: { after: 300 } }),
              new Paragraph({ text: 'Медпункт', spacing: { after: 200 }, bold: true }),
              new Paragraph({ text: `Заболевших (чел.): ${formData.sick_count}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Отстранено от работы: ${formData.suspended}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Травм: ${formData.injuries}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Микротравм: ${formData.micro_injuries}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Больничный лист: ${formData.sick_leave}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Допущено Н/С: ${formData.accidents}`, spacing: { after: 300 } }),
              new Paragraph({ text: 'Проверки, проведенные отделом ОТ и ПБ', spacing: { after: 200 }, bold: true }),
              new Paragraph({ text: `Выдано АКТов: ${formData.acts_count}`, spacing: { after: 100 } }),
              new Paragraph({ text: `ФИО и должность выдавшего предписание: ${formData.inspector}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Выдано нарушений: ${formData.violations_count}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Ответственный за устранение: ${formData.responsible_person}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Устранено: ${formData.fixed_count}`, spacing: { after: 100 } }),
              new Paragraph({ text: `В работе не вышел срок: ${formData.in_progress_count}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Просрочено: ${formData.overdue_count}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Причины не выполнения: ${formData.reasons}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Что предпринято к нарушителям: ${formData.actions_taken}`, spacing: { after: 300 } })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Отчет_КБТ_${formData.department}_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Документ Word успешно скачан!');
    } catch (error) {
      console.error('Error exporting to Word:', error);
      toast.error('Ошибка при экспорте в Word');
    }
  };

  const handleExportExcel = () => {
    toast.info('Функция экспорта в Excel будет добавлена позже');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 print:bg-white">
      <Card className="max-w-5xl mx-auto p-8 print:shadow-none">
        <div className="header text-center mb-6 border-b-2 border-slate-300 pb-4 print:border-black">
          <h1 className="text-3xl font-bold text-slate-900">АО «ГРК «Западная» Рудник «Бадран»</h1>
          <h2 className="text-2xl font-semibold text-slate-700 mt-2">Форма отчета на КБТ</h2>
        </div>

        <div className="note bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 italic text-slate-700 print:border-black">
          Любое совещание всегда начинать с Контакта по безопасности. После отчета будьте готовы ответить на вопросы.
        </div>

        <div className="space-y-8">
          {/* Основная информация */}
          <div className="section border border-slate-300 p-4 print:border-black">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">Основная информация</h3>
            <div className="space-y-3">
              <div>
                <Label className="font-semibold">Подразделение *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  className={`print:border-none print:bg-transparent transition-colors ${formData.department.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  readOnly
                />
              </div>
              <div>
                <Label className="font-semibold">ФИО руководителя подразделения *</Label>
                <Input
                  value={formData.head_name}
                  onChange={(e) => updateField('head_name', e.target.value)}
                  className={`print:border-none print:bg-transparent transition-colors ${formData.head_name.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Отчетный период С</Label>
                  <Input
                    type="date"
                    value={formData.period_from}
                    onChange={(e) => updateField('period_from', e.target.value)}
                    className="print:border-none print:bg-transparent"
                  />
                </div>
                <div>
                  <Label className="font-semibold">ПО</Label>
                  <Input
                    type="date"
                    value={formData.period_to}
                    onChange={(e) => updateField('period_to', e.target.value)}
                    className="print:border-none print:bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Медпункт */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">Медпункт</h3>
            <div className="space-y-3">
              <div>
                <Label className="font-semibold">Заболевших (чел.)</Label>
                <Input
                  type="number"
                  value={formData.sick_count}
                  onChange={(e) => updateField('sick_count', e.target.value)}
                  className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.sick_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                />
              </div>
              <div>
                <Label className="font-semibold">Отстранено от работы (кол-во, диагноз)</Label>
                <Textarea
                  value={formData.suspended}
                  onChange={(e) => {
                    updateField('suspended', e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.suspended.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div>
                <Label className="font-semibold">Травм (кол-во, диагноз)</Label>
                <Textarea
                  value={formData.injuries}
                  onChange={(e) => handleTextareaChange('injuries', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.injuries.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div>
                <Label className="font-semibold">Микротравм (кол-во, диагноз)</Label>
                <Textarea
                  value={formData.micro_injuries}
                  onChange={(e) => handleTextareaChange('micro_injuries', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.micro_injuries.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div>
                <Label className="font-semibold">Больничный лист (кол-во, диагноз)</Label>
                <Textarea
                  value={formData.sick_leave}
                  onChange={(e) => handleTextareaChange('sick_leave', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.sick_leave.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div>
                <Label className="font-semibold">Допущено Н/С (кол-во, классификация Н/С, описание произошедшего)</Label>
                <Textarea
                  value={formData.accidents}
                  onChange={(e) => handleTextareaChange('accidents', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.accidents.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Проверки ОТ и ПБ */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">
              Проверки, проведенные отделом ОТ и ПБ, руководством предприятия
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Выдано АКТов (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.acts_count}
                    onChange={(e) => updateField('acts_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.acts_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Выдано нарушений (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.violations_count}
                    onChange={(e) => updateField('violations_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.violations_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">ФИО и должность выдавшего предписание</Label>
                <Textarea
                  value={formData.inspector}
                  onChange={(e) => handleTextareaChange('inspector', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.inspector.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div>
                <Label className="font-semibold">Ответственный за устранение (ФИО, должность)</Label>
                <Textarea
                  value={formData.responsible_person}
                  onChange={(e) => handleTextareaChange('responsible_person', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.responsible_person.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold">Устранено (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.fixed_count}
                    onChange={(e) => updateField('fixed_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.fixed_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">В работе не вышел срок (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.in_progress_count}
                    onChange={(e) => updateField('in_progress_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.in_progress_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Просрочено (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.overdue_count}
                    onChange={(e) => updateField('overdue_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.overdue_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">Причины не выполнения</Label>
                <Textarea
                  value={formData.reasons}
                  onChange={(e) => handleTextareaChange('reasons', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.reasons.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
              <div>
                <Label className="font-semibold">Что предпринято к нарушителям?</Label>
                <Textarea
                  value={formData.actions_taken}
                  onChange={(e) => handleTextareaChange('actions_taken', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.actions_taken.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Внутренние проверки */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">
              Внутренние проверки, проведенные руководством подразделения
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Проведено проверок (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.internal_checks_count}
                    onChange={(e) => updateField('internal_checks_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.internal_checks_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Выявлено нарушений (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.internal_violations_count}
                    onChange={(e) => updateField('internal_violations_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.internal_violations_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">Ответственный за устранение (ФИО, должность)</Label>
                <Textarea
                  value={formData.internal_responsible}
                  onChange={(e) => handleTextareaChange('internal_responsible', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.internal_responsible.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold">Устранено (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.internal_fixed_count}
                    onChange={(e) => updateField('internal_fixed_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.internal_fixed_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">В работе не вышел срок (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.internal_in_progress_count}
                    onChange={(e) => updateField('internal_in_progress_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.internal_in_progress_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Просрочено (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.internal_overdue_count}
                    onChange={(e) => updateField('internal_overdue_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.internal_overdue_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">Причины не выполнения</Label>
                <Textarea
                  value={formData.internal_reasons}
                  onChange={(e) => handleTextareaChange('internal_reasons', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.internal_reasons.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
              <div>
                <Label className="font-semibold">Что предпринято к нарушителям?</Label>
                <Textarea
                  value={formData.internal_actions_taken}
                  onChange={(e) => handleTextareaChange('internal_actions_taken', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.internal_actions_taken.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Проверки Госорганами */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">Проверки Госорганами</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Наименование Госоргана</Label>
                  <Input
                    value={formData.gov_agency}
                    onChange={(e) => updateField('gov_agency', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${formData.gov_agency.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Номер АКТа предписания</Label>
                  <Input
                    value={formData.act_number}
                    onChange={(e) => updateField('act_number', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${formData.act_number.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">Выявлено нарушений (кол-во, сроки устранения)</Label>
                <Textarea
                  value={formData.gov_violations}
                  onChange={(e) => handleTextareaChange('gov_violations', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.gov_violations.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
              <div>
                <Label className="font-semibold">Ответственный за устранение (ФИО, должность)</Label>
                <Textarea
                  value={formData.gov_responsible}
                  onChange={(e) => handleTextareaChange('gov_responsible', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.gov_responsible.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold">Устранено (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.gov_fixed_count}
                    onChange={(e) => updateField('gov_fixed_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.gov_fixed_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">В работе не вышел срок (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.gov_in_progress_count}
                    onChange={(e) => updateField('gov_in_progress_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.gov_in_progress_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Просрочено (кол-во)</Label>
                  <Input
                    type="number"
                    value={formData.gov_overdue_count}
                    onChange={(e) => updateField('gov_overdue_count', e.target.value)}
                    className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.gov_overdue_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">Причины не выполнения</Label>
                <Textarea
                  value={formData.gov_reasons}
                  onChange={(e) => handleTextareaChange('gov_reasons', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.gov_reasons.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ПАБ */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">
              Поведенческий Аудит Безопасности (ПАБ)
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Выполнение показателей ПАБ по подразделению</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>План по подразделению (кол-во)</Label>
                    <Input
                      type="number"
                      value={formData.pab_plan_department}
                      onChange={(e) => updateField('pab_plan_department', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.pab_plan_department) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>Факт по подразделению (кол-во)</Label>
                    <Input
                      type="number"
                      value={formData.pab_fact_department}
                      onChange={(e) => updateField('pab_fact_department', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.pab_fact_department) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>Разница (кол-во)</Label>
                    <Input
                      type="number"
                      value={formData.pab_diff_department}
                      readOnly
                      className="bg-slate-100 print:border-none print:bg-transparent"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Причина не выполнения</Label>
                  <Textarea
                    value={formData.pab_reason_department}
                    onChange={(e) => updateField('pab_reason_department', e.target.value)}
                    className="print:border-none print:bg-transparent"
                    rows={2}
                  />
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Выполнение личных показателей ПАБ</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>План (кол-во)</Label>
                    <Input
                      type="number"
                      value={formData.pab_plan_personal}
                      onChange={(e) => updateField('pab_plan_personal', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.pab_plan_personal) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>Факт (кол-во)</Label>
                    <Input
                      type="number"
                      value={formData.pab_fact_personal}
                      onChange={(e) => updateField('pab_fact_personal', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.pab_fact_personal) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>Разница (кол-во)</Label>
                    <Input
                      type="number"
                      value={formData.pab_diff_personal}
                      readOnly
                      className="bg-slate-100 print:border-none print:bg-transparent"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Причина не выполнения</Label>
                  <Textarea
                    value={formData.pab_reason_personal}
                    onChange={(e) => updateField('pab_reason_personal', e.target.value)}
                    className="print:border-none print:bg-transparent"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Состояние инструмента и оборудования */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">
              Состояние инструмента, оборудования
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="font-semibold">Состояние инструмента, оборудования</Label>
                <Textarea
                  value={formData.tools_condition}
                  onChange={(e) => handleTextareaChange('tools_condition', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.tools_condition.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
              <div>
                <Label className="font-semibold">Состояние рабочих мест</Label>
                <Textarea
                  value={formData.workplaces_condition}
                  onChange={(e) => handleTextareaChange('workplaces_condition', e.target.value, e)}
                  className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.workplaces_condition.trim() ? 'bg-green-100 border-green-400' : ''}`}
                  rows={3}
                />
              </div>
              <div>
                <Label className="font-semibold">
                  Какие мероприятия были разработаны для улучшения условий и безопасности труда?
                </Label>
                <Textarea
                  value={formData.improvement_measures}
                  onChange={(e) => updateField('improvement_measures', e.target.value)}
                  className="print:border-none print:bg-transparent"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Вовлечение персонала */}
          <div className="section border border-slate-300 p-4 print:border-black print:break-inside-avoid">
            <h3 className="section-title text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">
              Вовлечение рабочего персонала и ИТР в безопасность труда
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Рабочий персонал</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Количество вовлеченных работников (чел)</Label>
                    <Input
                      type="number"
                      value={formData.involved_workers_count}
                      onChange={(e) => updateField('involved_workers_count', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.involved_workers_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>Количество не вовлеченных работников (чел)</Label>
                    <Input
                      type="number"
                      value={formData.not_involved_workers_count}
                      onChange={(e) => updateField('not_involved_workers_count', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.not_involved_workers_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>ФИО, профессия вовлеченных работников</Label>
                  <Textarea
                    value={formData.involved_workers_list}
                    onChange={(e) => handleTextareaChange('involved_workers_list', e.target.value, e)}
                    className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.involved_workers_list.trim() ? 'bg-green-100 border-green-400' : ''}`}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">ИТР</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Количество вовлеченных ИТР (чел)</Label>
                    <Input
                      type="number"
                      value={formData.involved_engineers_count}
                      onChange={(e) => updateField('involved_engineers_count', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.involved_engineers_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>Количество не вовлеченных ИТР (чел)</Label>
                    <Input
                      type="number"
                      value={formData.not_involved_engineers_count}
                      onChange={(e) => updateField('not_involved_engineers_count', e.target.value)}
                      className={`print:border-none print:bg-transparent transition-colors ${parseFloat(formData.not_involved_engineers_count) > 0 ? 'bg-green-100 border-green-400' : ''}`}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>ФИО, должность вовлеченных ИТР</Label>
                  <Textarea
                    value={formData.involved_engineers_list}
                    onChange={(e) => handleTextareaChange('involved_engineers_list', e.target.value, e)}
                    className={`print:border-none print:bg-transparent transition-colors resize-none ${formData.involved_engineers_list.trim() ? 'bg-green-100 border-green-400' : ''}`}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label className="font-semibold">Какая работа проводится в направлении вовлеченности?</Label>
                <Textarea
                  value={formData.involvement_work}
                  onChange={(e) => updateField('involvement_work', e.target.value)}
                  className="print:border-none print:bg-transparent"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="buttons mt-8 flex gap-3 justify-center print:hidden">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="border-red-500 text-red-500 hover:bg-red-50">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
            <Icon name="Save" size={20} className="mr-2" />
            {loading ? 'Сохранение...' : 'Сохранить отчет'}
          </Button>
          <Button onClick={handleExportWord} variant="outline" className="border-blue-700 text-blue-700 hover:bg-blue-50">
            <Icon name="FileText" size={20} className="mr-2" />
            Скачать в Word
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="border-green-700 text-green-700 hover:bg-green-50">
            <Icon name="FileSpreadsheet" size={20} className="mr-2" />
            Скачать в Excel
          </Button>
          <Button onClick={handlePrint} variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
            <Icon name="Printer" size={20} className="mr-2" />
            Распечатать
          </Button>
        </div>
      </Card>
    </div>
  );
}