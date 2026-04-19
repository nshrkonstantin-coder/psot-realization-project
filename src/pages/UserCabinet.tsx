import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import OrganizationLogo from '@/components/OrganizationLogo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { generateObservationPDF } from '@/utils/observationPdfExport';
import { generatePrescriptionPDF } from '@/utils/prescriptionPdfExport';
import { apiFetch } from '@/lib/api';

interface UserStats {
  user_id: number;
  display_name: string;
  fio: string;
  email: string;
  company: string;
  subdivision: string;
  position: string;
  registered_count: number;
  online_count: number;
  offline_count: number;
  pab_total: number;
  pab_completed: number;
  pab_in_progress: number;
  pab_overdue: number;
  observations_issued: number;
  observations_completed: number;
  observations_in_progress: number;
  observations_overdue: number;
  prescriptions_issued: number;
  prescriptions_completed: number;
  prescriptions_in_progress: number;
  prescriptions_overdue: number;
  pc_violations_issued: number;
  pc_violations_completed: number;
  pc_violations_in_progress: number;
  pc_violations_overdue: number;
  audits_conducted: number;
  plan_audits?: number;
  plan_observations?: number;
}

interface OrganizationUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
  company: string;
  email: string;
  last_activity?: string;
}

const UserCabinet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showRegisteredUsers, setShowRegisteredUsers] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<OrganizationUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OrganizationUser[]>([]);
  const [showChatForm, setShowChatForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPabDetails, setShowPabDetails] = useState(false);
  const [showObservationsDetails, setShowObservationsDetails] = useState(false);
  const [showPrescriptionsDetails, setShowPrescriptionsDetails] = useState(false);
  const [showPCViolationsDetails, setShowPCViolationsDetails] = useState(false);
  const [pabList, setPabList] = useState<any[]>([]);
  const [observationsList, setObservationsList] = useState<any[]>([]);
  const [prescriptionsList, setPrescriptionsList] = useState<any[]>([]);
  const [pcViolationsList, setPCViolationsList] = useState<any[]>([]);
  const [selectedPabItem, setSelectedPabItem] = useState<any | null>(null);
  const [selectedObservationItem, setSelectedObservationItem] = useState<any | null>(null);
  const [selectedPrescriptionItem, setSelectedPrescriptionItem] = useState<any | null>(null);
  const [selectedPCViolationItem, setSelectedPCViolationItem] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [userRole, setUserRole] = useState<string>('user');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole') || 'user';
    if (!userId) {
      navigate('/');
      return;
    }
    setUserRole(role);
    loadUserStats();
    checkUnreadMessages();
    
    // Автоматическое обновление статистики каждые 30 секунд
    const statsInterval = setInterval(() => {
      loadUserStats();
    }, 30000);
    
    // Проверка новых сообщений каждые 10 секунд
    const messagesInterval = setInterval(() => {
      checkUnreadMessages();
    }, 10000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(messagesInterval);
    };
  }, [navigate]);

  const loadUserStats = async () => {
    try {
      const userId = localStorage.getItem('userId');
      let url = `https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=user_cabinet&userId=${userId}`;
      
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await apiFetch(url);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        toast({ title: 'Ошибка загрузки данных', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const checkUnreadMessages = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/7ce14ae9-b117-45ff-a64a-52a3f9881389?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        const totalUnread = data.chats.reduce((sum: number, chat: { unreadCount: number }) => sum + chat.unreadCount, 0);
        
        // Показываем уведомление только если количество новых сообщений увеличилось
        if (totalUnread > unreadCount && unreadCount > 0) {
          toast({ 
            title: '📬 Новые сообщения', 
            description: `У вас ${totalUnread} непрочитанных сообщений`,
            duration: 5000
          });
        }
        
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      // Тихо игнорируем ошибки проверки сообщений
    }
  };

  const loadRegisteredUsers = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=registered_users&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setRegisteredUsers(data.users);
        setShowRegisteredUsers(true);
      } else {
        toast({ title: 'Ошибка загрузки списка пользователей', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=online_users&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setOnlineUsers(data.users);
        setShowOnlineUsers(true);
      } else {
        toast({ title: 'Ошибка загрузки онлайн пользователей', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const handleUserClick = (user: OrganizationUser) => {
    setSelectedUser(user);
    setShowRegisteredUsers(false);
    setShowOnlineUsers(false);
    setShowChatForm(true);
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !selectedUser) {
      toast({ title: 'Введите сообщение', variant: 'destructive' });
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('https://functions.poehali.dev/7ce14ae9-b117-45ff-a64a-52a3f9881389', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: userId,
          receiverId: selectedUser.id,
          message: chatMessage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Сообщение отправлено', description: `Сообщение для ${selectedUser.fio} отправлено` });
        setChatMessage('');
        setShowChatForm(false);
        setSelectedUser(null);
        setShowEmojiPicker(false);
      } else {
        toast({ title: 'Ошибка отправки', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const insertEmoji = (emoji: string) => {
    setChatMessage(prev => prev + emoji);
  };

  const commonEmojis = ['😊', '😂', '❤️', '👍', '🔥', '✅', '⚠️', '📌', '💼', '🎯', '👋', '🙏', '💪', '🚀', '⭐', '✨'];

  const loadPabDetails = async (status: string = 'all') => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/d02acf63-6c00-4f42-bcba-abd8da18cec6?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setPabList(data.records || []);
        setFilterStatus(status);
        setShowPabDetails(true);
      } else {
        toast({ title: 'Ошибка загрузки ПАБ', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const loadObservationsDetails = async (status: string = 'all') => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=user_observations&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setObservationsList(data.observations || []);
        setFilterStatus(status);
        setShowObservationsDetails(true);
      } else {
        toast({ title: 'Ошибка загрузки наблюдений', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const loadPrescriptionsDetails = async (status: string = 'all') => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=user_prescriptions&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setPrescriptionsList(data.prescriptions || []);
        setFilterStatus(status);
        setShowPrescriptionsDetails(true);
      } else {
        toast({ title: 'Ошибка загрузки предписаний', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const loadPCViolationsDetails = async (status: string = 'all') => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=user_pc_violations&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setPCViolationsList(data.violations || []);
        setFilterStatus(status);
        setShowPCViolationsDetails(true);
      } else {
        toast({ title: 'Ошибка загрузки нарушений ПК', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const markObservationComplete = async (observationId: number) => {
    try {
      const response = await fetch('https://functions.poehali.dev/5a742ffc-9ee8-4f89-ba42-3be59b2024f1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation_id: observationId, new_status: 'Завершено' })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: '✅ Наблюдение отмечено выполненным!' });
        loadObservationsDetails(filterStatus);
        loadUserStats();
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    }
  };

  const markPrescriptionComplete = async (violationId: number) => {
    try {
      const response = await fetch('https://functions.poehali.dev/6f1f804e-73b7-46e2-8087-e2e2e7b47f58', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violation_id: violationId, new_status: 'Выполнено' })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: '✅ Предписание отмечено устраненным!' });
        loadPrescriptionsDetails(filterStatus);
        loadUserStats();
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const getFilteredPabList = () => {
    if (filterStatus === 'all') return pabList;
    if (filterStatus === 'completed') return pabList.filter(p => p.status === 'Завершено');
    if (filterStatus === 'in_progress') return pabList.filter(p => p.status === 'В работе' || p.status === 'Новый');
    if (filterStatus === 'overdue') {
      return pabList.filter(p => {
        if (p.status === 'Завершено') return false;
        if (!p.created_at) return false;
        const created = new Date(p.created_at);
        const daysPassed = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        return daysPassed > 30;
      });
    }
    return pabList;
  };

  const getFilteredObservationsList = () => {
    if (filterStatus === 'all') return observationsList;
    if (filterStatus === 'completed') return observationsList.filter(o => o.status === 'Завершено');
    if (filterStatus === 'in_progress') return observationsList.filter(o => o.status === 'В работе' || o.status === 'Новый');
    if (filterStatus === 'overdue') {
      return observationsList.filter(o => {
        if (o.status === 'Завершено') return false;
        if (!o.deadline) return false;
        return new Date(o.deadline) < new Date();
      });
    }
    return observationsList;
  };

  const getFilteredPrescriptionsList = () => {
    if (filterStatus === 'all') return prescriptionsList;
    if (filterStatus === 'completed') return prescriptionsList.filter(p => p.status === 'Выполнено');
    if (filterStatus === 'in_progress') return prescriptionsList.filter(p => p.status === 'В работе' || p.status === 'Новый');
    if (filterStatus === 'overdue') {
      return prescriptionsList.filter(p => {
        if (p.status === 'Выполнено') return false;
        if (!p.deadline) return false;
        return new Date(p.deadline) < new Date();
      });
    }
    return prescriptionsList;
  };

  const getFilteredPCViolationsList = () => {
    if (filterStatus === 'all') return pcViolationsList;
    if (filterStatus === 'completed') return pcViolationsList.filter(v => v.status === 'completed');
    if (filterStatus === 'in_progress') return pcViolationsList.filter(v => v.status === 'in_progress' || v.status === 'new');
    if (filterStatus === 'overdue') {
      return pcViolationsList.filter(v => {
        if (v.status === 'completed') return false;
        if (!v.deadline) return false;
        return new Date(v.deadline) < new Date();
      });
    }
    return pcViolationsList;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-red-600/30 p-8">
          <p className="text-red-500 text-lg">Данные не найдены</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={false} />
            <div>
              <h1 className="text-3xl font-bold text-white">Личный кабинет</h1>
              {stats.company && (
                <p className="text-blue-400 font-semibold text-lg">{stats.company}</p>
              )}
              <p className="text-slate-400">{stats.fio}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/chat-history')}
              variant="outline"
              className="border-blue-600/50 text-blue-500 hover:bg-blue-600/10 relative"
            >
              <Icon name="MessageSquare" size={20} className="mr-2" />
              Сообщения
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              На главную
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-600/50 text-red-500 hover:bg-red-600/10"
            >
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>

        {/* Period Filter */}
        <Card className="bg-slate-800/50 border-blue-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="Calendar" size={24} className="text-blue-500" />
            Выбор периода
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-slate-400 mb-2 block">Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-slate-400 mb-2 block">Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button
              onClick={() => {
                if (startDate && endDate) {
                  loadUserStats();
                  toast({ title: 'Данные обновлены', description: `Показаны данные с ${startDate} по ${endDate}` });
                } else {
                  toast({ title: 'Выберите период', description: 'Укажите обе даты для фильтрации', variant: 'destructive' });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Icon name="Filter" size={20} className="mr-2" />
              Применить
            </Button>
            <Button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                loadUserStats();
                toast({ title: 'Фильтр сброшен', description: 'Показаны все данные' });
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Icon name="X" size={20} className="mr-2" />
              Сбросить
            </Button>
          </div>
        </Card>

        {/* User Info Card */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="IdCard" size={24} className="text-yellow-500" />
            Информация о пользователе
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-400">ID</p>
              <p className="text-lg text-white font-semibold">{stats.display_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-lg text-white">{stats.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Компания</p>
              <p className="text-lg text-white">{stats.company}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Подразделение</p>
              <p className="text-lg text-white">{stats.subdivision}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Должность</p>
              <p className="text-lg text-white">{stats.position}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Проведено аудитов</p>
              <p className="text-lg text-white font-semibold">{stats.audits_conducted}</p>
            </div>
          </div>
        </Card>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card 
            className="bg-slate-800/50 border-yellow-600/30 p-6 cursor-pointer hover:bg-slate-700/50 transition-colors"
            onClick={loadRegisteredUsers}
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl">
                <Icon name="CheckCircle" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Прошедшие регистрацию</p>
                <p className="text-3xl font-bold text-green-500">{stats.registered_count}</p>
              </div>
            </div>
          </Card>

          <Card 
            className="bg-slate-800/50 border-yellow-600/30 p-6 cursor-pointer hover:bg-slate-700/50 transition-colors"
            onClick={loadOnlineUsers}
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl">
                <Icon name="Wifi" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Онлайн активность</p>
                <p className="text-3xl font-bold text-blue-500">{stats.online_count}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-4 rounded-xl">
                <Icon name="WifiOff" size={32} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Офлайн активность</p>
                <p className="text-3xl font-bold text-slate-400">{stats.offline_count}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Personal PAB Indicators */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="FileText" size={24} className="text-yellow-500" />
            Мои личные показатели ПАБ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600/30">
              <p className="text-sm text-slate-400 mb-1">План Аудиты</p>
              <p className="text-2xl font-bold text-blue-500">
                {stats.plan_audits !== null && stats.plan_audits !== undefined ? stats.plan_audits : '—'}
              </p>
              {(stats.plan_audits === null || stats.plan_audits === undefined) && (
                <p className="text-xs text-slate-500 mt-1">Должность не найдена в таблице</p>
              )}
            </div>

            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600/30">
              <p className="text-sm text-slate-400 mb-1">План Наблюдения</p>
              <p className="text-2xl font-bold text-blue-500">
                {stats.plan_observations !== null && stats.plan_observations !== undefined ? stats.plan_observations : '—'}
              </p>
              {(stats.plan_observations === null || stats.plan_observations === undefined) && (
                <p className="text-xs text-slate-500 mt-1">Должность не найдена в таблице</p>
              )}
            </div>

            <div 
              className="bg-green-900/20 p-4 rounded-lg border border-green-600/30 cursor-pointer hover:bg-green-900/30 transition-colors min-h-[120px] flex flex-col"
              onClick={() => loadPabDetails('all')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Факт Аудиты
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-green-500">{stats.pab_total || 0}</p>
              {stats.plan_audits !== null && stats.plan_audits !== undefined && stats.plan_audits > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>План: {stats.plan_audits}</span>
                    <span className={`font-semibold ${
                      ((stats.pab_total || 0) / stats.plan_audits * 100) >= 100 ? 'text-green-400' :
                      ((stats.pab_total || 0) / stats.plan_audits * 100) >= 80 ? 'text-yellow-400' :
                      'text-orange-400'
                    }`}>
                      {Math.round((stats.pab_total || 0) / stats.plan_audits * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        ((stats.pab_total || 0) / stats.plan_audits * 100) >= 100 ? 'bg-green-500' :
                        ((stats.pab_total || 0) / stats.plan_audits * 100) >= 80 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(((stats.pab_total || 0) / stats.plan_audits * 100), 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div 
              className="bg-green-900/20 p-4 rounded-lg border border-green-600/30 cursor-pointer hover:bg-green-900/30 transition-colors min-h-[120px] flex flex-col"
              onClick={() => loadObservationsDetails('all')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Факт Наблюдения
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-green-500">{stats.observations_issued || 0}</p>
              {stats.plan_observations !== null && stats.plan_observations !== undefined && stats.plan_observations > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>План: {stats.plan_observations}</span>
                    <span className={`font-semibold ${
                      ((stats.observations_issued || 0) / stats.plan_observations * 100) >= 100 ? 'text-green-400' :
                      ((stats.observations_issued || 0) / stats.plan_observations * 100) >= 80 ? 'text-yellow-400' :
                      'text-orange-400'
                    }`}>
                      {Math.round((stats.observations_issued || 0) / stats.plan_observations * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        ((stats.observations_issued || 0) / stats.plan_observations * 100) >= 100 ? 'bg-green-500' :
                        ((stats.observations_issued || 0) / stats.plan_observations * 100) >= 80 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(((stats.observations_issued || 0) / stats.plan_observations * 100), 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* My Observations (Assigned to Me) */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="Eye" size={24} className="text-yellow-500" />
            Мне выписаны наблюдения (ПАБ)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div 
              className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors"
              onClick={() => loadObservationsDetails('all')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Выписано наблюдений
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-white">{stats.observations_issued}</p>
            </div>
            <div 
              className="bg-green-900/20 p-4 rounded-lg border border-green-600/30 cursor-pointer hover:bg-green-900/30 transition-colors"
              onClick={() => loadObservationsDetails('completed')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Устранено наблюдений
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-green-500">{stats.observations_completed}</p>
            </div>
            <div 
              className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30 cursor-pointer hover:bg-yellow-900/30 transition-colors"
              onClick={() => loadObservationsDetails('in_progress')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                В работе наблюдений
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-yellow-500">{stats.observations_in_progress}</p>
            </div>
            <div 
              className="bg-red-900/20 p-4 rounded-lg border border-red-600/30 cursor-pointer hover:bg-red-900/30 transition-colors"
              onClick={() => loadObservationsDetails('overdue')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Просроченные наблюдения
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-red-500">{stats.observations_overdue}</p>
            </div>
          </div>
        </Card>

        {/* 
          Prescriptions from Production Control (Assigned to Me)
          Data source: production_prescription_violations table
          - All: total count of prescriptions assigned to user
          - Completed: status = 'completed'
          - In Progress: status = 'in_work' AND deadline >= today
          - Overdue: deadline < today AND status != 'completed'
        */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="ClipboardList" size={24} className="text-yellow-500" />
            Предписания ПК выданные мне
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div 
              className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors"
              onClick={() => loadPrescriptionsDetails('all')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Всего выписано предписаний ПК
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-white">{stats.prescriptions_issued}</p>
            </div>
            <div 
              className="bg-green-900/20 p-4 rounded-lg border border-green-600/30 cursor-pointer hover:bg-green-900/30 transition-colors"
              onClick={() => loadPrescriptionsDetails('completed')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Устранено предписаний ПК
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-green-500">{stats.prescriptions_completed}</p>
            </div>
            <div 
              className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30 cursor-pointer hover:bg-yellow-900/30 transition-colors"
              onClick={() => loadPrescriptionsDetails('in_progress')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Предписаний ПК в работе
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-yellow-500">{stats.prescriptions_in_progress}</p>
            </div>
            <div 
              className="bg-red-900/20 p-4 rounded-lg border border-red-600/30 cursor-pointer hover:bg-red-900/30 transition-colors"
              onClick={() => loadPrescriptionsDetails('overdue')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Просроченные предписания ПК
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-red-500">{stats.prescriptions_overdue}</p>
            </div>
          </div>
        </Card>

        {/* 
          PC Violations (Production Control Violations Assigned to Me)
          Data source: production_control_violations table
          - All: total count where responsible_user_id matches user
          - Completed: status = 'completed'
          - In Progress: status IN ('in_progress', 'new')
          - Overdue: deadline < today AND status != 'completed'
        */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="AlertTriangle" size={24} className="text-yellow-500" />
            Нарушения ПК
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div 
              className="bg-slate-700/50 p-4 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors"
              onClick={() => loadPCViolationsDetails('all')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Всего выдано нарушений
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-white">{stats.pc_violations_issued}</p>
            </div>
            <div 
              className="bg-green-900/20 p-4 rounded-lg border border-green-600/30 cursor-pointer hover:bg-green-900/30 transition-colors"
              onClick={() => loadPCViolationsDetails('completed')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Устранено нарушений
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-green-500">{stats.pc_violations_completed}</p>
            </div>
            <div 
              className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30 cursor-pointer hover:bg-yellow-900/30 transition-colors"
              onClick={() => loadPCViolationsDetails('in_progress')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Нарушений в работе
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pc_violations_in_progress}</p>
            </div>
            <div 
              className="bg-red-900/20 p-4 rounded-lg border border-red-600/30 cursor-pointer hover:bg-red-900/30 transition-colors"
              onClick={() => loadPCViolationsDetails('overdue')}
            >
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                Просроченных нарушений
                <Icon name="MousePointerClick" size={16} className="text-slate-500" />
              </p>
              <p className="text-2xl font-bold text-red-500">{stats.pc_violations_overdue}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Registered Users Dialog */}
      <Dialog open={showRegisteredUsers} onOpenChange={setShowRegisteredUsers}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500">Зарегистрированные пользователи</DialogTitle>
            <DialogDescription className="text-slate-400">
              Список пользователей предприятия АО "ГРК "Западная"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {registeredUsers.map((user) => (
              <Card
                key={user.id}
                className="bg-slate-700/50 border-slate-600/50 p-4 cursor-pointer hover:bg-slate-600/50 transition-colors"
                onClick={() => handleUserClick(user)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{user.fio}</h3>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p><strong>Должность:</strong> {user.position}</p>
                      <p><strong>Подразделение:</strong> {user.subdivision}</p>
                      <p><strong>Предприятие:</strong> {user.company}</p>
                    </div>
                  </div>
                  <Icon name="MessageCircle" size={24} className="text-blue-500 flex-shrink-0 ml-4" />
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Online Users Dialog */}
      <Dialog open={showOnlineUsers} onOpenChange={setShowOnlineUsers}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-blue-500 flex items-center gap-2">
              <Icon name="Wifi" size={28} />
              Онлайн пользователи
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Пользователи онлайн из АО "ГРК "Западная"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {onlineUsers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Нет пользователей онлайн</p>
            ) : (
              onlineUsers.map((user) => (
                <Card
                  key={user.id}
                  className="bg-slate-700/50 border-blue-600/50 p-4 cursor-pointer hover:bg-slate-600/50 transition-colors"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="text-lg font-semibold text-white">{user.fio}</h3>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1">
                        <p><strong>Должность:</strong> {user.position}</p>
                        <p><strong>Подразделение:</strong> {user.subdivision}</p>
                        <p><strong>Предприятие:</strong> {user.company}</p>
                      </div>
                    </div>
                    <Icon name="MessageCircle" size={24} className="text-blue-500 flex-shrink-0 ml-4" />
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Form Dialog */}
      <Dialog open={showChatForm} onOpenChange={setShowChatForm}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
              <Icon name="MessageSquare" size={28} />
              Отправить сообщение
            </DialogTitle>
            {selectedUser && (
              <DialogDescription className="text-slate-300 text-base">
                Получатель: <strong>{selectedUser.fio}</strong>
                <br />
                {selectedUser.position} • {selectedUser.subdivision}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Сообщение</label>
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Введите ваше сообщение..."
                className="bg-slate-700 border-slate-600 text-white min-h-[150px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">Добавить эмоджи</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-yellow-500 hover:text-yellow-400"
                >
                  {showEmojiPicker ? 'Скрыть' : 'Показать'} эмоджи
                </Button>
              </div>
              
              {showEmojiPicker && (
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <div className="flex flex-wrap gap-2">
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-2xl hover:scale-125 transition-transform bg-slate-600/50 w-12 h-12 rounded-lg flex items-center justify-center hover:bg-slate-500/50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSendChat}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex-1"
              >
                <Icon name="Send" size={20} className="mr-2" />
                Отправить
              </Button>
              <Button
                onClick={() => {
                  setShowChatForm(false);
                  setChatMessage('');
                  setSelectedUser(null);
                  setShowEmojiPicker(false);
                }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ПАБ Details Dialog */}
      <Dialog open={showPabDetails} onOpenChange={setShowPabDetails}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
              <Icon name="FileText" size={28} />
              Факт Аудиты - {
                filterStatus === 'all' ? 'Все' :
                filterStatus === 'completed' ? 'Завершено' :
                filterStatus === 'in_progress' ? 'В работе' :
                filterStatus === 'overdue' ? 'Просроченные' : ''
              }
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              ПАБ аудиты, где Вы указаны как Проверяющий
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {getFilteredPabList().length === 0 ? (
              <p className="text-slate-400 text-center py-8">Нет записей ПАБ в этой категории</p>
            ) : (
              getFilteredPabList().map((pab) => (
                <Card
                  key={pab.id}
                  className="bg-slate-700/50 border-slate-600/50 p-4 hover:bg-slate-600/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/pab-view/${pab.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">ПАБ №{pab.doc_number}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          pab.status === 'Завершено' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                          pab.status === 'В работе' || pab.status === 'Новый' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                          'bg-red-900/30 text-red-400 border border-red-600/50'
                        }`}>
                          {pab.status}
                        </span>
                        <Icon name="MousePointerClick" size={18} className="text-slate-500 ml-auto" />
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><strong>Дата:</strong> {new Date(pab.doc_date).toLocaleDateString('ru-RU')}</p>
                        <p><strong>Инспектор:</strong> {pab.inspector_fio}</p>
                        <p><strong>Объект проверки:</strong> {pab.checked_object}</p>
                        <p><strong>Место:</strong> {pab.location}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pab.word_file_url && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(pab.word_file_url, '_blank');
                          }}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Icon name="Download" size={16} className="mr-1" />
                          Word
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Observations Details Dialog */}
      <Dialog open={showObservationsDetails} onOpenChange={setShowObservationsDetails}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
              <Icon name="Eye" size={28} />
              Факт Наблюдения - {
                filterStatus === 'all' ? 'Все' :
                filterStatus === 'completed' ? 'Устранено' :
                filterStatus === 'in_progress' ? 'В работе' :
                filterStatus === 'overdue' ? 'Просроченные' : ''
              }
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Наблюдения из Ваших ПАБ аудитов (где Вы — Проверяющий)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {getFilteredObservationsList().length === 0 ? (
              <p className="text-slate-400 text-center py-8">Нет наблюдений в этой категории</p>
            ) : (
              getFilteredObservationsList().map((obs) => (
                <Card
                  key={obs.id}
                  className="bg-slate-700/50 border-slate-600/50 p-4 hover:bg-slate-600/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedObservationItem(obs);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">Наблюдение №{obs.observation_number}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          obs.status === 'Завершено' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                          obs.status === 'В работе' || obs.status === 'Новый' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                          'bg-red-900/30 text-red-400 border border-red-600/50'
                        }`}>
                          {obs.status}
                        </span>
                        {obs.status === 'Завершено' && (
                          <Icon name="Sparkles" size={20} className="text-purple-400 animate-pulse" />
                        )}
                        <Icon name="MousePointerClick" size={18} className="text-slate-500 ml-auto" />
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><strong>Описание:</strong> {obs.description}</p>
                        <p><strong>Категория:</strong> {obs.category}</p>
                        <p><strong>Срок устранения:</strong> {obs.deadline ? new Date(obs.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</p>
                        <p><strong>Ответственный:</strong> {obs.responsible_person}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        onClick={() => generateObservationPDF([obs])}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Icon name="Printer" size={16} className="mr-1" />
                        Распечатать
                      </Button>
                      {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin') && obs.status !== 'Завершено' && (
                        <Button
                          onClick={() => markObservationComplete(obs.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Icon name="CheckCircle" size={16} className="mr-1" />
                          Устранено
                        </Button>
                      )}
                      {obs.photo_url && (
                        <Button
                          onClick={() => window.open(obs.photo_url, '_blank')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Icon name="Image" size={16} className="mr-1" />
                          Фото
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PC Violations Details Dialog */}
      <Dialog open={showPCViolationsDetails} onOpenChange={setShowPCViolationsDetails}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
              <Icon name="AlertTriangle" size={28} />
              Нарушения ПК - {
                filterStatus === 'all' ? 'Все' :
                filterStatus === 'completed' ? 'Устранено' :
                filterStatus === 'in_progress' ? 'В работе' :
                filterStatus === 'overdue' ? 'Просроченные' : ''
              }
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Нажмите на нарушение для открытия полной информации
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {getFilteredPCViolationsList().length === 0 ? (
              <p className="text-slate-400 text-center py-8">Нет нарушений в этой категории</p>
            ) : (
              getFilteredPCViolationsList().map((violation) => (
                <Card
                  key={violation.id}
                  className="bg-slate-700/50 border-slate-600/50 p-4 hover:bg-slate-600/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedPCViolationItem(violation);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">Нарушение №{violation.item_number} ({violation.doc_number})</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          violation.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                          violation.status === 'in_progress' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                          'bg-slate-900/30 text-slate-400 border border-slate-600/50'
                        }`}>
                          {violation.status === 'completed' ? 'Устранено' : violation.status === 'in_progress' ? 'В работе' : 'Новое'}
                        </span>
                        {violation.status === 'completed' && (
                          <Icon name="Sparkles" size={20} className="text-purple-400 animate-pulse" />
                        )}
                        <Icon name="MousePointerClick" size={18} className="text-slate-500 ml-auto" />
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><strong>Описание:</strong> {violation.description}</p>
                        <p><strong>Меры устранения:</strong> {violation.measures}</p>
                        <p><strong>Срок устранения:</strong> {violation.deadline ? new Date(violation.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</p>
                        <p><strong>Проверяющий:</strong> {violation.issuer_name}</p>
                        <p><strong>Дата проверки:</strong> {violation.doc_date ? new Date(violation.doc_date).toLocaleDateString('ru-RU') : 'Не указана'}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescriptions Details Dialog */}
      <Dialog open={showPrescriptionsDetails} onOpenChange={setShowPrescriptionsDetails}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
              <Icon name="ClipboardList" size={28} />
              Предписания - {
                filterStatus === 'all' ? 'Все' :
                filterStatus === 'completed' ? 'Устранено' :
                filterStatus === 'in_progress' ? 'В работе' :
                filterStatus === 'overdue' ? 'Просроченные' : ''
              }
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Нажмите на предписание для открытия полной информации
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {getFilteredPrescriptionsList().length === 0 ? (
              <p className="text-slate-400 text-center py-8">Нет предписаний в этой категории</p>
            ) : (
              getFilteredPrescriptionsList().map((presc) => (
                <Card
                  key={presc.id}
                  className="bg-slate-700/50 border-slate-600/50 p-4 hover:bg-slate-600/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedPrescriptionItem(presc);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">Предписание №{presc.prescription_id}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          presc.status === 'Выполнено' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                          presc.status === 'В работе' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                          'bg-red-900/30 text-red-400 border border-red-600/50'
                        }`}>
                          {presc.status}
                        </span>
                        {presc.status === 'Выполнено' && (
                          <Icon name="Sparkles" size={20} className="text-purple-400 animate-pulse" />
                        )}
                        <Icon name="MousePointerClick" size={18} className="text-slate-500 ml-auto" />
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><strong>Нарушение:</strong> {presc.violation_text}</p>
                        <p><strong>Срок устранения:</strong> {presc.deadline ? new Date(presc.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</p>
                        <p><strong>Ответственный:</strong> {presc.assigned_user_fio}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        onClick={() => generatePrescriptionPDF([presc])}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Icon name="Printer" size={16} className="mr-1" />
                        Распечатать
                      </Button>
                      {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin') && presc.status !== 'Выполнено' && (
                        <Button
                          onClick={() => markPrescriptionComplete(presc.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Icon name="CheckCircle" size={16} className="mr-1" />
                          Устранено
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected PC Violation Details */}
      {selectedPCViolationItem && (
        <Dialog open={!!selectedPCViolationItem} onOpenChange={() => setSelectedPCViolationItem(null)}>
          <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
                <Icon name="AlertTriangle" size={28} />
                Нарушение ПК №{selectedPCViolationItem.item_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Статус</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedPCViolationItem.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                    selectedPCViolationItem.status === 'in_progress' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                    'bg-slate-900/30 text-slate-400 border border-slate-600/50'
                  }`}>
                    {selectedPCViolationItem.status === 'completed' ? 'Устранено' : selectedPCViolationItem.status === 'in_progress' ? 'В работе' : 'Новое'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Документ</p>
                  <p className="text-white">{selectedPCViolationItem.doc_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Дата проверки</p>
                  <p className="text-white">{selectedPCViolationItem.doc_date ? new Date(selectedPCViolationItem.doc_date).toLocaleDateString('ru-RU') : 'Не указана'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Срок устранения</p>
                  <p className="text-white">{selectedPCViolationItem.deadline ? new Date(selectedPCViolationItem.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-400 mb-1">Проверяющий</p>
                  <p className="text-white">{selectedPCViolationItem.issuer_name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Описание нарушения</p>
                <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedPCViolationItem.description}</p>
              </div>
              {selectedPCViolationItem.measures && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Меры устранения</p>
                  <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedPCViolationItem.measures}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setSelectedPCViolationItem(null);
                    setShowPCViolationsDetails(false);
                    navigate('/pc-list');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Icon name="ExternalLink" size={20} className="mr-2" />
                  Открыть
                </Button>
                <Button
                  onClick={() => setSelectedPCViolationItem(null)}
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Selected Observation Details */}
      {selectedObservationItem && (
        <Dialog open={!!selectedObservationItem} onOpenChange={() => setSelectedObservationItem(null)}>
          <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
                <Icon name="Eye" size={28} />
                Наблюдение №{selectedObservationItem.observation_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Статус</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedObservationItem.status === 'Завершено' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                    selectedObservationItem.status === 'В работе' || selectedObservationItem.status === 'Новый' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                    'bg-red-900/30 text-red-400 border border-red-600/50'
                  }`}>
                    {selectedObservationItem.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Категория</p>
                  <p className="text-white">{selectedObservationItem.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Срок устранения</p>
                  <p className="text-white">{selectedObservationItem.deadline ? new Date(selectedObservationItem.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Ответственный</p>
                  <p className="text-white">{selectedObservationItem.responsible_person}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Описание</p>
                <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedObservationItem.description}</p>
              </div>
              {selectedObservationItem.conditions_actions && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Условия/Действия</p>
                  <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedObservationItem.conditions_actions}</p>
                </div>
              )}
              {selectedObservationItem.hazard_factors && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Опасные факторы</p>
                  <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedObservationItem.hazard_factors}</p>
                </div>
              )}
              {selectedObservationItem.measures && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Меры</p>
                  <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedObservationItem.measures}</p>
                </div>
              )}
              {selectedObservationItem.photo_url && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Фотография</p>
                  <img 
                    src={selectedObservationItem.photo_url} 
                    alt="Фото наблюдения" 
                    className="w-full max-w-2xl rounded-lg border border-slate-600"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => generateObservationPDF([selectedObservationItem])}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Icon name="Printer" size={20} className="mr-2" />
                  Распечатать
                </Button>
                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin') && selectedObservationItem.status !== 'Завершено' && (
                  <Button
                    onClick={() => {
                      markObservationComplete(selectedObservationItem.id);
                      setSelectedObservationItem(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Icon name="CheckCircle" size={20} className="mr-2" />
                    Отметить устраненным
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedObservationItem(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Selected Prescription Details */}
      {selectedPrescriptionItem && (
        <Dialog open={!!selectedPrescriptionItem} onOpenChange={() => setSelectedPrescriptionItem(null)}>
          <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
                <Icon name="ClipboardList" size={28} />
                Предписание №{selectedPrescriptionItem.prescription_id}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Статус</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedPrescriptionItem.status === 'Выполнено' ? 'bg-green-900/30 text-green-400 border border-green-600/50' :
                    selectedPrescriptionItem.status === 'В работе' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50' :
                    'bg-red-900/30 text-red-400 border border-red-600/50'
                  }`}>
                    {selectedPrescriptionItem.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Ответственный</p>
                  <p className="text-white">{selectedPrescriptionItem.assigned_user_fio}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Срок устранения</p>
                  <p className="text-white">{selectedPrescriptionItem.deadline ? new Date(selectedPrescriptionItem.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</p>
                </div>
                {selectedPrescriptionItem.completed_at && (
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Дата выполнения</p>
                    <p className="text-white">{new Date(selectedPrescriptionItem.completed_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Текст нарушения</p>
                <p className="text-white bg-slate-700/50 p-3 rounded-lg">{selectedPrescriptionItem.violation_text}</p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => generatePrescriptionPDF([selectedPrescriptionItem])}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Icon name="Printer" size={20} className="mr-2" />
                  Распечатать
                </Button>
                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'miniadmin') && selectedPrescriptionItem.status !== 'Выполнено' && (
                  <Button
                    onClick={() => {
                      markPrescriptionComplete(selectedPrescriptionItem.id);
                      setSelectedPrescriptionItem(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Icon name="CheckCircle" size={20} className="mr-2" />
                    Отметить устраненным
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setSelectedPrescriptionItem(null);
                    setShowPrescriptionsDetails(false);
                    navigate('/pc-list');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Icon name="ExternalLink" size={20} className="mr-2" />
                  Открыть
                </Button>
                <Button
                  onClick={() => setSelectedPrescriptionItem(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserCabinet;