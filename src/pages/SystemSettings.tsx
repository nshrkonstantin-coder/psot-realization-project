import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportInstructions } from '@/components/import/ImportInstructions';
import * as XLSX from 'xlsx';

interface Company {
  id: number;
  name: string;
}

interface ImportedUser {
  fio: string;
  email: string;
  subdivision: string;
  position: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
  loginLink?: string;
}

const SystemSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [importedUsers, setImportedUsers] = useState<ImportedUser[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'superadmin') {
      // Перенаправляем на соответствующую страницу
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      return;
    }
    
    setIsSuperAdmin(true);
    loadCompanies();
  }, [navigate]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=list_companies');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки компаний', variant: 'destructive' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedCompany) {
      toast({ title: 'Выберите предприятие', variant: 'destructive' });
      return;
    }

    toast({ title: 'Загрузка файла...', description: 'Обрабатываем данные' });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<{
          'ID№': string;
          'ФИО': string;
          'Компания': string;
          'Подразделение': string;
          'Должность': string;
          'E-mail': string;
        }>(worksheet);

        const users: ImportedUser[] = jsonData
          .filter((row) => row['E-mail'] && row['E-mail'].trim() !== '')
          .map((row) => ({
            fio: row['ФИО'] || '',
            email: row['E-mail'].trim(),
            subdivision: row['Подразделение'] || '',
            position: row['Должность'] || '',
            status: 'pending',
          }));

        if (users.length === 0) {
          toast({ 
            title: 'Нет данных для импорта', 
            description: 'Убедитесь, что в файле есть колонка "E-mail" с заполненными значениями',
            variant: 'destructive' 
          });
          return;
        }

        setImportedUsers(users);
        toast({ title: '✅ Файл успешно загружен', description: `Найдено ${users.length} пользователей для импорта` });
      } catch (error) {
        toast({ title: 'Ошибка чтения файла', description: 'Проверьте формат Excel файла', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportUsers = async () => {
    if (!selectedCompany || importedUsers.length === 0) return;

    setIsImporting(true);
    const updatedUsers = [...importedUsers];

    for (let i = 0; i < updatedUsers.length; i++) {
      const user = updatedUsers[i];
      
      try {
        const requestBody = {
          action: 'bulk_import',
          companyId: selectedCompany,
          fio: user.fio,
          email: user.email,
          subdivision: user.subdivision,
          position: user.position,
        };
        
        console.log(`Импорт пользователя ${i + 1}/${updatedUsers.length}:`, requestBody);
        
        const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log(`Ответ для пользователя ${i + 1}:`, data);
        
        if (data.success) {
          updatedUsers[i] = {
            ...user,
            status: 'success',
            loginLink: data.loginLink,
          };
        } else {
          updatedUsers[i] = {
            ...user,
            status: 'error',
            error: data.error || 'Неизвестная ошибка',
          };
        }
      } catch (error) {
        console.error(`Ошибка импорта пользователя ${i + 1}:`, error);
        updatedUsers[i] = {
          ...user,
          status: 'error',
          error: error instanceof Error ? error.message : 'Ошибка сервера',
        };
      }

      setImportedUsers([...updatedUsers]);
    }

    setIsImporting(false);
    toast({ title: 'Импорт завершён', description: `Успешно: ${updatedUsers.filter(u => u.status === 'success').length} из ${updatedUsers.length}` });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано в буфер обмена' });
  };

  const sendAllLinks = async () => {
    const successUsers = importedUsers.filter(u => u.status === 'success' && u.loginLink);
    
    if (successUsers.length === 0) {
      toast({ title: 'Нет пользователей для отправки', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_bulk_links',
          users: successUsers.map(u => ({ email: u.email, loginLink: u.loginLink })),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Ссылки отправлены', description: `Отправлено ${successUsers.length} писем` });
      } else {
        toast({ title: 'Ошибка отправки', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки писем', variant: 'destructive' });
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['ID№', 'ФИО', 'Компания', 'Подразделение', 'Должность', 'E-mail'],
      ['1', 'Иванов Иван Иванович', 'ООО "Пример"', 'IT отдел', 'Разработчик', 'ivanov@example.com'],
      ['2', 'Петров Петр Петрович', 'ООО "Пример"', 'Бухгалтерия', 'Бухгалтер', 'petrov@example.com'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');
    XLSX.writeFile(wb, 'Шаблон_импорта_пользователей.xlsx');
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-3 rounded-xl shadow-lg">
              <Icon name="Settings" size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Системные настройки</h1>
          </div>
          <Button
            onClick={() => navigate('/superadmin')}
            variant="outline"
            className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Icon name="Upload" size={24} className="text-yellow-500" />
            Массовый импорт пользователей
          </h2>

          <ImportInstructions />

          <div className="space-y-6">
            <div>
              <Label className="text-slate-300 mb-2 block">Выберите предприятие</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите предприятие" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)} className="text-white hover:bg-slate-600">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="border-blue-600/50 text-blue-500 hover:bg-blue-600/10"
              >
                <Icon name="Download" size={20} className="mr-2" />
                Скачать шаблон Excel
              </Button>

              <div className="flex-1">
                <input
                  type="file"
                  accept="*/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload">
                  <Button
                    asChild
                    disabled={!selectedCompany}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 cursor-pointer"
                  >
                    <span>
                      <Icon name="FileUp" size={20} className="mr-2" />
                      Загрузить Excel файл
                    </span>
                  </Button>
                </label>
              </div>

              {importedUsers.length > 0 && (
                <Button
                  onClick={handleImportUsers}
                  disabled={isImporting}
                  className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800"
                >
                  {isImporting ? (
                    <>
                      <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                      Импорт...
                    </>
                  ) : (
                    <>
                      <Icon name="UserPlus" size={20} className="mr-2" />
                      Импортировать пользователей
                    </>
                  )}
                </Button>
              )}
            </div>

            {importedUsers.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={sendAllLinks}
                  disabled={importedUsers.filter(u => u.status === 'success').length === 0}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                >
                  <Icon name="Send" size={20} className="mr-2" />
                  Массовая отправка ссылок ({importedUsers.filter(u => u.status === 'success').length})
                </Button>
              </div>
            )}
          </div>
        </Card>

        {importedUsers.length > 0 && (
          <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Результаты импорта</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">№</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">ФИО</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Подразделение</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Должность</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Статус</th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">Ссылка для входа</th>
                  </tr>
                </thead>
                <tbody>
                  {importedUsers.map((user, index) => (
                    <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-300">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-300">{user.fio}</td>
                      <td className="px-4 py-3 text-slate-300">{user.email}</td>
                      <td className="px-4 py-3 text-slate-300">{user.subdivision}</td>
                      <td className="px-4 py-3 text-slate-300">{user.position}</td>
                      <td className="px-4 py-3">
                        {user.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-600 text-white">
                            Ожидание
                          </span>
                        )}
                        {user.status === 'success' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
                            Успешно
                          </span>
                        )}
                        {user.status === 'error' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white">
                            Ошибка: {user.error}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.loginLink && (
                          <Button
                            onClick={() => copyToClipboard(user.loginLink!)}
                            size="sm"
                            variant="outline"
                            className="border-blue-600/50 text-blue-500 hover:bg-blue-600/10"
                          >
                            <Icon name="Copy" size={16} className="mr-1" />
                            Копировать
                          </Button>
                        )}
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
};

export default SystemSettings;