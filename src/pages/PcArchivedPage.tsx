import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface ArchivedRecord {
  id: number;
  doc_number: string;
  doc_date: string;
  inspector_fio: string;
  inspector_position: string;
  checked_object: string;
  responsible_person: string;
  created_at: string;
  archived_at: string;
  total_violations: number;
}

export default function PcArchivedPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadArchivedRecords();
  }, [navigate]);

  const loadArchivedRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/758b1b55-dab9-4e6c-821a-9654c4478aba');
      if (!response.ok) {
        throw new Error('Ошибка загрузки архива');
      }
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Failed to load archived records:', error);
      toast.error('Ошибка загрузки архива');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (ids: number[]) => {
    if (ids.length === 0) {
      toast.error('Выберите записи для восстановления');
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/8dd8d682-7f79-4156-b808-7815d40e333c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pc_ids: ids })
      });

      if (!response.ok) {
        throw new Error('Ошибка восстановления');
      }

      const data = await response.json();
      toast.success(data.message || 'Записи восстановлены');
      setSelectedIds([]);
      loadArchivedRecords();
    } catch (error) {
      console.error('Failed to restore records:', error);
      toast.error('Ошибка восстановления записей');
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === records.length ? [] : records.map(r => r.id)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/pc-registry')}>
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Архив записей</h1>
          </div>
          {selectedIds.length > 0 && (
            <Button onClick={() => handleRestore(selectedIds)}>
              <Icon name="ArchiveRestore" size={20} className="mr-2" />
              Восстановить выбранные ({selectedIds.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" className="animate-spin" size={48} />
          </div>
        ) : records.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon name="Archive" size={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600">Архив пуст</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === records.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Номер документа</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Дата документа</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Инспектор</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Объект проверки</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Нарушений</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Архивирована</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelection(record.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">{record.doc_number}</td>
                      <td className="px-4 py-3 text-sm">{new Date(record.doc_date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{record.inspector_fio}</div>
                        <div className="text-xs text-gray-500">{record.inspector_position}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{record.checked_object}</td>
                      <td className="px-4 py-3 text-sm">{record.total_violations}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(record.archived_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore([record.id])}
                        >
                          <Icon name="ArchiveRestore" size={16} className="mr-1" />
                          Восстановить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
