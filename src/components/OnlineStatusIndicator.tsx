import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OnlineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
      <WifiOff className="h-4 w-4 text-red-500 animate-pulse" />
      <span className="text-sm font-medium text-red-500">Офлайн</span>
    </div>
  );
}
