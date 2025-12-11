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
import { Packer } from 'docx';
import { uploadDocumentToStorage } from '@/utils/documentUpload';
import { generateProductionControlDocument } from '@/utils/generateProductionControlDocument';

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
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

  const handleSubmit = async () => {
    if (!docNumber || !inspectorFio || controlItems.some(item => !item.control_area || !item.findings)) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setLoading(true);

    try {
      const userId = localStorage.getItem('userId');
      let photoUrl = '';

      if (photoFile && userId) {
        photoUrl = await uploadDocumentToStorage({
          userId,
          department,
          documentType: 'Производственный Контроль',
          file: photoFile
        });
      }

      const controlData = {
        doc_number: docNumber,
        doc_date: docDate,
        inspector_fio: inspectorFio,
        inspector_position: inspectorPosition,
        department,
        control_items: controlItems
      };

      const doc = generateProductionControlDocument(controlData);
      const blob = await Packer.toBlob(doc);
      const wordFile = new File(
        [blob],
        `ПроизводственныйКонтроль_${docNumber}_${new Date().toISOString().split('T')[0]}.docx`,
        {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      );

      if (userId) {
        await uploadDocumentToStorage({
          userId,
          department,
          documentType: 'Производственный Контроль',
          file: wordFile
        });
      }

      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        try {
          await fetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: organizationId,
              action_type: 'production_control_create',
              user_id: userId
            })
          });
        } catch (error) {
          console.log('Points award failed:', error);
        }
      }

      toast.success('Производственный контроль успешно зарегистрирован');
      navigate('/');
    } catch (error) {
      toast.error('Не удалось сохранить документ');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueSubdivisions = Array.from(new Set(orgUsers.map(u => u.subdivision)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Производственный Контроль</h1>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Номер документа *</Label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <div>
              <Label>Дата *</Label>
              <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ФИО проверяющего *</Label>
              <Input value={inspectorFio} onChange={(e) => setInspectorFio(e.target.value)} />
            </div>
            <div>
              <Label>Должность проверяющего</Label>
              <Input value={inspectorPosition} onChange={(e) => setInspectorPosition(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Подразделение *</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
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

          <div>
            <Label>Фото (необязательно)</Label>
            <Input
              type="file"
              accept="*/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Пункты контроля</h2>
              <Button onClick={addControlItem} size="sm">
                <Icon name="Plus" size={16} className="mr-2" />
                Добавить пункт
              </Button>
            </div>

            {controlItems.map((item, index) => (
              <Card key={index} className="p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold">Пункт #{item.item_number}</span>
                  {controlItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeControlItem(index)}
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Область контроля *</Label>
                      <Input
                        value={item.control_area}
                        onChange={(e) => updateControlItem(index, 'control_area', e.target.value)}
                        placeholder="Например: Охрана труда"
                      />
                    </div>
                    <div>
                      <Label>Дата проверки *</Label>
                      <Input
                        type="date"
                        value={item.inspection_date}
                        onChange={(e) => updateControlItem(index, 'inspection_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Выявленные факты *</Label>
                    <Textarea
                      value={item.findings}
                      onChange={(e) => updateControlItem(index, 'findings', e.target.value)}
                      placeholder="Опишите выявленные нарушения или замечания"
                    />
                  </div>

                  <div>
                    <Label>Рекомендации</Label>
                    <Textarea
                      value={item.recommendations}
                      onChange={(e) => updateControlItem(index, 'recommendations', e.target.value)}
                      placeholder="Рекомендации по устранению"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Ответственный</Label>
                      <Select
                        value={item.responsible_person}
                        onValueChange={(value) => updateControlItem(index, 'responsible_person', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите сотрудника" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgUsers.map((user) => (
                            <SelectItem key={user.id} value={user.fio}>
                              {user.fio} - {user.position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Срок устранения</Label>
                      <Input
                        type="date"
                        value={item.deadline}
                        onChange={(e) => updateControlItem(index, 'deadline', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Сохранение...' : 'Сохранить и отправить'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Отмена
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}