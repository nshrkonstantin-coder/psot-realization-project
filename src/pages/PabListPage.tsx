import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

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
  status: 'new' | 'completed' | 'overdue';
  photo_url?: string;
  max_deadline?: string;
}

export default function PabListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PabRecord[]>([]);

  useEffect(() => {
    loadRecords();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return { label: 'Новый', color: 'bg-blue-100 text-blue-800' };
      case 'completed':
        return { label: 'Выполнен', color: 'bg-green-100 text-green-800' };
      case 'overdue':
        return { label: 'Просрочен', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Новый', color: 'bg-gray-100 text-gray-800' };
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Список ПАБ</h1>
          <Button
            onClick={() => navigate('/pab-registration')}
            className="flex items-center gap-2"
          >
            <Icon name="Plus" size={20} />
            Создать ПАБ
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Загрузка...</p>
          </div>
        ) : records.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon name="FileText" size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg mb-4">Нет сохранённых записей ПАБ</p>
            <Button onClick={() => navigate('/pab-registration')}>
              Создать первый ПАБ
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {records.map((record) => (
              <Card key={record.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
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