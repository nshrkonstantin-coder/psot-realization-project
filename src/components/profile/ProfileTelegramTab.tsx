import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const PROFILE_API = 'https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f';

interface UserProfile {
  telegram_chat_id?: number;
  telegram_username?: string;
  telegram_linked_at?: string;
}

interface ProfileTelegramTabProps {
  profile: UserProfile;
  onReload: (userId: string) => void;
}

const ProfileTelegramTab = ({ profile, onReload }: ProfileTelegramTabProps) => {
  const { toast } = useToast();
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);

  const handleUnlink = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      await fetch(PROFILE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink_telegram', userId }),
      });
      toast({ title: 'Telegram отключён' });
      onReload(userId);
    } catch {
      toast({ title: 'Ошибка отключения', variant: 'destructive' });
    }
  };

  const handleGenerateCode = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    setLoadingTelegram(true);
    try {
      const response = await fetch(PROFILE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_telegram_code', userId }),
      });
      const data = await response.json();
      if (data.success && data.linkCode) setTelegramCode(data.linkCode);
    } catch {
      toast({ title: 'Ошибка генерации кода', variant: 'destructive' });
    } finally {
      setLoadingTelegram(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-700 p-3 rounded-xl">
            <Icon name="Send" size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Уведомления Telegram</h2>
            <p className="text-gray-400 text-sm">Получай мгновенные уведомления о предписаниях</p>
          </div>
        </div>

        {profile.telegram_chat_id ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Icon name="CheckCircle" size={24} className="text-green-500" />
                <div>
                  <p className="text-white font-semibold">Telegram подключён</p>
                  {profile.telegram_username && (
                    <p className="text-gray-400 text-sm">@{profile.telegram_username}</p>
                  )}
                  <p className="text-gray-400 text-xs">
                    Подключено: {new Date(profile.telegram_linked_at!).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleUnlink} variant="outline"
              className="border-red-600/50 text-red-400 hover:bg-red-600/10">
              <Icon name="Unlink" size={20} className="mr-2" />Отключить Telegram
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Как подключить:</h3>
              <ol className="text-gray-300 text-sm space-y-2">
                <li>1. Нажми кнопку "Получить код привязки"</li>
                <li>2. Открой Telegram и найди бота (ссылка появится)</li>
                <li>3. Отправь боту команду: <code className="bg-slate-700 px-2 py-1 rounded">/start КОД</code></li>
                <li>4. Готово! Теперь ты будешь получать уведомления</li>
              </ol>
            </div>

            {telegramCode ? (
              <div className="space-y-4">
                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                  <p className="text-white font-semibold mb-2">Твой код привязки:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-700 px-4 py-2 rounded text-yellow-400 text-2xl font-mono flex-1 text-center">
                      {telegramCode}
                    </code>
                    <Button size="sm" onClick={() => {
                      navigator.clipboard.writeText(telegramCode);
                      toast({ title: 'Код скопирован!' });
                    }} className="bg-slate-700 hover:bg-slate-600">
                      <Icon name="Copy" size={16} />
                    </Button>
                  </div>
                </div>
                <Button onClick={() => window.open(`https://t.me/ASUBT_bot?start=${telegramCode}`, '_blank')}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800">
                  <Icon name="Send" size={20} className="mr-2" />Открыть бота в Telegram
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerateCode} disabled={loadingTelegram}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800">
                <Icon name="Key" size={20} className="mr-2" />
                {loadingTelegram ? 'Генерация...' : 'Получить код привязки'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfileTelegramTab;
