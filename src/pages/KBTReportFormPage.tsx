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

export default function KBTReportFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
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
    const role = localStorage.getItem('userRole') || 'user';
    
    setUserRole(role);
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
      const userId = localStorage.getItem('userId');
      const organizationId = localStorage.getItem('organizationId');
      
      toast.info('Сохранение в базу данных...');
      const response = await fetch('https://functions.poehali.dev/7abe1e4c-3790-4bcd-9d37-4967f7dfb8ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: parseInt(userId!),
          organization_id: parseInt(organizationId!),
          word_file_url: ''
        })
      });

      const result = await response.json();

      if (result.success) {
        const notificationData = {
          form_type: 'kbt',
          doc_number: `КБТ-${formData.department}`,
          report_id: result.report_id,
          organization_id: parseInt(organizationId!),
          responsible_user_ids: [],
          form_data: formData
        };
        
        fetch('https://functions.poehali.dev/4a977fe4-5b7e-477d-b142-d85522845415', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationData)
        }).then(res => res.json()).then(notifResult => {
          if (notifResult.success) {
            console.log(`Уведомления отправлены: ${notifResult.chat_notifications_sent} в чат, email: ${notifResult.email_sent}`);
          }
        }).catch(err => console.error('Error sending notifications:', err));
        
        toast.success(
          <div className="flex flex-col gap-2">
            <div className="font-bold">✅ Отчёт КБТ успешно сохранён!</div>
            <div className="text-sm text-gray-600">
              <strong>Подразделение:</strong> {formData.department}<br/>
              <strong>Руководитель:</strong> {formData.head_name}<br/>
              <strong>Период:</strong> {formData.period_from} - {formData.period_to}<br/>
              <strong>ID в базе:</strong> {result.report_id}<br/>
              <strong>📧 Уведомления:</strong> Отправлены администратору
            </div>
          </div>,
          {
            duration: 5000,
            closeButton: true
          }
        );
        
        setTimeout(() => navigate('/kbt'), 2000);
      } else {
        toast.error(result.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения формы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/kbt')}
            variant="outline"
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <Icon name="FileText" size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">АО «ГРК «Западная» Рудник «Бадран» Форма отчета на КБТ</h1>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-blue-500/30 p-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="department" className="text-white font-medium mb-2 block">Подразделение *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                  placeholder="Например: Участок №1"
                />
              </div>
              <div>
                <Label htmlFor="head_name" className="text-white font-medium mb-2 block">ФИО руководителя *</Label>
                <Input
                  id="head_name"
                  value={formData.head_name}
                  onChange={(e) => updateField('head_name', e.target.value)}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                />
              </div>
              <div>
                <Label htmlFor="period_from" className="text-white font-medium mb-2 block">Период с</Label>
                <Input
                  id="period_from"
                  type="date"
                  value={formData.period_from}
                  onChange={(e) => updateField('period_from', e.target.value)}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                />
              </div>
              <div>
                <Label htmlFor="period_to" className="text-white font-medium mb-2 block">Период по</Label>
                <Input
                  id="period_to"
                  type="date"
                  value={formData.period_to}
                  onChange={(e) => updateField('period_to', e.target.value)}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                />
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">1. Травматизм и несчастные случаи</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sick_count" className="text-white mb-2 block">Количество больничных</Label>
                  <Input
                    id="sick_count"
                    type="number"
                    value={formData.sick_count}
                    onChange={(e) => updateField('sick_count', e.target.value)}
                    className="bg-slate-700/50 border-blue-500/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="suspended" className="text-white mb-2 block">Кол-во отстраненных от работы</Label>
                  <Input
                    id="suspended"
                    value={formData.suspended}
                    onChange={(e) => updateField('suspended', e.target.value)}
                    className="bg-slate-700/50 border-blue-500/30 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="injuries" className="text-white mb-2 block">Травмы (описание)</Label>
                  <Textarea
                    id="injuries"
                    value={formData.injuries}
                    onChange={(e) => handleTextareaChange('injuries', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[60px]"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="micro_injuries" className="text-white mb-2 block">Микротравмы</Label>
                  <Textarea
                    id="micro_injuries"
                    value={formData.micro_injuries}
                    onChange={(e) => handleTextareaChange('micro_injuries', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[60px]"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="sick_leave" className="text-white mb-2 block">Больничные листы</Label>
                  <Textarea
                    id="sick_leave"
                    value={formData.sick_leave}
                    onChange={(e) => handleTextareaChange('sick_leave', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[60px]"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="accidents" className="text-white mb-2 block">Несчастные случаи</Label>
                  <Textarea
                    id="accidents"
                    value={formData.accidents}
                    onChange={(e) => handleTextareaChange('accidents', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">2. Внешние проверки контролирующих органов</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="acts_count" className="text-white mb-2 block">Количество актов</Label>
                    <Input
                      id="acts_count"
                      type="number"
                      value={formData.acts_count}
                      onChange={(e) => updateField('acts_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inspector" className="text-white mb-2 block">Инспектор</Label>
                    <Input
                      id="inspector"
                      value={formData.inspector}
                      onChange={(e) => updateField('inspector', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="violations_count" className="text-white mb-2 block">Количество нарушений</Label>
                    <Input
                      id="violations_count"
                      type="number"
                      value={formData.violations_count}
                      onChange={(e) => updateField('violations_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="responsible_person" className="text-white mb-2 block">Ответственный</Label>
                  <Input
                    id="responsible_person"
                    value={formData.responsible_person}
                    onChange={(e) => updateField('responsible_person', e.target.value)}
                    className="bg-slate-700/50 border-blue-500/30 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fixed_count" className="text-white mb-2 block">Исправлено</Label>
                    <Input
                      id="fixed_count"
                      type="number"
                      value={formData.fixed_count}
                      onChange={(e) => updateField('fixed_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="in_progress_count" className="text-white mb-2 block">На исполнении</Label>
                    <Input
                      id="in_progress_count"
                      type="number"
                      value={formData.in_progress_count}
                      onChange={(e) => updateField('in_progress_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="overdue_count" className="text-white mb-2 block">Просрочено</Label>
                    <Input
                      id="overdue_count"
                      type="number"
                      value={formData.overdue_count}
                      onChange={(e) => updateField('overdue_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reasons" className="text-white mb-2 block">Причины просрочки</Label>
                  <Textarea
                    id="reasons"
                    value={formData.reasons}
                    onChange={(e) => handleTextareaChange('reasons', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="actions_taken" className="text-white mb-2 block">Принятые меры</Label>
                  <Textarea
                    id="actions_taken"
                    value={formData.actions_taken}
                    onChange={(e) => handleTextareaChange('actions_taken', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">3. Внутренние проверки</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="internal_checks_count" className="text-white mb-2 block">Количество проверок</Label>
                    <Input
                      id="internal_checks_count"
                      type="number"
                      value={formData.internal_checks_count}
                      onChange={(e) => updateField('internal_checks_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal_violations_count" className="text-white mb-2 block">Количество нарушений</Label>
                    <Input
                      id="internal_violations_count"
                      type="number"
                      value={formData.internal_violations_count}
                      onChange={(e) => updateField('internal_violations_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="internal_responsible" className="text-white mb-2 block">Ответственный</Label>
                  <Input
                    id="internal_responsible"
                    value={formData.internal_responsible}
                    onChange={(e) => updateField('internal_responsible', e.target.value)}
                    className="bg-slate-700/50 border-blue-500/30 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="internal_fixed_count" className="text-white mb-2 block">Исправлено</Label>
                    <Input
                      id="internal_fixed_count"
                      type="number"
                      value={formData.internal_fixed_count}
                      onChange={(e) => updateField('internal_fixed_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal_in_progress_count" className="text-white mb-2 block">На исполнении</Label>
                    <Input
                      id="internal_in_progress_count"
                      type="number"
                      value={formData.internal_in_progress_count}
                      onChange={(e) => updateField('internal_in_progress_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal_overdue_count" className="text-white mb-2 block">Просрочено</Label>
                    <Input
                      id="internal_overdue_count"
                      type="number"
                      value={formData.internal_overdue_count}
                      onChange={(e) => updateField('internal_overdue_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="internal_reasons" className="text-white mb-2 block">Причины просрочки</Label>
                  <Textarea
                    id="internal_reasons"
                    value={formData.internal_reasons}
                    onChange={(e) => handleTextareaChange('internal_reasons', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="internal_actions_taken" className="text-white mb-2 block">Принятые меры</Label>
                  <Textarea
                    id="internal_actions_taken"
                    value={formData.internal_actions_taken}
                    onChange={(e) => handleTextareaChange('internal_actions_taken', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">4. Проверки государственных органов</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gov_agency" className="text-white mb-2 block">Орган контроля</Label>
                    <Input
                      id="gov_agency"
                      value={formData.gov_agency}
                      onChange={(e) => updateField('gov_agency', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="act_number" className="text-white mb-2 block">Номер акта</Label>
                    <Input
                      id="act_number"
                      value={formData.act_number}
                      onChange={(e) => updateField('act_number', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="gov_violations" className="text-white mb-2 block">Выявленные нарушения</Label>
                  <Textarea
                    id="gov_violations"
                    value={formData.gov_violations}
                    onChange={(e) => handleTextareaChange('gov_violations', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="gov_responsible" className="text-white mb-2 block">Ответственный</Label>
                  <Input
                    id="gov_responsible"
                    value={formData.gov_responsible}
                    onChange={(e) => updateField('gov_responsible', e.target.value)}
                    className="bg-slate-700/50 border-blue-500/30 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="gov_fixed_count" className="text-white mb-2 block">Исправлено</Label>
                    <Input
                      id="gov_fixed_count"
                      type="number"
                      value={formData.gov_fixed_count}
                      onChange={(e) => updateField('gov_fixed_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gov_in_progress_count" className="text-white mb-2 block">На исполнении</Label>
                    <Input
                      id="gov_in_progress_count"
                      type="number"
                      value={formData.gov_in_progress_count}
                      onChange={(e) => updateField('gov_in_progress_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gov_overdue_count" className="text-white mb-2 block">Просрочено</Label>
                    <Input
                      id="gov_overdue_count"
                      type="number"
                      value={formData.gov_overdue_count}
                      onChange={(e) => updateField('gov_overdue_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="gov_reasons" className="text-white mb-2 block">Причины просрочки</Label>
                  <Textarea
                    id="gov_reasons"
                    value={formData.gov_reasons}
                    onChange={(e) => handleTextareaChange('gov_reasons', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">5. ПАБ (План-Факт-Отклонение)</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Департаментские</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="pab_plan_department" className="text-white mb-2 block">План</Label>
                      <Input
                        id="pab_plan_department"
                        type="number"
                        value={formData.pab_plan_department}
                        onChange={(e) => updateField('pab_plan_department', e.target.value)}
                        className="bg-slate-700/50 border-blue-500/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pab_fact_department" className="text-white mb-2 block">Факт</Label>
                      <Input
                        id="pab_fact_department"
                        type="number"
                        value={formData.pab_fact_department}
                        onChange={(e) => updateField('pab_fact_department', e.target.value)}
                        className="bg-slate-700/50 border-blue-500/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pab_diff_department" className="text-white mb-2 block">Отклонение</Label>
                      <Input
                        id="pab_diff_department"
                        type="number"
                        value={formData.pab_diff_department}
                        disabled
                        className="bg-slate-700/30 border-blue-500/20 text-slate-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pab_reason_department" className="text-white mb-2 block">Причина</Label>
                      <Input
                        id="pab_reason_department"
                        value={formData.pab_reason_department}
                        onChange={(e) => updateField('pab_reason_department', e.target.value)}
                        className="bg-slate-700/50 border-blue-500/30 text-white"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Персональные</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="pab_plan_personal" className="text-white mb-2 block">План</Label>
                      <Input
                        id="pab_plan_personal"
                        type="number"
                        value={formData.pab_plan_personal}
                        onChange={(e) => updateField('pab_plan_personal', e.target.value)}
                        className="bg-slate-700/50 border-blue-500/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pab_fact_personal" className="text-white mb-2 block">Факт</Label>
                      <Input
                        id="pab_fact_personal"
                        type="number"
                        value={formData.pab_fact_personal}
                        onChange={(e) => updateField('pab_fact_personal', e.target.value)}
                        className="bg-slate-700/50 border-blue-500/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pab_diff_personal" className="text-white mb-2 block">Отклонение</Label>
                      <Input
                        id="pab_diff_personal"
                        type="number"
                        value={formData.pab_diff_personal}
                        disabled
                        className="bg-slate-700/30 border-blue-500/20 text-slate-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pab_reason_personal" className="text-white mb-2 block">Причина</Label>
                      <Input
                        id="pab_reason_personal"
                        value={formData.pab_reason_personal}
                        onChange={(e) => updateField('pab_reason_personal', e.target.value)}
                        className="bg-slate-700/50 border-blue-500/30 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">6. Состояние оборудования и рабочих мест</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tools_condition" className="text-white mb-2 block">Состояние инструментов и оборудования</Label>
                  <Textarea
                    id="tools_condition"
                    value={formData.tools_condition}
                    onChange={(e) => handleTextareaChange('tools_condition', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="workplaces_condition" className="text-white mb-2 block">Состояние рабочих мест</Label>
                  <Textarea
                    id="workplaces_condition"
                    value={formData.workplaces_condition}
                    onChange={(e) => handleTextareaChange('workplaces_condition', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="improvement_measures" className="text-white mb-2 block">Мероприятия по улучшению</Label>
                  <Textarea
                    id="improvement_measures"
                    value={formData.improvement_measures}
                    onChange={(e) => handleTextareaChange('improvement_measures', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-blue-500/30 pt-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">7. Вовлеченность персонала</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="involved_workers_count" className="text-white mb-2 block">Вовлечено рабочих</Label>
                    <Input
                      id="involved_workers_count"
                      type="number"
                      value={formData.involved_workers_count}
                      onChange={(e) => updateField('involved_workers_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="not_involved_workers_count" className="text-white mb-2 block">Не вовлечено рабочих</Label>
                    <Input
                      id="not_involved_workers_count"
                      type="number"
                      value={formData.not_involved_workers_count}
                      onChange={(e) => updateField('not_involved_workers_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="involved_workers_list" className="text-white mb-2 block">Список вовлеченных рабочих</Label>
                  <Textarea
                    id="involved_workers_list"
                    value={formData.involved_workers_list}
                    onChange={(e) => handleTextareaChange('involved_workers_list', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="involved_engineers_count" className="text-white mb-2 block">Вовлечено ИТР</Label>
                    <Input
                      id="involved_engineers_count"
                      type="number"
                      value={formData.involved_engineers_count}
                      onChange={(e) => updateField('involved_engineers_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="not_involved_engineers_count" className="text-white mb-2 block">Не вовлечено ИТР</Label>
                    <Input
                      id="not_involved_engineers_count"
                      type="number"
                      value={formData.not_involved_engineers_count}
                      onChange={(e) => updateField('not_involved_engineers_count', e.target.value)}
                      className="bg-slate-700/50 border-blue-500/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="involved_engineers_list" className="text-white mb-2 block">Список вовлеченных ИТР</Label>
                  <Textarea
                    id="involved_engineers_list"
                    value={formData.involved_engineers_list}
                    onChange={(e) => handleTextareaChange('involved_engineers_list', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="involvement_work" className="text-white mb-2 block">Проделанная работа по вовлечению</Label>
                  <Textarea
                    id="involvement_work"
                    value={formData.involvement_work}
                    onChange={(e) => handleTextareaChange('involvement_work', e.target.value, e)}
                    className="bg-slate-700/50 border-blue-500/30 text-white min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-6 text-lg font-bold"
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={24} className="mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={24} className="mr-2" />
                    Сохранить отчёт
                  </>
                )}
              </Button>
              <Button
                onClick={() => navigate('/kbt')}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                Отменить
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
