import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

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

interface NotificationListProps {
  notifications: Notification[];
  selectedIds: number[];
  translatedTexts: Map<number, { title: string; message: string; errorDetails?: string }>;
  onSelectAll: () => void;
  onSelectOne: (id: number) => void;
  onOpenFixDialog: (notification: Notification) => void;
}

export default function NotificationList({
  notifications,
  selectedIds,
  translatedTexts,
  onSelectAll,
  onSelectOne,
  onOpenFixDialog
}: NotificationListProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return 'AlertCircle';
      case 'warning': return 'AlertTriangle';
      case 'success': return 'CheckCircle';
      default: return 'Info';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'success': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: any = {
      low: 'bg-slate-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500'
    };
    return colors[severity] || 'bg-slate-500';
  };

  if (notifications.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700 p-12 text-center">
        <Icon name="Inbox" size={48} className="mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400">Нет уведомлений</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <Checkbox
          checked={selectedIds.length === notifications.length && notifications.length > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-slate-400 text-sm">Выбрать все</span>
      </div>

      {notifications.map((notif) => {
        const translated = translatedTexts.get(notif.id);
        const displayTitle = translated?.title || notif.title;
        const displayMessage = translated?.message || notif.message;
        const displayError = translated?.errorDetails || notif.errorDetails;

        return (
          <Card
            key={notif.id}
            className={`bg-slate-800 border-slate-700 p-4 ${
              !notif.isRead ? 'border-l-4 border-l-yellow-500' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selectedIds.includes(notif.id)}
                onCheckedChange={() => onSelectOne(notif.id)}
              />

              <div className={`p-3 rounded-lg ${getTypeColor(notif.type)}`}>
                <Icon name={getTypeIcon(notif.type)} size={24} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-semibold">{displayTitle}</h3>
                  <Badge className={getSeverityBadge(notif.severity)}>
                    {notif.severity}
                  </Badge>
                  {!notif.isRead && (
                    <Badge className="bg-yellow-500">Новое</Badge>
                  )}
                </div>

                <p className="text-slate-300 mb-3">{displayMessage}</p>

                {displayError && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-3">
                    <p className="text-red-300 text-sm font-mono">{displayError}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                  {notif.pageName && (
                    <div>
                      <span className="text-slate-500">Страница:</span> {notif.pageName}
                    </div>
                  )}
                  {notif.userFio && (
                    <div>
                      <span className="text-slate-500">Пользователь:</span> {notif.userFio}
                    </div>
                  )}
                  {notif.organizationName && (
                    <div>
                      <span className="text-slate-500">Организация:</span> {notif.organizationName}
                    </div>
                  )}
                  {notif.actionType && (
                    <div>
                      <span className="text-slate-500">Действие:</span> {notif.actionType}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                  <span className="text-slate-500 text-xs">
                    {new Date(notif.createdAt).toLocaleString('ru-RU')}
                  </span>
                  {notif.type === 'error' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-900/20 border-green-500/50 text-green-400 hover:bg-green-900/30"
                      onClick={() => onOpenFixDialog(notif)}
                    >
                      <Icon name="Wrench" size={14} className="mr-1" />
                      Исправить
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
