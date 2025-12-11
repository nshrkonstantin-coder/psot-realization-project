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

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    loadChats();
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

  const loadMessages = async (chat: Chat) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/7ce14ae9-b117-45ff-a64a-52a3f9881389?userId=${userId}&receiverId=${chat.userId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
        setSelectedChat(chat);
        setShowChatDialog(true);
      } else {
        toast({ title: 'Ошибка загрузки сообщений', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сервера', variant: 'destructive' });
    }
  };

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
        loadMessages(selectedChat);
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
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
              <Icon name="MessageSquare" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">История сообщений</h1>
              <p className="text-slate-400">Все ваши чаты</p>
            </div>
          </div>
          <div className="flex gap-3">
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
              <p className="text-slate-400">Начните общение, отправив первое сообщение из личного кабинета</p>
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
                        <p className="text-slate-300 text-sm line-clamp-1">{chat.lastMessage}</p>
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
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
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
    </div>
  );
};

export default ChatHistory;