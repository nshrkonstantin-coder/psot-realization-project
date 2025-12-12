import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import NotificationStats from '@/components/notifications/NotificationStats';
import NotificationFilters from '@/components/notifications/NotificationFilters';
import NotificationList from '@/components/notifications/NotificationList';

interface Notification {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  pageUrl?: string;
  pageName?: string;
  userId?: number;
  userFio?: string;
  userPosition?: string;
  organizationId?: number;
  organizationName?: string;
  actionType?: string;
  errorDetails?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

interface Stats {
  total: number;
  unread: number;
  errors: number;
  warnings: number;
}

const SystemNotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, unread: 0, errors: 0, warnings: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [translatedTexts, setTranslatedTexts] = useState<Map<number, { title: string; message: string; errorDetails?: string }>>(new Map());
  const [isFixDialogOpen, setIsFixDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [fixNotes, setFixNotes] = useState('');

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      navigate('/dashboard');
      return;
    }
    loadNotifications();
  }, [navigate, filterType, filterRead]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      let url = 'https://functions.poehali.dev/93aa0398-4cd1-4a05-956b-50984ea3e98e?limit=100';
      
      if (filterType !== 'all') {
        url += `&type=${filterType}`;
      }
      if (filterRead !== 'all') {
        url += `&is_read=${filterRead}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Ошибка загрузки уведомлений');

      const data = await response.json();
      const fetchedNotifications = data.notifications || [];
      setNotifications(fetchedNotifications);
      setStats(data.stats || { total: 0, unread: 0, errors: 0, warnings: 0 });
      
      translateNotifications(fetchedNotifications);
    } catch (error) {
      toast.error('Не удалось загрузить уведомления');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isRussianText = (text: string): boolean => {
    const russianChars = text.match(/[а-яА-ЯёЁ]/g);
    const totalChars = text.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '').length;
    return russianChars ? (russianChars.length / totalChars) > 0.5 : false;
  };

  const translateText = async (text: string): Promise<string> => {
    if (!text || isRussianText(text)) return text;
    
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q=${encodeURIComponent(text)}`);
      const data = await response.json();
      return data[0]?.map((item: any) => item[0]).join('') || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const translateNotifications = async (notifs: Notification[]) => {
    const newTranslations = new Map(translatedTexts);
    
    for (const notif of notifs) {
      if (!newTranslations.has(notif.id)) {
        const [translatedTitle, translatedMessage, translatedError] = await Promise.all([
          translateText(notif.title),
          translateText(notif.message),
          notif.errorDetails ? translateText(notif.errorDetails) : Promise.resolve(undefined)
        ]);
        
        newTranslations.set(notif.id, {
          title: translatedTitle,
          message: translatedMessage,
          errorDetails: translatedError
        });
      }
    }
    
    setTranslatedTexts(newTranslations);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleMarkRead = async () => {
    if (selectedIds.length === 0) {
      toast.error('Выберите уведомления');
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/93aa0398-4cd1-4a05-956b-50984ea3e98e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          ids: selectedIds
        })
      });

      if (!response.ok) throw new Error('Ошибка');

      toast.success('Уведомления отмечены как прочитанные');
      setSelectedIds([]);
      loadNotifications();
    } catch (error) {
      toast.error('Ошибка при обновлении');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Выберите уведомления для удаления');
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/93aa0398-4cd1-4a05-956b-50984ea3e98e', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      toast.success(`Удалено уведомлений: ${selectedIds.length}`);
      setSelectedIds([]);
      loadNotifications();
    } catch (error) {
      toast.error('Ошибка при удалении');
      console.error(error);
    }
  };

  const openFixDialog = (notification: Notification) => {
    setSelectedNotification(notification);
    setFixNotes('');
    setIsFixDialogOpen(true);
  };

  const handleFixError = async () => {
    if (!selectedNotification || !fixNotes.trim()) {
      toast.error('Опишите способ исправления ошибки');
      return;
    }

    try {
      await fetch('https://functions.poehali.dev/93aa0398-4cd1-4a05-956b-50984ea3e98e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          type: 'success',
          severity: 'medium',
          title: `Ошибка исправлена: ${selectedNotification.title}`,
          message: `Способ исправления: ${fixNotes}`,
          pageUrl: selectedNotification.pageUrl,
          pageName: selectedNotification.pageName,
          userId: selectedNotification.userId,
          userFio: selectedNotification.userFio,
          userPosition: selectedNotification.userPosition,
          organizationId: selectedNotification.organizationId,
          organizationName: selectedNotification.organizationName,
          actionType: 'error_fixed',
          metadata: {
            originalErrorId: selectedNotification.id,
            fixedBy: localStorage.getItem('userFio'),
            fixedAt: new Date().toISOString()
          }
        })
      });

      await fetch('https://functions.poehali.dev/93aa0398-4cd1-4a05-956b-50984ea3e98e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          ids: [selectedNotification.id]
        })
      });

      toast.success('Ошибка отмечена как исправленная');
      setIsFixDialogOpen(false);
      setSelectedNotification(null);
      setFixNotes('');
      loadNotifications();
    } catch (error) {
      toast.error('Ошибка при отправке');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" className="animate-spin text-white" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-red-600 to-orange-700 p-3 rounded-xl shadow-lg">
              <Icon name="Bell" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Системные уведомления</h1>
              <p className="text-slate-400">Мониторинг событий и ошибок</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
        </div>

        <NotificationStats stats={stats} />

        <NotificationFilters
          filterType={filterType}
          setFilterType={setFilterType}
          filterRead={filterRead}
          setFilterRead={setFilterRead}
          selectedCount={selectedIds.length}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          onRefresh={loadNotifications}
        />

        <NotificationList
          notifications={notifications}
          selectedIds={selectedIds}
          translatedTexts={translatedTexts}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onOpenFixDialog={openFixDialog}
        />
      </div>

      <Dialog open={isFixDialogOpen} onOpenChange={setIsFixDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Отметить ошибку как исправленную</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Описание ошибки:</label>
              <p className="text-slate-300 bg-slate-900 p-3 rounded">
                {selectedNotification?.title}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Способ исправления:</label>
              <Textarea
                value={fixNotes}
                onChange={(e) => setFixNotes(e.target.value)}
                placeholder="Опишите, как была исправлена ошибка..."
                className="bg-slate-900 border-slate-700 text-white"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFixDialogOpen(false)}
              className="border-slate-700 text-white hover:bg-slate-700"
            >
              Отмена
            </Button>
            <Button
              onClick={handleFixError}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Icon name="Check" size={16} className="mr-2" />
              Отметить исправленной
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemNotificationsPage;
