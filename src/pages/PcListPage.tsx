import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { generatePcPDF } from '@/utils/pcPdfExport';

interface PcRecord {
  id: number;
  doc_number: string;
  doc_date: string;
  inspector_fio: string;
  inspector_position: string;
  checked_object: string;
  responsible_person: string;
  created_at: string;
  status: 'new' | 'completed' | 'overdue' | 'in_progress';
  photo_url?: string;
  max_deadline?: string;
  total_violations?: number;
  completed_violations?: number;
}

export default function PcListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PcRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadRecords();
    setUserRole(localStorage.getItem('userRole') || '');
  }, []);

  const loadRecords = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/633655fc-0da1-442f-9294-a2ab3ccce0da');
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Error loading records:', error);
      toast.error('Ошибка загрузки списка ПК');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/pc-update-status-placeholder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      
      if (response.ok) {
        toast.success('Статус обновлён');
        loadRecords();
      } else {
        toast.error('Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleExportPDF = async () => {
    if (selectedIds.length === 0) {
      toast.error('Выберите хотя бы одну запись ПК для экспорта');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/d3d95054-5481-4d49-bd1e-30ec16602354?ids=${selectedIds.join(',')}`);
      const data = await response.json();
      
      if (data.records && data.records.length > 0) {
        generatePcPDF(data.records);
        toast.success('Документ отправлен на печать');
      } else {
        toast.error('Не удалось загрузить данные');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    if (selectedIds.length === 0) {
      toast.error('Выберите хотя бы одну запись ПК для экспорта');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/b9254750-728b-41ea-88fe-33ac7f924adc?ids=${selectedIds.join(',')}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = selectedIds.length === 1 
          ? `PC_${records.find(r => r.id === selectedIds[0])?.doc_number || 'Document'}.docx`
          : 'PC_Multiple.docx';
        a.download = filename;
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
    if (selectedIds.length === 0) {
      toast.error('Выберите хотя бы одну запись ПК для удаления');
      return;
    }

    if (!confirm(`Удалить выбранные записи ПК (${selectedIds.length} шт.)? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/49007de7-4bc2-4b98-875a-faa2756abd6e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pc_ids: selectedIds })
      });
      
      if (response.ok) {
        toast.success('Записи ПК удалены');
        setSelectedIds([]);
        loadRecords();
      } else {
        const errorData = await response.json();
        toast.error('Ошибка удаления: ' + (errorData.error || 'неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Ошибка удаления');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
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

  const getStatusIndicator = (record: PcRecord) => {
    const total = record.total_violations || 3;
    const completed = record.completed_violations || 0;
    
    const indicators = [];
    for (let i = 0; i < total; i++) {
      if (i < completed) {
        indicators.push(
          <div key={i} className="w-3 h-3 rounded-full bg-green-500 shadow-lg" />
        );
      } else {
        const isOverdue = record.max_deadline && new Date(record.max_deadline) < new Date();
        if (isOverdue) {
          indicators.push(
            <div key={i} className="w-3 h-3 rounded-full bg-red-600 shadow-lg animate-pulse" 
                 style={{ animation: 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          );
        } else {
          indicators.push(
            <div key={i} className="w-3 h-3 rounded-full bg-blue-500 shadow-lg" />
          );
        }
      }
    }
    
    return <div className="flex items-center gap-1">{indicators}</div>;
  };

  const filteredRecords = records.filter((record) => {
    const query = searchQuery.toLowerCase();
    return (
      record.doc_number.toLowerCase().includes(query) ||
      record.inspector_fio.toLowerCase().includes(query) ||
      record.checked_object.toLowerCase().includes(query) ||
      record.responsible_person.toLowerCase().includes(query)
    );
  });

  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Icon name="ArrowLeft" size={20} />
            Назад
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Список Производственного Контроля</h1>
          <div className="w-24" />
        </div>

        <Card className="p-6 mb-6 border-emerald-200 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Поиск</label>
              <Input
                type="text"
                placeholder="Номер, ФИО, подразделение..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleExportPDF}
                disabled={selectedIds.length === 0 || isExporting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Icon name="Printer" size={18} className="mr-2" />
                Печать
              </Button>
              <Button
                onClick={handleExportWord}
                disabled={selectedIds.length === 0 || isExporting}
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                <Icon name="FileText" size={18} className="mr-2" />
                Word
              </Button>
              {isAdmin && (
                <Button
                  onClick={handleDelete}
                  disabled={selectedIds.length === 0}
                  variant="destructive"
                >
                  <Icon name="Trash2" size={18} className="mr-2" />
                  Удалить
                </Button>
              )}
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <Card className="overflow-hidden border-emerald-200 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left">Номер</th>
                    <th className="p-4 text-left">Дата</th>
                    <th className="p-4 text-left">Проверяющий</th>
                    <th className="p-4 text-left">Должность</th>
                    <th className="p-4 text-left">Объект</th>
                    <th className="p-4 text-left">Ответственный</th>
                    <th className="p-4 text-left">Нарушения</th>
                    <th className="p-4 text-left">Срок устранения</th>
                    <th className="p-4 text-left">Статус</th>
                    <th className="p-4 text-left">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record) => {
                    const isOverdue = record.max_deadline && new Date(record.max_deadline) < new Date();
                    const actualStatus = isOverdue && record.status !== 'completed' ? 'overdue' : record.status;
                    const statusInfo = getStatusLabel(actualStatus);
                    return (
                      <tr key={record.id} className="hover:bg-emerald-50 transition-colors">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedIds.includes(record.id)}
                            onCheckedChange={() => toggleSelect(record.id)}
                          />
                        </td>
                        <td className="p-4 font-medium text-emerald-700">{record.doc_number}</td>
                        <td className="p-4">{formatDate(record.doc_date)}</td>
                        <td className="p-4">{record.inspector_fio}</td>
                        <td className="p-4">{record.inspector_position}</td>
                        <td className="p-4">{record.checked_object}</td>
                        <td className="p-4">{record.responsible_person}</td>
                        <td className="p-4">{getStatusIndicator(record)}</td>
                        <td className="p-4">
                          {record.max_deadline ? (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isOverdue ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {formatDate(record.max_deadline)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isAdmin ? (
                            <Select
                              value={actualStatus}
                              onValueChange={(value) => updateStatus(record.id, value)}
                            >
                              <SelectTrigger className={`w-36 ${statusInfo.color}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">Новый</SelectItem>
                                <SelectItem value="in_progress">В работе</SelectItem>
                                <SelectItem value="completed">Выполнен</SelectItem>
                                <SelectItem value="overdue">Просрочен</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-sm ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/pc-view/${record.id}`)}
                            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Icon name="Eye" size={16} className="mr-1" />
                            Открыть
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRecords.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Icon name="FileX" size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Записи не найдены</p>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="mt-4 text-sm text-gray-600 text-center">
          Всего записей: {filteredRecords.length} | Выбрано: {selectedIds.length}
        </div>
      </div>
    </div>
  );
}