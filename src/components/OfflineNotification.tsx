import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function OfflineNotification() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Соединение восстановлено', {
        description: 'Нажмите "Обновить" для загрузки свежих данных',
        icon: <Wifi className="h-5 w-5 text-green-500" />,
        duration: Infinity,
        action: {
          label: 'Обновить',
          onClick: () => window.location.reload(),
        },
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Нет подключения к интернету', {
        description: 'Вы работаете в офлайн-режиме',
        icon: <WifiOff className="h-5 w-5 text-red-500" />,
        duration: Infinity,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}