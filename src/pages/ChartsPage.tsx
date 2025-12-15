import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface PositionData {
  id: number;
  position: string;
  audits: number;
  observations: number;
}

const ChartsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'назад' | 'печать'>('назад');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: number; name: string; date: string }>>([
    { id: 2, name: '2. ДЛЯ Приложения личные показатели ПАБ..xlsx', date: '04.12.2025, 02:39:45' }
  ]);
  
  const [selectedCategory, setSelectedCategory] = useState('Главные специалисты');
  const [positionsData, setPositionsData] = useState<PositionData[]>([
    { id: 1, position: 'Главный инженер', audits: 6, observations: 18 },
    { id: 2, position: 'Зам. Главного инженера', audits: 6, observations: 18 },
    { id: 3, position: 'ЗУД по горным работам', audits: 6, observations: 18 },
    { id: 4, position: 'Главный энергетик', audits: 6, observations: 18 },
    { id: 5, position: 'Главный механик', audits: 6, observations: 18 },
    { id: 6, position: 'Зам. Главного механика', audits: 6, observations: 18 },
    { id: 7, position: 'Главный маркшейдер', audits: 6, observations: 18 },
    { id: 8, position: 'Зам. Главного маркшейдера', audits: 6, observations: 18 },
    { id: 9, position: 'Главный геолог', audits: 6, observations: 18 },
    { id: 10, position: 'Зам. Главного геолога', audits: 6, observations: 18 },
  ]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
    }
  }, [navigate]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const newFile = {
          id: uploadedFiles.length + 1,
          name: file.name,
          date: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        };
        setUploadedFiles([...uploadedFiles, newFile]);
        toast({
          title: "Файл загружен",
          description: `Файл "${file.name}" успешно загружен`,
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Пожалуйста, загрузите файл формата .xlsx или .xls",
          variant: "destructive"
        });
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(uploadedFiles.map(f => f.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectFile = (fileId: number, checked: boolean) => {
    if (checked) {
      setSelectedFiles([...selectedFiles, fileId]);
    } else {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    }
  };

  const handleDeleteSelected = () => {
    setUploadedFiles(uploadedFiles.filter(f => !selectedFiles.includes(f.id)));
    setSelectedFiles([]);
    toast({
      title: "Файлы удалены",
      description: `Удалено файлов: ${selectedFiles.length}`,
    });
  };

  const handleDataChange = (id: number, field: 'audits' | 'observations', value: string) => {
    const numValue = parseInt(value) || 0;
    setPositionsData(positionsData.map(item => 
      item.id === id ? { ...item, [field]: numValue } : item
    ));
  };

  const handleSaveFile = () => {
    toast({
      title: "Файл сохранён",
      description: "Изменения успешно сохранены",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Шапка */}
        <Card className="bg-white p-6 mb-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Личные показатели ПАБ</h1>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'назад' ? 'default' : 'outline'}
                onClick={() => setActiveTab('назад')}
                className="rounded-full px-8"
              >
                Назад
              </Button>
              <Button
                variant={activeTab === 'печать' ? 'default' : 'outline'}
                onClick={() => setActiveTab('печать')}
                className="rounded-full px-8"
              >
                Печать
              </Button>
            </div>
          </div>
        </Card>

        {/* Секция загрузки файла */}
        <Card className="bg-white p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Загрузка графика (Excel)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Загрузите актуальный файл .xlsx или .xls. После изменений перезагрузите обновлённую версию.
          </p>
          <label htmlFor="excel-upload">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
              onClick={() => document.getElementById('excel-upload')?.click()}
            >
              Загрузить Excel
            </Button>
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
        </Card>

        {/* Секция файлов графика */}
        <Card className="bg-white p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Файлы графика</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Выбрано: {selectedFiles.length}</span>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={selectedFiles.length === 0}
                className="bg-red-400 hover:bg-red-500 rounded-full px-6"
              >
                Удалить выбранные
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 pb-2 border-b">
              <Checkbox
                checked={selectedFiles.length === uploadedFiles.length && uploadedFiles.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-gray-700">Выбрать все</span>
            </div>

            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between py-3 border-b hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedFiles.includes(file.id)}
                    onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                  />
                  <a href="#" className="text-blue-600 hover:underline text-sm">
                    {file.name}
                  </a>
                </div>
                <span className="text-sm text-gray-500">{file.date}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Таблица для заполнения */}
        <Card className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Таблица для заполнения</h2>
            <div className="flex items-center gap-4">
              <select 
                className="border border-gray-300 rounded px-4 py-2 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option>Главные специалисты</option>
                <option>Руководители участков</option>
                <option>Инженерный состав</option>
              </select>
              <Button variant="outline" className="rounded px-6 text-sm">
                Редактировать текст
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded px-6 text-sm"
                onClick={handleSaveFile}
              >
                Сохранить файл
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Формулы пересчитываются автоматически. Для скорости показаны первые 200 строк и 50 столбцов
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-700 bg-gray-50">Должность</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700 bg-gray-50">Аудиты</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700 bg-gray-50">Наблюдения</th>
                </tr>
              </thead>
              <tbody>
                {positionsData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-900">{item.position}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.audits}
                        onChange={(e) => handleDataChange(item.id, 'audits', e.target.value)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.observations}
                        onChange={(e) => handleDataChange(item.id, 'observations', e.target.value)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Кнопка назад внизу */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => navigate('/additional')}
            variant="outline"
            className="rounded-full px-8"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад к дополнительным страницам
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;
