import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { generatePcPDF } from '@/utils/pcPdfExport';

interface Violation {
  id: number;
  violation_number: number;
  description: string;
  who_violated: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  status: 'new' | 'in_progress' | 'completed' | 'overdue';
  photo_url?: string;
  photos?: Array<{ data: string }>;
}

interface Signature {
  user_name: string;
  date: string;
}

interface PcDetail {
  id: number;
  doc_number: string;
  doc_date: string;
  inspector_fio: string;
  inspector_position: string;
  department: string;
  location: string;
  checked_object: string;
  status: string;
  violations: Violation[];
  signatures?: Signature[];
}

export default function PcViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pc, setPc] = useState<PcDetail | null>(null);
  const [userRole, setUserRole] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPc(id);
    }
    setUserRole(localStorage.getItem('userRole') || '');
  }, [id]);

  const loadPc = async (pcId: string) => {
    try {
      const response = await fetch(`https://functions.poehali.dev/d40301df-9088-4a9a-87ef-17c01ac5aad6?id=${pcId}`);
      const data = await response.json();
      setPc(data.pc);
    } catch (error) {
      console.error('Error loading PC:', error);
      toast.error('Ошибка загрузки записи ПК');
    } finally {
      setLoading(false);
    }
  };

  const updateViolationStatus = async (violationId: number, newStatus: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/8f65bf78-c12a-4ffc-9c9e-fd8f4fc4c6a7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violation_id: violationId, status: newStatus })
      });
      
      if (response.ok) {
        toast.success('Статус нарушения обновлён');
        if (id) loadPc(id);
      } else {
        toast.error('Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const deleteViolation = async (violationId: number, violationNumber: number) => {
    if (!confirm(`Удалить нарушение №${violationNumber}? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/d4845ec4-7998-43f8-8eb7-9833d64cd9ec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violation_id: violationId })
      });
      
      if (response.ok) {
        toast.success('Нарушение удалено');
        if (id) loadPc(id);
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting violation:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleExportPDF = async () => {
    if (!pc) return;
    
    setIsExporting(true);
    try {
      generatePcPDF([pc]);
      toast.success('Документ отправлен на печать');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    if (!pc) return;
    
    setIsExporting(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/b9254750-728b-41ea-88fe-33ac7f924adc?ids=${pc.id}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PC_${pc.doc_number}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Документ Word скачан');
      } else {
        const error = await response.json();
        toast.error('Ошибка экспорта: ' + (error.error || 'неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error exporting Word:', error);
      toast.error('Ошибка экспорта в Word');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!pc || !isAdmin) return;

    if (!confirm(`Удалить запись ПК ${pc.doc_number}? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/pc-delete-placeholder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pc_ids: [pc.id] })
      });
      
      if (response.ok) {
        toast.success('Запись ПК удалена');
        navigate('/pc-list');
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Ошибка удаления');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getViolationStatusIndicator = (violation: Violation) => {
    const isOverdue = violation.deadline && new Date(violation.deadline) < new Date();
    
    if (violation.status === 'completed') {
      return <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg" />;
    }
    
    if (isOverdue || violation.status === 'overdue') {
      return (
        <div className="w-3 h-3 rounded-full bg-red-600 shadow-lg animate-pulse" 
             style={{ animation: 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      );
    }
    
    return <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg" />;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return { label: 'Новый', color: 'bg-blue-100 text-blue-800' };
      case 'in_progress':
        return { label: 'В работе', color: 'bg-yellow-100 text-yellow-800' };
      case 'completed':
        return { label: 'Выполнен', color: 'bg-green-100 text-green-800' };
      case 'overdue':
        return { label: 'Просрочен', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Новый', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin';

  const overallStatusIndicators = pc?.violations?.map(violation => 
    getViolationStatusIndicator(violation)
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!pc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Icon name="FileX" size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600">Запись ПК не найдена</p>
          <Button onClick={() => navigate('/pc-list')} className="mt-4">
            Вернуться к списку
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:!bg-gradient-to-br dark:!from-blue-50 dark:!to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/pc-list')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Icon name="ArrowLeft" size={20} />
              Назад
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{pc.doc_number}</h1>
              <div className="flex items-center gap-1">
                {overallStatusIndicators}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Icon name="Printer" size={18} className="mr-2" />
              Печать
            </Button>
            <Button
              onClick={handleExportWord}
              disabled={isExporting}
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <Icon name="FileText" size={18} className="mr-2" />
              Word
            </Button>
            {isAdmin && (
              <Button
                onClick={handleDelete}
                variant="destructive"
              >
                <Icon name="Trash2" size={18} className="mr-2" />
                Удалить
              </Button>
            )}
          </div>
        </div>

        <Card className="p-8 mb-6 border-emerald-200 shadow-lg">
          <h2 className="text-xl font-bold mb-6 text-emerald-800 border-b border-emerald-200 pb-3">
            Информация о проверке
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Дата проверки</label>
                <p className="text-lg font-semibold text-gray-900">{formatDate(pc.doc_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Проверяющий</label>
                <p className="text-lg font-semibold text-gray-900">{pc.inspector_fio}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Должность</label>
                <p className="text-lg font-semibold text-gray-900">{pc.inspector_position}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Проверяемый объект</label>
                <p className="text-lg font-semibold text-gray-900">{pc.checked_object}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Подразделение</label>
                <p className="text-lg font-semibold text-gray-900">{pc.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Контролирующий</label>
                <p className="text-lg font-semibold text-gray-900">{pc.location}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Нарушения ({pc.violations?.length || 0})</h2>
          
          {pc.violations?.map((violation) => {
            const isOverdue = violation.deadline && new Date(violation.deadline) < new Date();
            const actualStatus = isOverdue && violation.status !== 'completed' ? 'overdue' : violation.status;
            const statusInfo = getStatusLabel(actualStatus);
            return (
              <Card key={violation.id} className="p-6 border-l-4 border-l-emerald-600 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getViolationStatusIndicator(violation)}
                    <h3 className="text-xl font-bold text-emerald-800">
                      Нарушение №{violation.violation_number}
                    </h3>
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={actualStatus}
                        onValueChange={(value) => updateViolationStatus(violation.id, value)}
                      >
                        <SelectTrigger className={`w-40 ${statusInfo.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Новое</SelectItem>
                          <SelectItem value="in_progress">В работе</SelectItem>
                          <SelectItem value="completed">Устранено</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteViolation(violation.id, violation.violation_number)}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  ) : (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Описание нарушения</label>
                    <p className="mt-1 p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                      {violation.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Кем допущено</label>
                    <p className="mt-1 p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                      {violation.who_violated}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Мероприятия по устранению</label>
                    <p className="mt-1 p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                      {violation.measures}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ответственный</label>
                      <p className="mt-1 p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 font-semibold">
                        {violation.responsible_person}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Срок устранения</label>
                      <p className={`mt-1 p-3 rounded border font-semibold ${
                        isOverdue 
                          ? 'bg-red-50 border-red-200 text-red-900' 
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}>
                        {formatDate(violation.deadline)}
                      </p>
                    </div>
                  </div>

                  {(violation.photos && violation.photos.length > 0) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Фото нарушений ({violation.photos.length})</label>
                      <div className="flex flex-wrap gap-3">
                        {violation.photos.map((photo, idx) => (
                          <img 
                            key={idx}
                            src={photo.data} 
                            alt={`Нарушение ${violation.violation_number} - фото ${idx + 1}`}
                            className="w-48 h-48 object-cover rounded-lg border-2 border-gray-200 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                            onClick={() => window.open(photo.data, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {pc.signatures && pc.signatures.length > 0 && (
          <Card className="p-8 mt-6 border-emerald-200 shadow-lg">
            <h2 className="text-xl font-bold mb-6 text-emerald-800 border-b border-emerald-200 pb-3">
              Подписи
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-600 block mb-1">Проверяющий</label>
                <p className="text-lg font-semibold text-gray-900 mb-2">{pc.inspector_fio}</p>
                <p className="text-sm text-gray-500">Дата: {formatDate(pc.doc_date)}</p>
              </div>
              {pc.signatures.map((sig, idx) => (
                <div key={idx} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <label className="text-sm font-medium text-emerald-700 block mb-1">Принял</label>
                  <p className="text-lg font-semibold text-emerald-900 mb-2">{sig.user_name}</p>
                  <p className="text-sm text-emerald-600">Дата: {formatDate(sig.date)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}