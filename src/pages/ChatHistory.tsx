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

interface Chat {
  chatId: number;
  userId: number;
  userName: string;
  position: string;
  subdivision: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
}

interface Message {
  id: number;
  senderId: number;
  message: string;
  createdAt: string | null;
  isRead: boolean;
  senderName: string;
}

interface OrganizationUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
  company: string;
  email: string;
}

const ChatHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const [selectedNewUser, setSelectedNewUser] = useState<OrganizationUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [checklistHtml, setChecklistHtml] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadChats();
    
    // Автообновление списка чатов каждые 10 секунд
    const interval = setInterval(() => {
      loadChats();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const loadChats = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/7ce14ae9-b117-45ff-a64a-52a3f9881389?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setChats(data.chats);
      } else {
        toast({ title: 'Ошибка загрузки чатов', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationUsers = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?action=registered_users&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrganizationUsers(data.users);
        setShowNewChatDialog(true);
      } else {
        toast({ title: 'Ошибка загрузки пользователей', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

  const handleStartNewChat = (user: OrganizationUser) => {
    const existingChat = chats.find(chat => chat.userId === user.id);
    
    if (existingChat) {
      setShowNewChatDialog(false);
      loadMessages(existingChat);
    } else {
      setSelectedNewUser(user);
      setShowNewChatDialog(false);
      setSelectedChat({
        chatId: 0,
        userId: user.id,
        userName: user.fio,
        position: user.position,
        subdivision: user.subdivision,
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0
      });
      setMessages([]);
      setShowChatDialog(true);
    }
  };

  const loadMessages = async (chat: Chat, silent = false) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/7ce14ae9-b117-45ff-a64a-52a3f9881389?userId=${userId}&receiverId=${chat.userId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
        if (!silent) {
          setSelectedChat(chat);
          setShowChatDialog(true);
        }
      } else if (!silent) {
        toast({ title: 'Ошибка загрузки сообщений', variant: 'destructive' });
      }
    } catch (error) {
      if (!silent) {
        toast({ title: 'Ошибка сервера', variant: 'destructive' });
      }
    }
  };
  
  // Автообновление сообщений в открытом диалоге
  useEffect(() => {
    if (!showChatDialog || !selectedChat) return;
    
    const interval = setInterval(() => {
      loadMessages(selectedChat, true);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [showChatDialog, selectedChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) {
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
          receiverId: selectedChat.userId,
          message: newMessage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Сообщение отправлено' });
        setNewMessage('');
        setShowEmojiPicker(false);
        loadChats();
        loadMessages(selectedChat);
        setSelectedNewUser(null);
      } else {
        toast({ title: 'Ошибка отправки', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const commonEmojis = ['😊', '😂', '❤️', '👍', '🔥', '✅', '⚠️', '📌', '💼', '🎯', '👋', '🙏', '💪', '🚀', '⭐', '✨'];

  const openChecklist = (encoded: string) => {
    try {
      const html = decodeURIComponent(escape(atob(encoded)));
      setChecklistHtml(html);
    } catch {
      toast({ title: 'Не удалось открыть чек-лист', variant: 'destructive' });
    }
  };

  const printChecklist = () => {
    if (!checklistHtml) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
      <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}}</style>
    </head><body>
      <div class="no-print" style="text-align:center;margin-bottom:16px">
        <button onclick="window.print()" style="padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
          🖨️ Распечатать / Сохранить в PDF
        </button>
      </div>
      ${checklistHtml}</body></html>`);
    w.document.close();
  };

  const downloadChecklist = () => {
    if (!checklistHtml) return;
    const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Чек-лист передачи вахты</title>
      <style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px}@media print{.no-print{display:none!important}}</style>
    </head><body>
      <div class="no-print" style="text-align:center;margin-bottom:16px">
        <button onclick="window.print()" style="padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
          🖨️ Распечатать / Сохранить в PDF
        </button>
      </div>
      ${checklistHtml}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `чек-лист_вахты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMessageWithLinks = (text: string) => {
    // Сначала проверяем маркер чек-листа
    const checklistMarker = /\[CHECKLIST_DATA:([A-Za-z0-9+/=]+)\]/;
    const checklistMatch = text.match(checklistMarker);

    // Текст без маркера (для отображения)
    const visibleText = text.replace(checklistMarker, '').trim();

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = visibleText.split(urlRegex);

    const textNodes = parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const isVideoLink = part.includes('video-conference');
        const isInternalLink = part.includes(window.location.origin);

        if (isInternalLink && isVideoLink) {
          const roomMatch = part.match(/room=([^&\s]+)/);
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                if (roomMatch) navigate(`/video-conference?room=${roomMatch[1]}`);
              }}
              className="underline hover:opacity-80 font-semibold text-green-400 inline-flex items-center gap-1"
            >
              🎥 Присоединиться к конференции
            </button>
          );
        }

        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:opacity-80 font-semibold inline-flex items-center gap-1 ${isVideoLink ? 'text-green-400' : 'text-blue-400'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoLink && '🎥 '}
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });

    return (
      <>
        {textNodes}
        {checklistMatch && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openChecklist(checklistMatch[1]);
            }}
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-colors text-sm font-semibold w-full"
          >
            <span>📋</span>
            <span>Открыть чек-лист передачи вахты</span>
            <span className="ml-auto text-orange-400">→</span>
          </button>
        )}
      </>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return 'только что';
    if (hours < 24) return `${hours}ч назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-yellow-500 animate-spin" />
      </div>
    );
  }

  const currentUserId = parseInt(localStorage.getItem('userId') || '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={false} />
            <div>
              <h1 className="text-3xl font-bold text-white">История сообщений</h1>
              <p className="text-slate-400">Все ваши чаты</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadOrganizationUsers}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Новый чат
            </Button>
            <Button
              onClick={() => navigate('/user-cabinet')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              В кабинет
            </Button>
          </div>
        </div>

        {chats.length === 0 ? (
          <Card className="bg-slate-800/50 border-yellow-600/30 p-12">
            <div className="text-center">
              <Icon name="MessageCircle" size={64} className="text-slate-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Нет сообщений</h2>
              <p className="text-slate-400 mb-4">Начните общение, создав новый чат</p>
              <Button
                onClick={loadOrganizationUsers}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              >
                <Icon name="Plus" size={20} className="mr-2" />
                Создать первый чат
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => (
              <Card
                key={chat.chatId}
                className="bg-slate-800/50 border-yellow-600/30 p-6 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => loadMessages(chat)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-full">
                      <Icon name="User" size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{chat.userName}</h3>
                        {chat.unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        {chat.position} • {chat.subdivision}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-slate-300 text-sm line-clamp-2 break-words">
                          {renderMessageWithLinks(chat.lastMessage)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-2">
                      {formatDate(chat.lastMessageTime)}
                    </p>
                    <Icon name="ChevronRight" size={20} className="text-slate-500" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500 flex items-center gap-2">
              <Icon name="MessageSquare" size={28} />
              {selectedChat?.userName}
            </DialogTitle>
            {selectedChat && (
              <DialogDescription className="text-slate-300 text-base">
                {selectedChat.position} • {selectedChat.subdivision}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-4 max-h-[400px]">
            {messages.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Нет сообщений</p>
            ) : (
              messages.slice().reverse().map((msg) => {
                const isCurrentUser = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs text-slate-300 mb-1 font-semibold">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {renderMessageWithLinks(msg.message)}
                      </p>
                      <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-slate-400'}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3 border-t border-slate-700 pt-4">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
            />

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-yellow-500 hover:text-yellow-400"
              >
                {showEmojiPicker ? 'Скрыть' : 'Показать'} эмоджи
              </Button>
              <Button
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Icon name="Send" size={20} className="mr-2" />
                Отправить
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
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog - Select Participant */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-green-500 flex items-center gap-2">
              <Icon name="UserPlus" size={28} />
              Создать новый чат
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Выберите участника из АО "ГРК "Западная"
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <Icon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО, должности или подразделению..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {organizationUsers
                .filter(user => {
                  const query = searchQuery.toLowerCase();
                  return (
                    user.fio.toLowerCase().includes(query) ||
                    user.position.toLowerCase().includes(query) ||
                    user.subdivision.toLowerCase().includes(query)
                  );
                })
                .map((user) => (
                  <Card
                    key={user.id}
                    className="bg-slate-700/50 border-slate-600/50 p-4 cursor-pointer hover:bg-slate-600/50 transition-colors"
                    onClick={() => handleStartNewChat(user)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-full">
                          <Icon name="User" size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">{user.fio}</h3>
                          <div className="text-sm text-slate-400 space-y-1">
                            <p><strong>Должность:</strong> {user.position}</p>
                            <p><strong>Подразделение:</strong> {user.subdivision}</p>
                            <p><strong>Предприятие:</strong> {user.company}</p>
                          </div>
                        </div>
                      </div>
                      <Icon name="MessageCircle" size={24} className="text-green-500 flex-shrink-0 ml-4" />
                    </div>
                  </Card>
                ))}
            </div>

            {organizationUsers.filter(user => {
              const query = searchQuery.toLowerCase();
              return (
                user.fio.toLowerCase().includes(query) ||
                user.position.toLowerCase().includes(query) ||
                user.subdivision.toLowerCase().includes(query)
              );
            }).length === 0 && (
              <div className="text-center py-8 text-slate-400">
                {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно просмотра чек-листа передачи вахты */}
      <Dialog open={checklistHtml !== null} onOpenChange={() => setChecklistHtml(null)}>
        <DialogContent className="bg-slate-800 border-orange-600/30 text-white max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-700 shrink-0">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Icon name="ClipboardList" size={22} className="text-orange-400" />
              Чек-лист передачи вахты
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Просмотр, печать или сохранение чек-листа
            </DialogDescription>
          </DialogHeader>

          {/* Кнопки действий */}
          <div className="flex gap-3 px-6 py-3 border-b border-slate-700 shrink-0">
            <Button
              onClick={printChecklist}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Icon name="Printer" size={16} className="mr-2" />
              Распечатать / PDF
            </Button>
            <Button
              onClick={downloadChecklist}
              variant="outline"
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              <Icon name="Download" size={16} className="mr-2" />
              Скачать файл
            </Button>
            <Button
              onClick={() => setChecklistHtml(null)}
              variant="ghost"
              className="ml-auto text-slate-400 hover:text-white"
            >
              <Icon name="X" size={16} className="mr-1" />
              Закрыть
            </Button>
          </div>

          {/* Содержимое чек-листа */}
          <div className="flex-1 overflow-y-auto bg-white">
            {checklistHtml && (
              <div
                dangerouslySetInnerHTML={{ __html: checklistHtml }}
                className="w-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatHistory;