import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Props {
  organizationId: string;
  orgName: string;
  externalDbUrl: string | null;
  externalDbSchema: string | null;
  onSaved: (url: string | null, schema: string | null) => void;
}

export const ExternalDatabaseSection = ({
  organizationId,
  orgName,
  externalDbUrl,
  externalDbSchema,
  onSaved,
}: Props) => {
  const [dbUrl, setDbUrl] = useState(externalDbUrl || '');
  const [dbSchema, setDbSchema] = useState(externalDbSchema || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const isConnected = !!externalDbUrl;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organizationId,
          external_db_url: dbUrl.trim() || null,
          external_db_schema: dbSchema.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSaved(dbUrl.trim() || null, dbSchema.trim() || null);
      toast.success('Настройки внешней БД сохранены');
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Отключить внешнюю БД для "${orgName}"? Данные организации будут читаться из основной БД.`)) return;
    setSaving(true);
    try {
      const res = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: organizationId, external_db_url: null, external_db_schema: null }),
      });
      if (!res.ok) throw new Error();
      setDbUrl('');
      setDbSchema('');
      onSaved(null, null);
      toast.success('Внешняя БД отключена');
    } catch {
      toast.error('Не удалось отключить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-purple-600/30 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-600/20' : 'bg-slate-700/50'}`}>
          <Icon name="Database" size={22} className={isConnected ? 'text-green-400' : 'text-slate-400'} />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Внешняя база данных</h3>
          <p className="text-slate-400 text-sm">
            {isConnected
              ? 'Данные организации хранятся на собственных ресурсах клиента'
              : 'Данные хранятся в основной БД платформы'}
          </p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
            {isConnected ? 'Подключена' : 'Не подключена'}
          </span>
        </div>
      </div>

      {isConnected && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 mb-5 flex items-start gap-2">
          <Icon name="CheckCircle" size={16} className="text-green-400 mt-0.5 shrink-0" />
          <p className="text-green-300 text-sm">
            Внешняя БД подключена. Все операции с данными этой организации идут через их сервер.
            Чтобы изменить — обновите строку подключения ниже.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label className="text-slate-300 mb-1.5 block">
            Строка подключения (DSN) <span className="text-slate-500 font-normal">— PostgreSQL</span>
          </Label>
          <div className="relative">
            <Input
              type={showUrl ? 'text' : 'password'}
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql://user:password@host:5432/dbname"
              className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowUrl(!showUrl)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <Icon name={showUrl ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Формат: postgresql://пользователь:пароль@хост:порт/база_данных
          </p>
        </div>

        <div>
          <Label className="text-slate-300 mb-1.5 block">
            Схема БД <span className="text-slate-500 font-normal">— если не указана, используется public</span>
          </Label>
          <Input
            type="text"
            value={dbSchema}
            onChange={(e) => setDbSchema(e.target.value)}
            placeholder="public"
            className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
        >
          {saving ? (
            <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Сохранение...</>
          ) : (
            <><Icon name="Save" size={16} className="mr-2" />{isConnected ? 'Обновить подключение' : 'Подключить внешнюю БД'}</>
          )}
        </Button>
        {isConnected && (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={saving}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400"
          >
            <Icon name="Unplug" size={16} className="mr-2" />
            Отключить
          </Button>
        )}
      </div>

      <div className="mt-5 border-t border-slate-700 pt-4">
        <p className="text-slate-500 text-xs flex items-start gap-1.5">
          <Icon name="Info" size={13} className="mt-0.5 shrink-0" />
          Секрет <code className="bg-slate-700 px-1 rounded">ORG_{organizationId}_DATABASE_URL</code> в платформе обновляется автоматически при сохранении.
          Переключение вступает в силу немедленно — при следующем запросе от пользователей этой организации.
        </p>
      </div>
    </Card>
  );
};
