import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  fio: string;
  email: string;
  role: string;
  company_id: number;
}

interface Chat {
  id: number;
  name: string;
  type: string;
  created_at: string;
  unread_count: number;
  last_message: string;
  last_message_time: string;
}

interface Message {
  id: number;
  message_text: string;
  created_at: string;
  is_read: boolean;
  sender_id: number;
  sender_name: string;
  sender_company: string;
}

const AdminMessagesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Массовая рассылка
  const [massMessageText, setMassMessageText] = useState('');
  const [massDeliveryType, setMassDeliveryType] = useState<'email' | 'internal'>('internal');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUsers, setSearchUsers] = useState('');
  
  // Личное сообщение на почту
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const MESSAGING_URL = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';
  const SEND_EMAIL_URL = 'https://functions.poehali.dev/5055f3a3-bc30-4e5b-b65c-e30b28b07a03';

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('userId');

    if (!id || (role !== 'admin' && role !== 'superadmin')) {
      navigate('/');
      return;
    }

    setUserId(Number(id));
    setUserRole(role);
    loadUsers();
    loadChats();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=list_all_users`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadChats = async () => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=list_chats`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=get_messages&chat_id=${chatId}`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const handleSelectChat = (chatId: number) => {
    setSelectedChat(chatId);
    loadMessages(chatId);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${MESSAGING_URL}?action=send_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId')!
        },
        body: JSON.stringify({
          chat_id: selectedChat,
          message_text: newMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages(selectedChat);
        toast({ title: 'Сообщение отправлено' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleMassMessage = async () => {
    if (!massMessageText.trim() || selectedUserIds.length === 0) {
      toast({ title: 'Выберите пользователей и введите текст', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${MESSAGING_URL}?action=mass_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId')!
        },
        body: JSON.stringify({
          user_ids: selectedUserIds,
          message_text: massMessageText,
          delivery_type: massDeliveryType
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: `Отправлено ${data.sent_count} сообщений` });
        setMassMessageText('');
        setSelectedUserIds([]);
      }
    } catch (error) {
      toast({ title: 'Ошибка массовой отправки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject.trim() || !emailBody.trim()) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: emailTo,
          subject: emailSubject,
          html_content: emailBody
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Письмо отправлено' });
        setEmailTo('');
        setEmailSubject('');
        setEmailBody('');
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки письма', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const selectAllUsers = () => {
    const filtered = users.filter(u =>
      u.fio.toLowerCase().includes(searchUsers.toLowerCase())
    );
    setSelectedUserIds(filtered.map(u => u.id));
  };

  const filteredUsers = users.filter(u =>
    u.fio.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUsers.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="outline" className="border-blue-600/50">
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">История сообщений</h1>
              <p className="text-blue-400">Управление перепиской и рассылками</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="chats" className="space-y-6">
          <TabsList className="bg-slate-800/50">
            <TabsTrigger value="chats">Переписки</TabsTrigger>
            <TabsTrigger value="mass">Массовая рассылка</TabsTrigger>
            <TabsTrigger value="email">Письмо пользователю</TabsTrigger>
          </TabsList>

          {/* Переписки */}
          <TabsContent value="chats">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800/50 border-blue-600/30 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-white">Чаты</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {chats.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Нет активных чатов</p>
                  ) : (
                    chats.map(chat => (
                      <div
                        key={chat.id}
                        onClick={() => handleSelectChat(chat.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedChat === chat.id
                            ? 'bg-blue-600/30 border-blue-600'
                            : 'bg-slate-700/30 hover:bg-slate-700/50'
                        } border`}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="text-white font-semibold">{chat.name}</h3>
                          {chat.unread_count > 0 && (
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                              {chat.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1 truncate">{chat.last_message}</p>
                        <p className="text-slate-500 text-xs mt-1">
                          {new Date(chat.last_message_time).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-blue-600/30 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">
                    {selectedChat ? 'Сообщения' : 'Выберите чат'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedChat ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900/50 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-3">
                        {messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.sender_id === userId
                                ? 'bg-blue-600/30 ml-auto max-w-[80%]'
                                : 'bg-slate-700/50 mr-auto max-w-[80%]'
                            }`}
                          >
                            <p className="text-sm text-blue-400 font-semibold">
                              {msg.sender_name} · {msg.sender_company}
                            </p>
                            <p className="text-white mt-1">{msg.message_text}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(msg.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Введите сообщение..."
                          className="bg-slate-900/50 text-white border-blue-600/30"
                          rows={3}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={loading || !newMessage.trim()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Icon name="Send" size={20} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-12">
                      Выберите чат для начала переписки
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Массовая рассылка */}
          <TabsContent value="mass">
            <Card className="bg-slate-800/50 border-blue-600/30">
              <CardHeader>
                <CardTitle className="text-white">Массовая рассылка</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-white">Тип доставки</Label>
                  <Select value={massDeliveryType} onValueChange={(v: any) => setMassDeliveryType(v)}>
                    <SelectTrigger className="bg-slate-900/50 text-white border-blue-600/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Внутри приложения</SelectItem>
                      <SelectItem value="email">На почту</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Текст сообщения</Label>
                  <Textarea
                    value={massMessageText}
                    onChange={(e) => setMassMessageText(e.target.value)}
                    placeholder="Введите текст для массовой рассылки..."
                    className="bg-slate-900/50 text-white border-blue-600/30"
                    rows={5}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-white">Получатели ({selectedUserIds.length})</Label>
                    <Button onClick={selectAllUsers} variant="outline" size="sm">
                      Выбрать всех
                    </Button>
                  </div>
                  <Input
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    placeholder="Поиск пользователей..."
                    className="bg-slate-900/50 text-white border-blue-600/30 mb-4"
                  />
                  <div className="bg-slate-900/50 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded cursor-pointer"
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <Checkbox
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <div className="flex-1">
                          <p className="text-white">{user.fio}</p>
                          <p className="text-slate-400 text-sm">{user.email}</p>
                        </div>
                        <span className="text-xs text-blue-400">{user.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleMassMessage}
                  disabled={loading || selectedUserIds.length === 0 || !massMessageText.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Icon name="Send" size={20} className="mr-2" />
                  Отправить {selectedUserIds.length} пользователям
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Письмо пользователю */}
          <TabsContent value="email">
            <Card className="bg-slate-800/50 border-blue-600/30">
              <CardHeader>
                <CardTitle className="text-white">Отправить письмо на почту</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-white">Получатель</Label>
                  <Select value={emailTo} onValueChange={setEmailTo}>
                    <SelectTrigger className="bg-slate-900/50 text-white border-blue-600/30">
                      <SelectValue placeholder="Выберите пользователя" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.fio} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Тема письма</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Введите тему письма"
                    className="bg-slate-900/50 text-white border-blue-600/30"
                  />
                </div>

                <div>
                  <Label className="text-white">Текст письма</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Введите текст письма..."
                    className="bg-slate-900/50 text-white border-blue-600/30"
                    rows={10}
                  />
                </div>

                <Button
                  onClick={handleSendEmail}
                  disabled={loading || !emailTo || !emailSubject.trim() || !emailBody.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Icon name="Mail" size={20} className="mr-2" />
                  Отправить письмо
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminMessagesPage;