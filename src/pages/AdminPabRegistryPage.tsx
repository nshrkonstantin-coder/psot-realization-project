import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RegistryRecord {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  company: string;
  department: string;
  position: string;
  pab_number: string;
  audit_date: string;
  audits_completed: number;
  observations_made: number;
}

export default function AdminPabRegistryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRegistryData();
  }, []);

  const loadRegistryData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://functions.poehali.dev/4c14a615-c04d-48ce-89ab-139999fefa5c');
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Ошибка загрузки данных реестра:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные реестра',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(
    (record) =>
      record.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.pab_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:!bg-gradient-to-br dark:!from-blue-50 dark:!to-indigo-50 p-6">
      <div className="w-full px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-white/50"
            >
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:!text-gray-900">Реестр всех пользователей ПАБ</h1>
              <p className="text-sm text-gray-600 dark:!text-gray-600 mt-1">
                Информация по всем пользователям, аудитам и наблюдениям
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/pab-registration')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon name="Plus" size={18} className="mr-2" />
            Создать аудит
          </Button>
        </div>

        {/* Search */}
        <Card className="dark:!bg-white mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Icon
                name="Search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                placeholder="Поиск по ФИО, email, № ПАБ, подразделению..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:!bg-white dark:!text-gray-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Registry Table */}
        <Card>
          <CardHeader>
            <CardTitle>Реестр всех пользователей</CardTitle>
            <CardDescription>
              Всего записей: {filteredRecords.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Icon name="Loader2" className="animate-spin text-blue-600" size={48} />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="FolderOpen" className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">Записи не найдены</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID№</TableHead>
                      <TableHead className="min-w-[200px]">ФИО</TableHead>
                      <TableHead className="min-w-[200px]">E-mail</TableHead>
                      <TableHead className="min-w-[180px]">Компания</TableHead>
                      <TableHead className="min-w-[150px]">Подразделение</TableHead>
                      <TableHead className="min-w-[180px]">Должность</TableHead>
                      <TableHead className="w-[120px]">№ ПАБ</TableHead>
                      <TableHead className="w-[130px]">Дата проведения</TableHead>
                      <TableHead className="w-[120px] text-center">Сделано Аудитов</TableHead>
                      <TableHead className="w-[130px] text-center">Выписано наблюдений</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-blue-50/50">
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell className="font-medium">{record.full_name}</TableCell>
                        <TableCell>{record.email}</TableCell>
                        <TableCell>{record.company}</TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell>{record.position}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium">
                            {record.pab_number}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(record.audit_date)}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-800 font-bold">
                            {record.audits_completed}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold">
                            {record.observations_made}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Всего пользователей
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Icon name="Users" className="text-blue-600" size={32} />
                <span className="text-3xl font-bold text-gray-900">{records.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Всего аудитов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" className="text-green-600" size={32} />
                <span className="text-3xl font-bold text-gray-900">
                  {records.reduce((sum, r) => sum + r.audits_completed, 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Всего наблюдений
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Icon name="Eye" className="text-amber-600" size={32} />
                <span className="text-3xl font-bold text-gray-900">
                  {records.reduce((sum, r) => sum + r.observations_made, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}