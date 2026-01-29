import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PcRecord {
  id: number;
  organization_id: number;
  organization_name: string;
  check_date: string;
  object_name: string;
  responsible_person: string;
  violations_found: number;
  status: string;
  created_at: string;
}

export default function PcRegistryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PcRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const mockData: PcRecord[] = [
        {
          id: 1,
          organization_id: 1,
          organization_name: 'ООО "Производство"',
          check_date: '2024-01-15',
          object_name: 'Цех №1',
          responsible_person: 'Иванов И.И.',
          violations_found: 3,
          status: 'Завершен',
          created_at: '2024-01-15T10:00:00'
        },
        {
          id: 2,
          organization_id: 2,
          organization_name: 'АО "Завод"',
          check_date: '2024-01-20',
          object_name: 'Склад',
          responsible_person: 'Петров П.П.',
          violations_found: 0,
          status: 'Завершен',
          created_at: '2024-01-20T11:00:00'
        },
        {
          id: 3,
          organization_id: 1,
          organization_name: 'ООО "Производство"',
          check_date: '2024-02-01',
          object_name: 'Цех №2',
          responsible_person: 'Сидоров С.С.',
          violations_found: 1,
          status: 'В работе',
          created_at: '2024-02-01T09:00:00'
        }
      ];
      setRecords(mockData);
    } catch (error) {
      console.error('Ошибка загрузки реестра:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record =>
    (record.organization_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (record.object_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (record.responsible_person || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Завершен':
        return 'text-green-600 bg-green-50';
      case 'В работе':
        return 'text-blue-600 bg-blue-50';
      case 'Отменен':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="icon"
            >
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <Icon name="FolderOpen" size={32} className="text-teal-600" />
                Реестр производственного контроля
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Просмотр всех проверок по организациям</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Все записи производственного контроля</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/pc-archived')}
                >
                  <Icon name="Archive" size={16} className="mr-2" />
                  Архив
                </Button>
                <Input
                  placeholder="Поиск по организации, объекту, ответственному..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <p className="mt-2 text-gray-600">Загрузка реестра...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icon name="Search" size={48} className="mx-auto mb-2 opacity-50" />
                <p>Записи не найдены</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Организация</TableHead>
                      <TableHead>Объект проверки</TableHead>
                      <TableHead>Дата проверки</TableHead>
                      <TableHead>Ответственный</TableHead>
                      <TableHead>Нарушений</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.organization_name}</TableCell>
                        <TableCell>{record.object_name}</TableCell>
                        <TableCell>{new Date(record.check_date).toLocaleDateString('ru-RU')}</TableCell>
                        <TableCell>{record.responsible_person}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            record.violations_found > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {record.violations_found}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/pc-view/${record.id}`)}
                          >
                            <Icon name="Eye" size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-gray-600">
          Всего записей: {filteredRecords.length}
        </div>
      </div>
    </div>
  );
}