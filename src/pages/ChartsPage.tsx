import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import func2url from '../../backend/func2url.json';

interface PositionData {
  id: number;
  position: string;
  audits: number;
  observations: number;
}

interface SheetData {
  [sheetName: string]: PositionData[];
}

const ChartsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: number; name: string; date: string }>>([]);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sheetsData, setSheetsData] = useState<SheetData>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [positionsData, setPositionsData] = useState<PositionData[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole');
    if (!userId) {
      navigate('/');
      return;
    }
    setUserRole(role || '');

    // Загрузить данные из БД вместо localStorage
    loadScheduleFromDB();
  }, [navigate]);

  const loadScheduleFromDB = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(func2url['pab-schedule'], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.file) {
          const fileData = data.file.data;
          
          setUploadedFiles([{
            id: data.file.id,
            name: data.file.name,
            date: new Date(data.file.uploadedAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          }]);
          
          setSheetsData(fileData.sheetsData || {});
          setSheetNames(fileData.sheetNames || []);
          
          if (fileData.sheetNames && fileData.sheetNames.length > 0) {
            setSelectedCategory(fileData.sheetNames[0]);
          }
          
          setIsEditMode(false);
        }
      }
    } catch (error) {
      console.error('Failed to load schedule from DB:', error);
    }
  };

  useEffect(() => {
    if (selectedCategory && sheetsData[selectedCategory]) {
      setPositionsData(sheetsData[selectedCategory]);
    }
  }, [selectedCategory, sheetsData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            const newSheetsData: SheetData = {};
            const newSheetNames = workbook.SheetNames;
            
            workbook.SheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
              
              const positions: PositionData[] = [];
              
              for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row && row.length >= 2 && row[0]) {
                  const audits = Number(row[1]) || 0;
                  positions.push({
                    id: i,
                    position: String(row[0] || ''),
                    audits: audits,
                    observations: audits * 3
                  });
                }
              }
              
              if (positions.length > 0) {
                newSheetsData[sheetName] = positions;
              }
            });
            
            const newFile = {
              id: Date.now(),
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
            
            // Заменяем старый файл новым (только один активный файл)
            setUploadedFiles([newFile]);
            setSheetsData(newSheetsData);
            setSheetNames(newSheetNames);
            
            if (newSheetNames.length > 0) {
              setSelectedCategory(newSheetNames[0]);
            }
            
            setIsEditMode(true);
            
            toast({
              title: "Файл загружен",
              description: `Файл "${file.name}" успешно распознан. Найдено листов: ${newSheetNames.length}`,
            });
          } catch (error) {
            toast({
              title: "Ошибка",
              description: "Не удалось прочитать файл Excel",
              variant: "destructive"
            });
          }
        };
        reader.readAsBinaryString(file);
      } else {
        toast({
          title: "Ошибка",
          description: "Пожалуйста, загрузите файл формата .xlsx или .xls",
          variant: "destructive"
        });
      }
    }
    event.target.value = '';
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

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      const userId = localStorage.getItem('userId');
      
      for (const fileId of selectedFiles) {
        await fetch(`${func2url['pab-schedule']}?file_id=${fileId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId || ''
          }
        });
      }
      
      setUploadedFiles([]);
      setSelectedFiles([]);
      setSheetsData({});
      setSheetNames([]);
      setPositionsData([]);
      setSelectedCategory('');
      setIsEditMode(false);
      
      toast({
        title: "Файлы удалены",
        description: `Удалено файлов: ${selectedFiles.length}. Все данные очищены.`,
      });
      
      await loadScheduleFromDB();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить файлы",
        variant: "destructive"
      });
    }
  };

  const handleDataChange = (id: number, field: 'audits' | 'observations', value: string) => {
    if (!isEditMode) return;
    
    const numValue = parseInt(value) || 0;
    const updatedData = positionsData.map(item => {
      if (item.id === id) {
        if (field === 'audits') {
          return { ...item, audits: numValue, observations: numValue * 3 };
        }
        return { ...item, [field]: numValue };
      }
      return item;
    });
    setPositionsData(updatedData);
    
    if (selectedCategory) {
      const updatedSheetsData = {
        ...sheetsData,
        [selectedCategory]: updatedData
      };
      setSheetsData(updatedSheetsData);
    }
  };

  const handleSaveFile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const fileName = uploadedFiles[0]?.name || 'График ПАБ';
      
      const response = await fetch(func2url['pab-schedule'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || ''
        },
        body: JSON.stringify({
          fileName: fileName,
          fileData: {
            sheetNames,
            sheetsData
          }
        })
      });

      if (response.ok) {
        setIsEditMode(false);
        
        toast({
          title: "График сохранён",
          description: "Все пользователи теперь видят актуальный график",
        });
        
        // Обновить список файлов
        await loadScheduleFromDB();
      } else {
        const error = await response.json();
        toast({
          title: "Ошибка сохранения",
          description: error.error || "Не удалось сохранить файл",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить файл в базу данных",
        variant: "destructive"
      });
    }
  };

  const handleEditText = () => {
    setIsEditMode(true);
    toast({
      title: "Режим редактирования",
      description: "Теперь вы можете редактировать таблицу",
    });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const isAdmin = userRole === 'admin' || userRole === 'main_admin' || userRole === 'super_admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Шапка */}
        <Card className="bg-white p-6 mb-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Личные показатели ПАБ</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/additional')}
                className="rounded-full px-8"
              >
                Назад
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="rounded-full px-8"
              >
                Печать
              </Button>
            </div>
          </div>
        </Card>

        {/* Секция загрузки файла - только для админов */}
        {isAdmin && (
        <Card className="bg-white p-6 mb-6 shadow-sm border-2 border-blue-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Icon name="Upload" size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Загрузка графика ПАБ (Excel)</h2>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Шаг 1:</strong> Нажмите "Загрузить Excel" и выберите файл .xlsx или .xls</p>
                <p><strong>Шаг 2:</strong> При необходимости отредактируйте данные в таблице</p>
                <p><strong>Шаг 3:</strong> Нажмите зелёную кнопку "✓ Сохранить файл для всех"</p>
                <p className="text-green-700 font-medium">✓ После сохранения ВСЕ пользователи организации увидят актуальный график</p>
              </div>
            </div>
          </div>
          <label htmlFor="excel-upload">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-3 text-base font-semibold"
              onClick={() => document.getElementById('excel-upload')?.click()}
            >
              <Icon name="FileSpreadsheet" size={20} className="inline mr-2" />
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
        )}

        {/* Секция файлов графика - только для админов */}
        {isAdmin && (
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

            {uploadedFiles.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                Файлы не загружены
              </div>
            ) : (
              uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between py-3 border-b hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                    />
                    <Icon name="FileSpreadsheet" size={20} className="text-green-600" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">{file.date}</span>
                    </div>
                  </div>
                  {!isEditMode && (
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                      ✓ Сохранён и виден всем
                    </span>
                  )}
                  {isEditMode && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                      ⚠ Не сохранён
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
        )}

        {/* Таблица для заполнения */}
        <Card className="bg-white p-6 shadow-sm">
          {!isAdmin && uploadedFiles.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <Icon name="Info" size={16} className="inline mr-2" />
                График загружен главным администратором: <strong>{uploadedFiles[0].name}</strong> ({uploadedFiles[0].date})
              </p>
            </div>
          )}
          {isAdmin && isEditMode && (
            <div className="mb-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-400">
              <p className="text-sm text-amber-900 font-medium">
                <Icon name="AlertTriangle" size={18} className="inline mr-2" />
                Файл загружен, но НЕ СОХРАНЁН! Нажмите кнопку "Сохранить файл" чтобы все пользователи увидели обновлённый график.
              </p>
            </div>
          )}
          <div ref={printRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Таблица для заполнения</h2>
            <div className="flex items-center gap-4">
              <select 
                className="border border-gray-300 rounded px-4 py-2 text-sm"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={sheetNames.length === 0}
              >
                {sheetNames.length === 0 ? (
                  <option value="">Загрузите файл Excel</option>
                ) : (
                  sheetNames.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))
                )}
              </select>
              {isAdmin && (
                <>
              <Button 
                variant="outline" 
                className="rounded px-6 text-sm"
                onClick={handleEditText}
                disabled={positionsData.length === 0 || isEditMode}
              >
                Редактировать текст
              </Button>
              <Button 
                className={`rounded px-6 text-sm text-white ${
                  isEditMode 
                    ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={handleSaveFile}
                disabled={positionsData.length === 0 || !isEditMode}
              >
                {isEditMode ? '✓ Сохранить файл для всех' : 'Файл сохранён'}
              </Button>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Формулы пересчитываются автоматически. Для скорости показаны первые 200 строк и 50 столбцов
          </p>

          <div className="overflow-x-auto">
            {positionsData.length === 0 ? (
              <div className="py-12 text-center">
                {isAdmin ? (
                  <div className="text-gray-500">
                    <Icon name="FileSpreadsheet" size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">График не загружен</p>
                    <p className="text-sm">Загрузите Excel файл выше для отображения данных</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Icon name="Clock" size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">График пока не загружен</p>
                    <p className="text-sm">Главный администратор ещё не загрузил график ПАБ</p>
                  </div>
                )}
              </div>
            ) : (
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
                        {isAdmin ? (
                          <input
                            type="number"
                            value={item.audits}
                            onChange={(e) => handleDataChange(item.id, 'audits', e.target.value)}
                            disabled={!isEditMode}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <span className="text-sm text-gray-700">{item.audits}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-700">{item.observations}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>
        </Card>


      </div>
    </div>
  );
};

export default ChartsPage;