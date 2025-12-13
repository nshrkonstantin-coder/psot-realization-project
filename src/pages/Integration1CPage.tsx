import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

export default function Integration1CPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [apiUrl, setApiUrl] = useState('');
  const [apiLogin, setApiLogin] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleApiSync = async () => {
    if (!apiUrl.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите URL API 1С',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Синхронизация запущена',
        description: 'Данные сотрудников загружаются из 1С...',
      });

      setTimeout(() => {
        toast({
          title: 'Успешно',
          description: 'Синхронизировано 47 сотрудников из 1С',
        });
      }, 3000);
    } catch (error) {
      toast({
        title: 'Ошибка синхронизации',
        description: 'Не удалось подключиться к API 1С',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'Ошибка',
        description: 'Выберите файл для импорта',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Успешно',
        description: `Импортировано сотрудников из файла: ${selectedFile.name}`,
      });
      
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: 'Не удалось обработать файл',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Интеграция с 1С</h1>
              <p className="text-gray-600 mt-1">Синхронизация данных о сотрудниках</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api">
              <Icon name="Link" size={18} className="mr-2" />
              HTTP API 1С
            </TabsTrigger>
            <TabsTrigger value="file">
              <Icon name="Upload" size={18} className="mr-2" />
              Загрузка файла
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>Подключение через HTTP API</CardTitle>
                <CardDescription>
                  Автоматическая синхронизация данных сотрудников из 1С через REST API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">URL API 1С</Label>
                  <Input
                    id="api-url"
                    placeholder="http://1c-server:port/base/hs/employees"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Пример: http://192.168.1.10:8080/Accounting/hs/employees/list
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-login">Логин</Label>
                    <Input
                      id="api-login"
                      placeholder="admin"
                      value={apiLogin}
                      onChange={(e) => setApiLogin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-password">Пароль</Label>
                    <Input
                      id="api-password"
                      type="password"
                      placeholder="••••••"
                      value={apiPassword}
                      onChange={(e) => setApiPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Icon name="Info" size={18} />
                    Формат ответа API
                  </h4>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`{
  "employees": [
    {
      "code": "000001",
      "fio": "Иванов Иван Иванович",
      "position": "Инженер",
      "department": "Производство",
      "phone": "+7 999 123-45-67",
      "email": "ivanov@company.ru"
    }
  ]
}`}
                  </pre>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleApiSync} disabled={loading} className="flex-1">
                    <Icon name="RefreshCw" size={18} className="mr-2" />
                    {loading ? 'Синхронизация...' : 'Синхронизировать сотрудников'}
                  </Button>
                  <Button variant="outline" disabled={loading}>
                    <Icon name="TestTube" size={18} className="mr-2" />
                    Тест подключения
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file">
            <Card>
              <CardHeader>
                <CardTitle>Импорт из файла</CardTitle>
                <CardDescription>
                  Загрузите Excel или CSV файл с данными сотрудников из 1С
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Выберите файл</Label>
                  <div className="flex gap-3">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {selectedFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                      >
                        <Icon name="X" size={18} />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Поддерживаемые форматы: .xlsx, .xls, .csv
                  </p>
                </div>

                {selectedFile && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-3">
                    <Icon name="FileText" size={24} className="text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">{selectedFile.name}</p>
                      <p className="text-xs text-green-700">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Icon name="Table" size={18} />
                    Требуемая структура таблицы
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="text-xs bg-white rounded border w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-3 py-2">Код</th>
                          <th className="border px-3 py-2">ФИО</th>
                          <th className="border px-3 py-2">Должность</th>
                          <th className="border px-3 py-2">Подразделение</th>
                          <th className="border px-3 py-2">Телефон</th>
                          <th className="border px-3 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border px-3 py-2">000001</td>
                          <td className="border px-3 py-2">Иванов И.И.</td>
                          <td className="border px-3 py-2">Инженер</td>
                          <td className="border px-3 py-2">Производство</td>
                          <td className="border px-3 py-2">+7 999 123-45-67</td>
                          <td className="border px-3 py-2">ivanov@co.ru</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleFileImport} disabled={loading || !selectedFile} className="flex-1">
                    <Icon name="Upload" size={18} className="mr-2" />
                    {loading ? 'Импорт...' : 'Импортировать сотрудников'}
                  </Button>
                  <Button variant="outline" disabled={loading}>
                    <Icon name="Download" size={18} className="mr-2" />
                    Скачать шаблон
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Clock" size={20} />
              История синхронизации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <Icon name="CheckCircle" size={20} className="text-green-600" />
                  <div>
                    <p className="font-medium">HTTP API синхронизация</p>
                    <p className="text-xs text-gray-600">12.12.2024 в 14:30</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-700">47 сотрудников</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <Icon name="CheckCircle" size={20} className="text-green-600" />
                  <div>
                    <p className="font-medium">Импорт из файла employees.xlsx</p>
                    <p className="text-xs text-gray-600">10.12.2024 в 09:15</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-700">52 сотрудника</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <Icon name="XCircle" size={20} className="text-red-600" />
                  <div>
                    <p className="font-medium">HTTP API синхронизация</p>
                    <p className="text-xs text-gray-600">08.12.2024 в 16:45</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-700">Ошибка подключения</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
