import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle } from 'docx';

interface ControlItem {
  item_number: number;
  control_area: string;
  inspection_date: string;
  findings: string;
  recommendations: string;
  responsible_person: string;
  deadline: string;
}

export default function ProductionControlPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orgUsers, setOrgUsers] = useState<Array<{ id: number; fio: string; position: string; subdivision: string }>>([]);
  
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorFio, setInspectorFio] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');
  const [department, setDepartment] = useState('');
  
  const [controlItems, setControlItems] = useState<ControlItem[]>([
    {
      item_number: 1,
      control_area: '',
      inspection_date: new Date().toISOString().split('T')[0],
      findings: '',
      recommendations: '',
      responsible_person: '',
      deadline: ''
    }
  ]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    
    const userFio = localStorage.getItem('userFio') || '';
    const userPosition = localStorage.getItem('userPosition') || '';
    const userDepartment = localStorage.getItem('userDepartment') || '';
    
    setInspectorFio(userFio);
    setInspectorPosition(userPosition);
    setDepartment(userDepartment);
    
    loadOrgUsers();
  }, [navigate]);

  const loadOrgUsers = async () => {
    const organizationId = localStorage.getItem('organizationId');
    if (!organizationId) return;

    try {
      const response = await fetch(
        `https://functions.poehali.dev/80de0ea1-b0e8-4b68-b93a-0d5aae40fd40?organization_id=${organizationId}`
      );
      const data = await response.json();
      if (data.users) {
        setOrgUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const addControlItem = () => {
    setControlItems([
      ...controlItems,
      {
        item_number: controlItems.length + 1,
        control_area: '',
        inspection_date: new Date().toISOString().split('T')[0],
        findings: '',
        recommendations: '',
        responsible_person: '',
        deadline: ''
      }
    ]);
  };

  const removeControlItem = (index: number) => {
    if (controlItems.length > 1) {
      const updated = controlItems.filter((_, i) => i !== index);
      updated.forEach((item, i) => {
        item.item_number = i + 1;
      });
      setControlItems(updated);
    }
  };

  const updateControlItem = (index: number, field: keyof ControlItem, value: string) => {
    const updated = [...controlItems];
    updated[index] = { ...updated[index], [field]: value };
    setControlItems(updated);
  };

  const handleTextareaChange = (index: number, field: keyof ControlItem, value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateControlItem(index, field, value);
    event.target.style.height = 'auto';
    event.target.style.height = event.target.scrollHeight + 'px';
  };

  const handleSave = async () => {
    if (!docNumber || !inspectorFio || controlItems.some(item => !item.control_area || !item.findings)) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setLoading(true);

    try {
      const reportData = {
        doc_number: docNumber,
        doc_date: docDate,
        inspector_fio: inspectorFio,
        inspector_position: inspectorPosition,
        department,
        control_items: controlItems,
        user_id: localStorage.getItem('userId'),
        organization_id: localStorage.getItem('organizationId'),
        created_at: new Date().toISOString()
      };

      const reportsKey = 'production_control_reports';
      const existingReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');
      existingReports.push(reportData);
      localStorage.setItem(reportsKey, JSON.stringify(existingReports));

      toast.success('Производственный контроль успешно сохранен!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    try {
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: '№', bold: true })], width: { size: 5, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Область контроля', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Дата проверки', bold: true })], width: { size: 12, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Выявленные нарушения', bold: true })], width: { size: 23, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Рекомендации', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Ответственный', bold: true })], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Срок устранения', bold: true })], width: { size: 12, type: WidthType.PERCENTAGE } })
          ]
        })
      ];

      controlItems.forEach(item => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(item.item_number))] }),
              new TableCell({ children: [new Paragraph(item.control_area)] }),
              new TableCell({ children: [new Paragraph(item.inspection_date)] }),
              new TableCell({ children: [new Paragraph(item.findings)] }),
              new TableCell({ children: [new Paragraph(item.recommendations)] }),
              new TableCell({ children: [new Paragraph(item.responsible_person)] }),
              new TableCell({ children: [new Paragraph(item.deadline)] })
            ]
          })
        );
      });

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
                text: 'Производственный контроль',
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                style: 'Heading2'
              }),
              new Paragraph({ text: `Номер документа: ${docNumber}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Дата: ${docDate}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Проверяющий: ${inspectorFio}${inspectorPosition ? ', ' + inspectorPosition : ''}`, spacing: { after: 100 } }),
              new Paragraph({ text: `Подразделение: ${department}`, spacing: { after: 300 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows
              })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Производственный_контроль_${docNumber}_${new Date().toISOString().slice(0, 10)}.docx`;
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

  const handlePrint = () => {
    window.print();
  };

  const uniqueSubdivisions = Array.from(new Set(orgUsers.map(u => u.subdivision)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 print:bg-white">
      <Card className="max-w-6xl mx-auto p-8 print:shadow-none">
        <div className="header text-center mb-6 border-b-2 border-slate-300 pb-4 print:border-black">
          <h1 className="text-3xl font-bold text-slate-900">АО «ГРК «Западная» Рудник «Бадран»</h1>
          <h2 className="text-2xl font-semibold text-slate-700 mt-2">Производственный контроль</h2>
        </div>

        <div className="space-y-6">
          {/* Основная информация */}
          <div className="section border border-slate-300 p-4 print:border-black">
            <h3 className="text-lg font-bold bg-slate-100 p-2 mb-4 print:bg-transparent">Информация о документе</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold">Номер документа *</Label>
                <Input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className={`print:border-none print:bg-transparent transition-colors ${docNumber.trim() ? 'bg-green-100 border-green-400' : ''}`}
                />
              </div>
              <div>
                <Label className="font-semibold">Дата *</Label>
                <Input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="print:border-none print:bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="font-semibold">ФИО проверяющего *</Label>
                <Input
                  value={inspectorFio}
                  onChange={(e) => setInspectorFio(e.target.value)}
                  className={`print:border-none print:bg-transparent transition-colors ${inspectorFio.trim() ? 'bg-green-100 border-green-400' : ''}`}
                />
              </div>
              <div>
                <Label className="font-semibold">Должность проверяющего</Label>
                <Input
                  value={inspectorPosition}
                  onChange={(e) => setInspectorPosition(e.target.value)}
                  className={`print:border-none print:bg-transparent transition-colors ${inspectorPosition.trim() ? 'bg-green-100 border-green-400' : ''}`}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="font-semibold">Подразделение *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className={`transition-colors ${department.trim() ? 'bg-green-100 border-green-400' : ''}`}>
                  <SelectValue placeholder="Выберите подразделение" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSubdivisions.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Пункты контроля */}
          <div className="section border border-slate-300 p-4 print:border-black">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Пункты контроля</h3>
              <Button
                onClick={addControlItem}
                size="sm"
                className="bg-green-600 hover:bg-green-700 print:hidden"
              >
                <Icon name="Plus" size={16} className="mr-2" />
                Добавить пункт
              </Button>
            </div>

            <div className="space-y-6">
              {controlItems.map((item, index) => (
                <Card key={index} className="p-4 bg-slate-50 border-2 print:bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-slate-700">Пункт #{item.item_number}</h4>
                    {controlItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeControlItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 print:hidden"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold">Область контроля *</Label>
                        <Input
                          value={item.control_area}
                          onChange={(e) => updateControlItem(index, 'control_area', e.target.value)}
                          className={`print:border-none print:bg-transparent transition-colors ${item.control_area.trim() ? 'bg-green-100 border-green-400' : ''}`}
                          placeholder="Например: Рабочее место оператора"
                        />
                      </div>
                      <div>
                        <Label className="font-semibold">Дата проверки *</Label>
                        <Input
                          type="date"
                          value={item.inspection_date}
                          onChange={(e) => updateControlItem(index, 'inspection_date', e.target.value)}
                          className="print:border-none print:bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="font-semibold">Выявленные нарушения *</Label>
                      <Textarea
                        value={item.findings}
                        onChange={(e) => handleTextareaChange(index, 'findings', e.target.value, e)}
                        className={`print:border-none print:bg-transparent transition-colors resize-none ${item.findings.trim() ? 'bg-green-100 border-green-400' : ''}`}
                        placeholder="Опишите выявленные нарушения"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label className="font-semibold">Рекомендации</Label>
                      <Textarea
                        value={item.recommendations}
                        onChange={(e) => handleTextareaChange(index, 'recommendations', e.target.value, e)}
                        className={`print:border-none print:bg-transparent transition-colors resize-none ${item.recommendations.trim() ? 'bg-green-100 border-green-400' : ''}`}
                        placeholder="Рекомендации по устранению"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold">Ответственный за устранение</Label>
                        <Input
                          value={item.responsible_person}
                          onChange={(e) => updateControlItem(index, 'responsible_person', e.target.value)}
                          className={`print:border-none print:bg-transparent transition-colors ${item.responsible_person.trim() ? 'bg-green-100 border-green-400' : ''}`}
                          placeholder="ФИО ответственного"
                        />
                      </div>
                      <div>
                        <Label className="font-semibold">Срок устранения</Label>
                        <Input
                          type="date"
                          value={item.deadline}
                          onChange={(e) => updateControlItem(index, 'deadline', e.target.value)}
                          className="print:border-none print:bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
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
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button onClick={handleExportWord} variant="outline" className="border-blue-700 text-blue-700 hover:bg-blue-50">
            <Icon name="FileText" size={20} className="mr-2" />
            Скачать в Word
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
