import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface TableInfo {
  table_name: string;
  schema_name: string;
  row_count: number;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
}

const TABLE_DESCRIPTIONS: Record<string, string> = {
  'users': 'Пользователи системы (Профиль, Авторизация)',
  'organizations': 'Организации (Список организаций)',
  'pab_reports': 'ПАБ отчеты (Регистрация ПАБ, Список ПАБ)',
  'production_control': 'Производственный контроль (ПК, Список ПК)',
  'kbt_reports': 'КБТ отчеты (Отчет для КБТ)',
  'storage_folders': 'Папки хранилища (Хранилище)',
  'storage_files': 'Файлы хранилища (Хранилище)',
  'prescriptions': 'Предписания (Реестр предписаний)',
  'orders': 'Поручения (Журнал поручений)',
  'chats': 'Чаты (Мессенджер)',
  'messages': 'Сообщения (Мессенджер)',
  'modules': 'Модули системы (Управление модулями)',
  'tariffs': 'Тарифы (Управление тарифами)',
  'organization_points': 'Баллы организаций (Мои показатели)',
};

export default function DatabasePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [schemaName, setSchemaName] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId || role !== 'superadmin') {
      navigate('/');
      return;
    }

    loadTables();
  }, [navigate]);

  const loadTables = async () => {
    setLoading(true);
    try {
      // Получаем список всех таблиц с количеством строк
      const response = await fetch('https://functions.poehali.dev/0d86335d-9fae-4e7c-9a8c-d3432936edae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_tables'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
        setSchemaName(data.schema || '');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Ошибка загрузки списка таблиц: ${errorData.error || response.statusText}`);
        console.error('Response error:', errorData);
      }
    } catch (error: any) {
      console.error('Error loading tables:', error);
      toast.error(`Ошибка соединения: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    setLoading(true);
    setSelectedTable(tableName);
    
    try {
      // Получаем структуру таблицы
      const columnsResponse = await fetch('https://functions.poehali.dev/0d86335d-9fae-4e7c-9a8c-d3432936edae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'table_structure',
          table_name: tableName
        })
      });

      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json();
        setColumns(columnsData.columns || []);
      } else {
        const errorData = await columnsResponse.json().catch(() => ({}));
        toast.error(`Ошибка загрузки структуры: ${errorData.error || ''}`);
      }

      // Получаем данные таблицы
      const dataResponse = await fetch('https://functions.poehali.dev/0d86335d-9fae-4e7c-9a8c-d3432936edae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'table_data',
          table_name: tableName,
          limit: limit,
          search: searchQuery
        })
      });

      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setTableData(data.rows || []);
      } else {
        const errorData = await dataResponse.json().catch(() => ({}));
        toast.error(`Ошибка загрузки данных: ${errorData.error || ''}`);
      }
    } catch (error: any) {
      console.error('Error loading table data:', error);
      toast.error(`Ошибка загрузки данных таблицы: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    if (tableData.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const dataStr = JSON.stringify(tableData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Данные экспортированы в JSON');
  };

  const exportToCSV = () => {
    if (tableData.length === 0 || columns.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const headers = columns.map(col => col.column_name).join(',');
    const rows = tableData.map(row => 
      columns.map(col => {
        const value = row[col.column_name];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Данные экспортированы в CSV');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/superadmin')}
              className="border-purple-600/50 text-purple-400"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-3 rounded-xl">
                <Icon name="Database" size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">База данных</h1>
                <p className="text-slate-400 text-sm">
                  {schemaName ? `Схема: ${schemaName}` : 'Просмотр всех таблиц и данных'}
                </p>
              </div>
            </div>
          </div>
          
          {selectedTable && (
            <div className="flex gap-2">
              <Button
                onClick={exportToJSON}
                variant="outline"
                className="border-blue-600 text-blue-400"
              >
                <Icon name="FileJson" size={18} className="mr-2" />
                Экспорт JSON
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-green-600 text-green-400"
              >
                <Icon name="FileSpreadsheet" size={18} className="mr-2" />
                Экспорт CSV
              </Button>
            </div>
          )}
        </div>

        <Card className="bg-slate-800/50 border-purple-600/30 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-white font-semibold mb-2 block">Выберите таблицу</label>
              <Select value={selectedTable} onValueChange={loadTableData}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите таблицу..." />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.table_name} value={table.table_name}>
                      {table.table_name} ({table.row_count} строк)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTable && TABLE_DESCRIPTIONS[selectedTable] && (
                <p className="text-xs text-blue-400 mt-2">
                  <Icon name="Info" size={12} className="inline mr-1" />
                  {TABLE_DESCRIPTIONS[selectedTable]}
                </p>
              )}
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Лимит строк</label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                className="bg-slate-700 border-slate-600 text-white"
                min={1}
                max={1000}
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Поиск</label>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Введите текст для поиска..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={() => selectedTable && loadTableData(selectedTable)}
                  disabled={!selectedTable || loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Icon name="Search" size={18} />
                </Button>
              </div>
            </div>
          </div>

          {selectedTable && (
            <div className="text-sm text-slate-400">
              <strong>Столбцов:</strong> {columns.length} | <strong>Строк показано:</strong> {tableData.length}
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <Icon name="Loader2" size={48} className="text-purple-600 animate-spin" />
          </div>
        )}

        {!loading && selectedTable && tableData.length > 0 && (
          <Card className="bg-slate-800/50 border-purple-600/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white">
                <thead className="bg-slate-900/50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.column_name}
                        className="px-4 py-3 text-left font-semibold text-purple-400 border-b border-slate-700"
                      >
                        {col.column_name}
                        <span className="text-xs text-slate-500 ml-2">({col.data_type})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      {columns.map((col) => (
                        <td key={col.column_name} className="px-4 py-3 max-w-xs truncate">
                          {row[col.column_name] === null || row[col.column_name] === undefined ? (
                            <span className="text-slate-600 italic">NULL</span>
                          ) : typeof row[col.column_name] === 'boolean' ? (
                            <span className={row[col.column_name] ? 'text-green-400' : 'text-red-400'}>
                              {row[col.column_name] ? 'true' : 'false'}
                            </span>
                          ) : typeof row[col.column_name] === 'object' ? (
                            <span className="text-blue-400">{JSON.stringify(row[col.column_name])}</span>
                          ) : (
                            String(row[col.column_name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!loading && selectedTable && tableData.length === 0 && (
          <Card className="bg-slate-800/50 border-purple-600/30 p-12 text-center">
            <Icon name="Inbox" size={64} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Нет данных в таблице</p>
          </Card>
        )}

        {!loading && !selectedTable && tables.length > 0 && (
          <Card className="bg-slate-800/50 border-purple-600/30 p-12 text-center">
            <Icon name="Table" size={64} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Выберите таблицу для просмотра данных</p>
            <p className="text-slate-500 text-sm mt-2">Всего таблиц: {tables.length}</p>
          </Card>
        )}
      </div>
    </div>
  );
}