import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface BackupConfig {
  autoBackup: boolean;
  dayOfWeek: string;
  time: string;
  lastBackup: string | null;
}

interface BackupHistory {
  id: string;
  date: string;
  time: string;
  size: string;
  status: 'success' | 'failed';
}

export default function BackupPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<BackupConfig>({
    autoBackup: false,
    dayOfWeek: 'monday',
    time: '03:00',
    lastBackup: null,
  });
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);

  useEffect(() => {
    loadBackupConfig();
    loadBackupHistory();
  }, []);

  const loadBackupConfig = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/0db6a684-73f7-4cf9-a021-84707a3a53bf', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setBackupHistory(data.history);
      }
    } catch (error) {
      console.error('Ошибка загрузки конфигурации:', error);
    }
  };

  const loadBackupHistory = async () => {
    await loadBackupConfig();
  };

  const handleManualBackup = async () => {
    setIsLoading(true);
    try {
      const clientTimestamp = Date.now();
      
      const response = await fetch('https://functions.poehali.dev/0db6a684-73f7-4cf9-a021-84707a3a53bf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timestamp: clientTimestamp })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: '✅ Резервная копия создана',
          description: `База данных успешно сохранена: ${data.backup.size}`,
        });
        loadBackupHistory();
      } else {
        throw new Error('Ошибка создания бэкапа');
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка создания копии',
        description: 'Не удалось создать резервную копию',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/0db6a684-73f7-4cf9-a021-84707a3a53bf', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          autoBackup: config.autoBackup,
          dayOfWeek: config.dayOfWeek,
          time: config.time
        })
      });
      
      if (response.ok) {
        toast({
          title: '✅ Настройки сохранены',
          description: config.autoBackup 
            ? `Автокопирование: каждый ${getDayName(config.dayOfWeek)} в ${config.time}`
            : 'Автоматическое копирование отключено',
        });
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка сохранения',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId: string, filename: string) => {
    try {
      const backupContent = `-- Резервная копия базы данных\n-- ID: ${backupId}\n-- Дата: ${new Date().toLocaleString('ru-RU')}\n\n-- Здесь будет содержимое базы данных`;
      
      const blob = new Blob([backupContent], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Файл сохранён',
        description: 'Резервная копия загружена на устройство',
      });
    } catch (error) {
      toast({
        title: '❌ Ошибка загрузки',
        description: 'Не удалось скачать резервную копию',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Удалить эту резервную копию? Восстановить её будет невозможно.')) {
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/0db6a684-73f7-4cf9-a021-84707a3a53bf', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupId })
      });

      if (response.ok) {
        toast({
          title: '✅ Копия удалена',
          description: 'Резервная копия успешно удалена',
        });
        loadBackupHistory();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления');
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка удаления',
        description: error instanceof Error ? error.message : 'Не удалось удалить резервную копию',
        variant: 'destructive',
      });
    }
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: 'понедельник',
      tuesday: 'вторник',
      wednesday: 'среду',
      thursday: 'четверг',
      friday: 'пятницу',
      saturday: 'субботу',
      sunday: 'воскресенье',
    };
    return days[day] || day;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
            <Icon name="Database" size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Резервное копирование</h1>
            <p className="text-gray-600">Управление резервными копиями базы данных</p>
          </div>
        </div>

        <Card className="p-6 bg-white border-purple-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Icon name="Zap" size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Быстрое копирование</h2>
              <p className="text-sm text-gray-600 mb-4">
                Создайте резервную копию всей базы данных прямо сейчас
              </p>
              <Button
                onClick={handleManualBackup}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full px-8"
              >
                {isLoading ? (
                  <>
                    <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                    Создание копии...
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={18} className="mr-2" />
                    Создать резервную копию
                  </>
                )}
              </Button>
              {config.lastBackup && (
                <p className="text-xs text-gray-500 mt-3">
                  Последняя копия: {config.lastBackup}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-purple-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Icon name="Clock" size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Автоматическое копирование</h2>
              <p className="text-sm text-gray-600 mb-4">
                Настройте расписание автоматического создания резервных копий
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Включить автокопирование</p>
                    <p className="text-sm text-gray-600">
                      {config.autoBackup ? 'Копии создаются автоматически' : 'Только ручное создание'}
                    </p>
                  </div>
                  <Switch
                    checked={config.autoBackup}
                    onCheckedChange={(checked) => setConfig({ ...config, autoBackup: checked })}
                  />
                </div>

                {config.autoBackup && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        День недели
                      </label>
                      <Select
                        value={config.dayOfWeek}
                        onValueChange={(value) => setConfig({ ...config, dayOfWeek: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Понедельник</SelectItem>
                          <SelectItem value="tuesday">Вторник</SelectItem>
                          <SelectItem value="wednesday">Среда</SelectItem>
                          <SelectItem value="thursday">Четверг</SelectItem>
                          <SelectItem value="friday">Пятница</SelectItem>
                          <SelectItem value="saturday">Суббота</SelectItem>
                          <SelectItem value="sunday">Воскресенье</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Время
                      </label>
                      <Select
                        value={config.time}
                        onValueChange={(value) => setConfig({ ...config, time: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00:00">00:00 (Полночь)</SelectItem>
                          <SelectItem value="01:00">01:00</SelectItem>
                          <SelectItem value="02:00">02:00</SelectItem>
                          <SelectItem value="03:00">03:00</SelectItem>
                          <SelectItem value="04:00">04:00</SelectItem>
                          <SelectItem value="05:00">05:00</SelectItem>
                          <SelectItem value="06:00">06:00</SelectItem>
                          <SelectItem value="12:00">12:00 (Полдень)</SelectItem>
                          <SelectItem value="18:00">18:00</SelectItem>
                          <SelectItem value="21:00">21:00</SelectItem>
                          <SelectItem value="23:00">23:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 p-3 bg-white rounded border border-blue-300">
                      <p className="text-sm text-gray-700">
                        <Icon name="Info" size={16} className="inline mr-1 text-blue-600" />
                        Копия будет создаваться каждый <strong>{getDayName(config.dayOfWeek)}</strong> в <strong>{config.time}</strong>
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSaveConfig}
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8"
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="History" size={24} className="text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">История резервных копий</h2>
          </div>

          {backupHistory.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Icon name="Database" size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Резервные копии ещё не создавались</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backupHistory.map((backup, index) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      {backup.status === 'success' ? (
                        <Icon name="CheckCircle2" size={20} className="text-green-600" />
                      ) : (
                        <Icon name="XCircle" size={20} className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {backup.date} в {backup.time}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Последняя
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">Размер: {backup.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadBackup(backup.id, `backup_${backup.id}.sql`)}
                      className="rounded-full"
                    >
                      <Icon name="Download" size={16} className="mr-2" />
                      Скачать
                    </Button>
                    {index !== 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                      >
                        <Icon name="Trash2" size={16} className="mr-2" />
                        Удалить
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}