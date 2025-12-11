import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

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
      setNotifications(data.notifications || []);
      setStats(data.stats || { total: 0, unread: 0, errors: 0, warnings: 0 });
    } catch (error) {
      toast.error('Не удалось загрузить уведомления');
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-red-600 to-orange-600 p-3 rounded-xl shadow-lg">
                <Icon name="Bell" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Системные уведомления</h1>
                <p className="text-slate-400">Мониторинг событий и ошибок</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-blue-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Всего</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Icon name="Bell" size={32} className="text-blue-400" />
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-yellow-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Непрочитанные</p>
                <p className="text-2xl font-bold text-white">{stats.unread}</p>
              </div>
              <Icon name="BellRing" size={32} className="text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-red-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ошибки</p>
                <p className="text-2xl font-bold text-white">{stats.errors}</p>
              </div>
              <Icon name="AlertCircle" size={32} className="text-red-400" />
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-orange-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Предупреждения</p>
                <p className="text-2xl font-bold text-white">{stats.warnings}</p>
              </div>
              <Icon name="AlertTriangle" size={32} className="text-orange-400" />
            </div>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.length === notifications.length && notifications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-white text-sm">Выбрать все</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                Все
              </Button>
              <Button
                variant={filterType === 'error' ? 'default' : 'outline'}
                onClick={() => setFilterType('error')}
                size="sm"
              >
                Ошибки
              </Button>
              <Button
                variant={filterType === 'warning' ? 'default' : 'outline'}
                onClick={() => setFilterType('warning')}
                size="sm"
              >
                Предупреждения
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterRead === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterRead('all')}
                size="sm"
              >
                Все
              </Button>
              <Button
                variant={filterRead === 'false' ? 'default' : 'outline'}
                onClick={() => setFilterRead('false')}
                size="sm"
              >
                Непрочитанные
              </Button>
            </div>

            <div className="flex-1" />

            {selectedIds.length > 0 && (
              <>
                <Button
                  onClick={handleMarkRead}
                  variant="outline"
                  className="border-green-600/50 text-green-500 hover:bg-green-600/10"
                  size="sm"
                >
                  <Icon name="Check" size={16} className="mr-2" />
                  Прочитано ({selectedIds.length})
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="border-red-600/50 text-red-500 hover:bg-red-600/10"
                  size="sm"
                >
                  <Icon name="Trash2" size={16} className="mr-2" />
                  Удалить ({selectedIds.length})
                </Button>
              </>
            )}

            <Button
              onClick={loadNotifications}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
              size="sm"
            >
              <Icon name="RefreshCw" size={16} />
            </Button>
          </div>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="bg-slate-800/50 border-yellow-600/30 p-12 text-center">
            <Icon name="Bell" size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Уведомлений нет</h3>
            <p className="text-slate-400">Все системные события будут отображаться здесь</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`bg-slate-800/50 border transition-all ${
                  notification.isRead ? 'border-slate-600/30' : 'border-yellow-600/50'
                } ${selectedIds.includes(notification.id) ? 'ring-2 ring-yellow-500' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedIds.includes(notification.id)}
                      onCheckedChange={() => handleSelectOne(notification.id)}
                    />

                    <div className={`p-3 rounded-lg ${getTypeColor(notification.type)}`}>
                      <Icon name={getTypeIcon(notification.type)} size={24} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-white">{notification.title}</h3>
                          <Badge className={`${getSeverityBadge(notification.severity)} text-white text-xs`}>
                            {notification.severity}
                          </Badge>
                          {!notification.isRead && (
                            <Badge className="bg-yellow-500 text-black text-xs">Новое</Badge>
                          )}
                        </div>
                        <span className="text-sm text-slate-400 whitespace-nowrap ml-2">
                          {new Date(notification.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>

                      <p className="text-slate-300 mb-3">{notification.message}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {notification.userFio && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Icon name="User" size={16} />
                            <span>{notification.userFio} (ID: {notification.userId})</span>
                          </div>
                        )}
                        {notification.userPosition && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Icon name="Briefcase" size={16} />
                            <span>{notification.userPosition}</span>
                          </div>
                        )}
                        {notification.organizationName && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Icon name="Building2" size={16} />
                            <span>{notification.organizationName} (ID: {notification.organizationId})</span>
                          </div>
                        )}
                        {notification.pageName && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Icon name="FileText" size={16} />
                            <span>{notification.pageName}</span>
                          </div>
                        )}
                        {notification.actionType && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Icon name="Activity" size={16} />
                            <span>{notification.actionType}</span>
                          </div>
                        )}
                      </div>

                      {notification.errorDetails && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-red-400 hover:text-red-300 text-sm">
                            Детали ошибки
                          </summary>
                          <pre className="mt-2 p-3 bg-slate-900/50 rounded text-xs text-red-300 overflow-x-auto">
                            {notification.errorDetails}
                          </pre>
                        </details>
                      )}

                      {notification.pageUrl && (
                        <div className="mt-3">
                          <a
                            href={notification.pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                          >
                            <Icon name="ExternalLink" size={14} />
                            Перейти на страницу
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemNotificationsPage;
