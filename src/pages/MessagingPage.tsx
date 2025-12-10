import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const MESSAGING_API = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';

interface Chat {
  id: number;
  name: string;
  type: string;
  unread_count: number;
  last_message: string;
  last_message_time: string;
}

interface Message {
  id: number;
  message_text: string;
  created_at: string;
  sender_id: number;
  sender_name: string;
  sender_company: string;
}

interface User {
  id: number;
  fio: string;
  email: string;
  position: string;
}

const MessagingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<number | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [newChatName, setNewChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (!id) {
      navigate('/');
      return;
    }
    setUserId(parseInt(id));
    loadChats(parseInt(id));
    loadUsers(parseInt(id));
  }, [navigate]);

  const loadChats = async (uid: number) => {
    try {
      const response = await fetch(`${MESSAGING_API}?action=list_chats`, {
        headers: { 'X-User-Id': uid.toString() }
      });
      const data = await response.json();
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки чатов', variant: 'destructive' });
    }
  };

  const loadUsers = async (uid: number) => {
    try {
      const response = await fetch(`${MESSAGING_API}?action=list_users`, {
        headers: { 'X-User-Id': uid.toString() }
      });
      const data = await response.json();
      if (data.users) {
        setUsers(data.users.filter((u: User) => u.id !== uid));
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${MESSAGING_API}?action=get_messages&chat_id=${chatId}`, {
        headers: { 'X-User-Id': userId.toString() }
      });
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки сообщений', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const handleSendMessage = async () => {
    if (!userId || !selectedChat || !newMessage.trim()) return;

    try {
      const response = await fetch(`${MESSAGING_API}?action=send_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId.toString()
        },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          message_text: newMessage.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages(selectedChat.id);
        loadChats(userId);
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки сообщения', variant: 'destructive' });
    }
  };

  const handleCreateChat = async () => {
    if (!userId || !newChatName.trim() || selectedUsers.length === 0) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`${MESSAGING_API}?action=create_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId.toString()
        },
        body: JSON.stringify({
          name: newChatName.trim(),
          type: 'internal',
          participant_ids: [...selectedUsers, userId]
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Чат создан успешно' });
        setIsCreateDialogOpen(false);
        setNewChatName('');
        setSelectedUsers([]);
        loadChats(userId);
      }
    } catch (error) {
      toast({ title: 'Ошибка создания чата', variant: 'destructive' });
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return `${days} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-xl">
                <Icon name="MessageCircle" size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Сообщения</h1>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                <Icon name="Plus" size={20} className="mr-2" />
                Создать чат
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-yellow-600/30">
              <DialogHeader>
                <DialogTitle>Создать новый чат</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Название чата</Label>
                  <Input
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Введите название"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label>Участники</Label>
                  <ScrollArea className="h-64 bg-slate-700 rounded-lg p-3 border border-slate-600">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center gap-3 py-2 hover:bg-slate-600 rounded px-2">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <div>
                          <p className="font-medium">{user.fio}</p>
                          <p className="text-sm text-slate-400">{user.position}</p>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <Button 
                  onClick={handleCreateChat}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700"
                >
                  Создать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 bg-slate-800/50 border-yellow-600/30 p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="MessageSquare" size={24} />
                Мои чаты
              </h2>
            </div>
            <ScrollArea className="h-[600px]">
              {chats.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Icon name="MessageCircle" size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Нет активных чатов</p>
                  <p className="text-sm mt-2">Создайте новый чат</p>
                </div>
              ) : (
                chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`p-4 cursor-pointer border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{chat.name}</h3>
                          {chat.unread_count > 0 && (
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                              {chat.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1 truncate">
                          {chat.last_message || 'Нет сообщений'}
                        </p>
                      </div>
                      {chat.last_message_time && (
                        <span className="text-xs text-slate-500">
                          {formatTime(chat.last_message_time)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-2 bg-slate-800/50 border-yellow-600/30 p-0 overflow-hidden flex flex-col">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Icon name="MessageCircle" size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-xl">Выберите чат для начала общения</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4">
                  <h2 className="text-xl font-bold text-white">{selectedChat.name}</h2>
                  <p className="text-sm text-blue-100">{selectedChat.type === 'internal' ? 'Внутренний чат' : 'Межкорпоративный чат'}</p>
                </div>

                <ScrollArea className="flex-1 h-[450px] p-4">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin">
                        <Icon name="Loader2" size={32} className="text-blue-500" />
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <p>Нет сообщений</p>
                      <p className="text-sm mt-2">Начните общение первым</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_id === userId
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                              : 'bg-slate-700 text-white'
                          }`}>
                            {msg.sender_id !== userId && (
                              <div className="text-xs text-blue-300 mb-1">
                                {msg.sender_name} • {msg.sender_company}
                              </div>
                            )}
                            <p className="text-sm">{msg.message_text}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t border-slate-700">
                  <div className="flex gap-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Введите сообщение..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      <Icon name="Send" size={20} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MessagingPage;
