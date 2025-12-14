import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { generatePabPDF } from '@/utils/pabPdfExport';
import OrganizationLogo from '@/components/OrganizationLogo';

interface PabRecord {
  id: number;
  doc_number: string;
  doc_date: string;
  inspector_fio: string;
  inspector_position: string;
  department: string;
  location: string;
  checked_object: string;
  created_at: string;
  status: 'new' | 'completed' | 'overdue' | 'in_progress';
  photo_url?: string;
  max_deadline?: string;
  total_observations?: number;
  completed_observations?: number;
}

export default function PabListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PabRecord[]>([]);
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
      const response = await fetch('https://functions.poehali.dev/bb1de74c-2e60-4e49-838e-7c640186dc5c');
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Error loading records:', error);
      toast.error('Ошибка загрузки списка ПАБ');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/a4284e02-284d-408c-9cee-d71a36d6fa09', {
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
      toast.error('Выберите хотя бы один ПАБ для экспорта');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/88fb8fbf-2935-49ae-8371-424562046173?ids=${selectedIds.join(',')}`);
      const data = await response.json();
      
      if (data.pabs && data.pabs.length > 0) {
        generatePabPDF(data.pabs);
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
      toast.error('Выберите хотя бы один ПАБ для экспорта');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/0db319fd-4f2e-44a7-b74f-cdb9a7c69f61?ids=${selectedIds.join(',')}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = selectedIds.length === 1 
          ? `PAB_${records.find(r => r.id === selectedIds[0])?.doc_number || 'Document'}.docx`
          : 'PAB_Multiple.docx';
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
      toast.error('Выберите хотя бы один ПАБ для удаления');
      return;
    }

    if (!confirm(`Удалить выбранные ПАБ (${selectedIds.length} шт.)? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/b7991444-b3cb-4160-8fed-6d25fe399a0c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pab_ids: selectedIds })
      });
      
      if (response.ok) {
        toast.success('ПАБ удалены');
        setSelectedIds([]);
        loadRecords();
      } else {
        toast.error('Ошибка удаления');
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

  const getStatusIndicator = (record: PabRecord) => {
    const total = record.total_observations || 0;
    const completed = record.completed_observations || 0;
    
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
            <div key={i} className="w-3 h-3 rounded-full bg-red-500 shadow-lg" />
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
      record.department.toLowerCase().includes(query)
    );
  });

  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Icon name="ArrowLeft" size={20} />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={false} />
            <h1 className="text-3xl font-bold text-gray-900">Список ПАБ</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <Button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Icon name="Printer" size={20} />
                  Печать ({selectedIds.length})
                </Button>
                <Button
                  onClick={handleExportWord}
                  disabled={isExporting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Icon name="FileText" size={20} />
                  Word ({selectedIds.length})
                </Button>
                {isAdmin && (
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <Icon name="Trash2" size={20} />
                    Удалить ({selectedIds.length})
                  </Button>
                )}
              </>
            )}
            <Button
              onClick={() => navigate('/pab-registration')}
              className="flex items-center gap-2"
            >
              <Icon name="Plus" size={20} />
              Создать ПАБ
            </Button>
          </div>
        </div>

        <Card className="p-6 mb-6 sticky top-0 z-10 bg-white shadow-md">
          <div className="flex items-center gap-4">
            {filteredRecords.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-gray-600">Выбрать все</span>
              </div>
            )}
            <Icon name="Search" size={20} className="text-gray-400" />
            <Input
              placeholder="Поиск по номеру ПАБ, проверяющему или подразделению..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Загрузка...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon name="FileText" size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg mb-4">
              {searchQuery ? 'Ничего не найдено' : 'Нет сохранённых записей ПАБ'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/pab-registration')}>
                Создать первый ПАБ
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedIds.includes(record.id)}
                      onCheckedChange={() => toggleSelect(record.id)}
                      className="mt-1"
                    />
                    <div className="flex flex-col gap-1 pt-1">
                      {getStatusIndicator(record)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {record.doc_number}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {formatDate(record.doc_date)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusLabel(record.status).color}`}>
                          {getStatusLabel(record.status).label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                        <div>
                          <span className="font-semibold">Проверяющий:</span> {record.inspector_fio}
                        </div>
                        <div>
                          <span className="font-semibold">Должность:</span> {record.inspector_position}
                        </div>
                        <div>
                          <span className="font-semibold">Подразделение:</span> {record.department}
                        </div>
                        <div>
                          <span className="font-semibold">Участок:</span> {record.location}
                        </div>
                        {record.checked_object && (
                          <div className="md:col-span-2">
                            <span className="font-semibold">Объект:</span> {record.checked_object}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Создано: {formatDate(record.created_at)}
                        {record.max_deadline && (
                          <span className="ml-4">
                            Срок выполнения: {formatDate(record.max_deadline)}
                          </span>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <div className="mt-4">
                          <Select
                            value={record.status}
                            onValueChange={(value) => updateStatus(record.id, value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Изменить статус" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Новый</SelectItem>
                              <SelectItem value="in_progress">В работе</SelectItem>
                              <SelectItem value="completed">Выполнен</SelectItem>
                              <SelectItem value="overdue">Просрочен</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/pab-view/${record.id}`)}
                    >
                      <Icon name="Eye" size={16} className="mr-2" />
                      Просмотр
                    </Button>
                    {record.photo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(record.photo_url, '_blank')}
                      >
                        <Icon name="Download" size={16} className="mr-2" />
                        Документ
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}