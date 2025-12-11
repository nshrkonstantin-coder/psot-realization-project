import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  audits_conducted: number;
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

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadUserStats();
    
    // Автоматическое обновление каждые 30 секунд
    const interval = setInterval(() => {
      loadUserStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const loadUserStats = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=user_cabinet&userId=${userId}`);
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

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
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
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
              <Icon name="User" size={32} className="text-white" />
            </div>
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
              className="border-blue-600/50 text-blue-500 hover:bg-blue-600/10"
            >
              <Icon name="MessageSquare" size={20} className="mr-2" />
              Сообщения
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

        {/* ПАБ Statistics */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="FileText" size={24} className="text-yellow-500" />
            Статистика ПАБ (Поведенческий Аудит Безопасности)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Всего ПАБов</p>
              <p className="text-2xl font-bold text-white">{stats.pab_total}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600/30">
              <p className="text-sm text-slate-400 mb-1">Завершено</p>
              <p className="text-2xl font-bold text-green-500">{stats.pab_completed}</p>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
              <p className="text-sm text-slate-400 mb-1">В работе</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pab_in_progress}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
              <p className="text-sm text-slate-400 mb-1">Просроченные</p>
              <p className="text-2xl font-bold text-red-500">{stats.pab_overdue}</p>
            </div>
          </div>
        </Card>

        {/* Observations Statistics */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="Eye" size={24} className="text-yellow-500" />
            Статистика наблюдений
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Выписано наблюдений</p>
              <p className="text-2xl font-bold text-white">{stats.observations_issued}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600/30">
              <p className="text-sm text-slate-400 mb-1">Устранено</p>
              <p className="text-2xl font-bold text-green-500">{stats.observations_completed}</p>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
              <p className="text-sm text-slate-400 mb-1">В работе</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.observations_in_progress}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
              <p className="text-sm text-slate-400 mb-1">Просроченные</p>
              <p className="text-2xl font-bold text-red-500">{stats.observations_overdue}</p>
            </div>
          </div>
        </Card>

        {/* Prescriptions Statistics */}
        <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="ClipboardList" size={24} className="text-yellow-500" />
            Статистика предписаний
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Выписано предписаний</p>
              <p className="text-2xl font-bold text-white">{stats.prescriptions_issued}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600/30">
              <p className="text-sm text-slate-400 mb-1">Устранено</p>
              <p className="text-2xl font-bold text-green-500">{stats.prescriptions_completed}</p>
            </div>
            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
              <p className="text-sm text-slate-400 mb-1">В работе</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.prescriptions_in_progress}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
              <p className="text-sm text-slate-400 mb-1">Просроченные</p>
              <p className="text-2xl font-bold text-red-500">{stats.prescriptions_overdue}</p>
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
    </div>
  );
};

export default UserCabinet;