import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import OrganizationLogo from '@/components/OrganizationLogo';
import { ChatsList } from '@/components/admin-messages/ChatsList';
import { MessagesView } from '@/components/admin-messages/MessagesView';
import { MassMessaging } from '@/components/admin-messages/MassMessaging';
import { EmailSender } from '@/components/admin-messages/EmailSender';

interface User {
  id: number;
  fio: string;
  email: string;
  role: string;
  company_id: number;
  company_name?: string;
}

interface Company {
  id: number;
  name: string;
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
  const [userOrgId, setUserOrgId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const MESSAGING_URL = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';
  const SEND_EMAIL_URL = 'https://functions.poehali.dev/5055f3a3-bc30-4e5b-b65c-e30b28b07a03';
  const ORGANIZATIONS_URL = 'https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b';

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('userId');

    if (!id) {
      navigate('/');
      return;
    }

    setUserId(Number(id));
    setUserRole(role || 'user');
    loadUserInfo(Number(id));
    loadUsers();
    loadChats();
  }, [navigate]);

  const loadUserInfo = async (id: number) => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=list_all_users`, {
        headers: { 'X-User-Id': String(id) }
      });
      const data = await response.json();
      if (data.users) {
        const currentUser = data.users.find((u: User) => u.id === id);
        if (currentUser) {
          setUserOrgId(currentUser.company_id);
          const role = localStorage.getItem('userRole');
          loadCompanies(currentUser.company_id, role || 'user');
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки информации пользователя:', error);
    }
  };

  const loadCompanies = async (userOrgId?: number, userRole?: string) => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}?action=list`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      let allCompanies: Company[] = [];
      
      if (Array.isArray(data)) {
        allCompanies = data;
      } else if (data.organizations && Array.isArray(data.organizations)) {
        allCompanies = data.organizations;
      }
      
      // Фильтрация теперь происходит на бэкенде по X-User-Id
      setCompanies(allCompanies);
    } catch (error) {
      console.error('Ошибка загрузки предприятий:', error);
      setCompanies([]);
      toast({ title: 'Ошибка загрузки предприятий', variant: 'destructive' });
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=list_all_users`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      console.log('Users API response:', data, 'Status:', response.status);
      if (!response.ok || data.error) {
        console.error('API Error:', data);
        toast({ title: 'Ошибка загрузки пользователей', description: data.error || 'Неизвестная ошибка', variant: 'destructive' });
      }
      setUsers(data.users || []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      toast({ title: 'Ошибка загрузки пользователей', variant: 'destructive' });
    }
  };

  const loadChats = async () => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=list_chats`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      setChats(data.chats || []);
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
      setMessages(data.messages || []);
      
      await fetch(`${MESSAGING_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId')!
        },
        body: JSON.stringify({ action: 'mark_as_read', chat_id: chatId })
      });
      
      loadChats();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const handleSelectChat = (chatId: number) => {
    setSelectedChat(chatId);
    loadMessages(chatId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setLoading(true);
    try {
      const response = await fetch(MESSAGING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId')!
        },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: selectedChat,
          message_text: newMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages(selectedChat);
        loadChats();
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки сообщения', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (name: string, userIds: number[]) => {
    setLoading(true);
    try {
      const response = await fetch(MESSAGING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId')!
        },
        body: JSON.stringify({
          action: 'create_chat',
          chat_name: name,
          user_ids: userIds
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Чат создан успешно' });
        loadChats();
      }
    } catch (error) {
      toast({ title: 'Ошибка создания чата', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMassMessage = async (userIds: number[], message: string, deliveryType: 'email' | 'internal') => {
    setLoading(true);
    try {
      const response = await fetch(MESSAGING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('userId')!
        },
        body: JSON.stringify({
          action: 'send_mass_message',
          user_ids: userIds,
          message_text: message,
          delivery_type: deliveryType
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: `Рассылка отправлена (${userIds.length} получателей)` });
      }
    } catch (error) {
      toast({ title: 'Ошибка массовой рассылки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (userIdStr: string, subject: string, body: string) => {
    const selectedUser = users.find(u => u.id === Number(userIdStr));
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: selectedUser.email,
          subject: subject,
          html_content: body
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Письмо отправлено' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки письма', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="outline" className="border-blue-600/50">
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <OrganizationLogo size={48} showCompanyName={false} />
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

          <TabsContent value="chats">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChatsList
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                users={users}
                companies={companies}
                userRole={userRole}
                onCreateChat={handleCreateChat}
                loading={loading}
              />

              <MessagesView
                messages={messages}
                userId={userId}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={handleSendMessage}
                loading={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="mass">
            <MassMessaging
              users={users}
              companies={companies}
              userRole={userRole}
              onSendMassMessage={handleSendMassMessage}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="email">
            <EmailSender
              users={users}
              companies={companies}
              userRole={userRole}
              onSendEmail={handleSendEmail}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminMessagesPage;