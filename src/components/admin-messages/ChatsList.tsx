import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

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

interface ChatsListProps {
  chats: Chat[];
  selectedChat: number | null;
  onSelectChat: (chatId: number) => void;
  users: User[];
  companies: Company[];
  userRole: string;
  onCreateChat: (name: string, userIds: number[]) => Promise<void>;
  loading: boolean;
}

export const ChatsList = ({
  chats,
  selectedChat,
  onSelectChat,
  users,
  companies,
  userRole,
  onCreateChat,
  loading
}: ChatsListProps) => {
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatUserIds, setNewChatUserIds] = useState<number[]>([]);
  const [newChatCompanyFilter, setNewChatCompanyFilter] = useState<string>('all');
  const [newChatSearch, setNewChatSearch] = useState('');

  // Автоматически выбираем первое предприятие для user/minadmin
  useEffect(() => {
    if ((userRole === 'user' || userRole === 'minadmin') && companies.length > 0) {
      setNewChatCompanyFilter(String(companies[0].id));
    }
  }, [companies, userRole]);

  const toggleNewChatUser = (id: number) => {
    setNewChatUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const getNewChatFilteredUsers = () => {
    return users.filter(u => {
      const matchesSearch = (u.fio || '').toLowerCase().includes((newChatSearch || '').toLowerCase()) ||
                           (u.email || '').toLowerCase().includes((newChatSearch || '').toLowerCase());
      const matchesCompany = newChatCompanyFilter === 'all' || u.company_id === Number(newChatCompanyFilter);
      return matchesSearch && matchesCompany;
    });
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim() || newChatUserIds.length === 0) return;
    
    await onCreateChat(newChatName.trim(), newChatUserIds);
    
    setNewChatName('');
    setNewChatUserIds([]);
    setNewChatSearch('');
    setShowCreateChat(false);
  };

  const newChatFilteredUsers = getNewChatFilteredUsers();

  return (
    <Card className="bg-slate-800/50 border-blue-600/30 lg:col-span-1">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white">Чаты</CardTitle>
          <Dialog open={showCreateChat} onOpenChange={setShowCreateChat}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Icon name="Plus" size={16} className="mr-1" />
                Создать
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-blue-600/30 max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Создать новый чат</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-white">Название чата</Label>
                  <Input
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Введите название чата"
                    className="bg-slate-900/50 text-white border-blue-600/30"
                  />
                </div>

                <div>
                  <Label className="text-white">Фильтр по предприятию</Label>
                  <Select 
                    value={newChatCompanyFilter} 
                    onValueChange={setNewChatCompanyFilter}
                    disabled={userRole !== 'admin' && userRole !== 'superadmin'}
                  >
                    <SelectTrigger className="bg-slate-900/50 text-white border-blue-600/30">
                      <SelectValue placeholder="Выберите предприятие" />
                    </SelectTrigger>
                    <SelectContent>
                      {(userRole === 'admin' || userRole === 'superadmin') && (
                        <SelectItem value="all">Все предприятия</SelectItem>
                      )}
                      {companies.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Участники ({newChatUserIds.length})</Label>
                  <Input
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    placeholder="Поиск пользователей..."
                    className="bg-slate-900/50 text-white border-blue-600/30 mb-2"
                  />
                  <div className="bg-slate-900/50 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
                    {newChatFilteredUsers.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">Пользователи не найдены</p>
                    ) : (
                      newChatFilteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded cursor-pointer"
                          onClick={() => toggleNewChatUser(user.id)}
                        >
                          <Checkbox
                            checked={newChatUserIds.includes(user.id)}
                            onCheckedChange={() => toggleNewChatUser(user.id)}
                          />
                          <div className="flex-1">
                            <p className="text-white">{user.fio}</p>
                            <p className="text-slate-400 text-sm">{user.email}</p>
                          </div>
                          <span className="text-xs text-blue-400">{user.role}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleCreateChat}
                  disabled={loading || !newChatName.trim() || newChatUserIds.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Icon name="MessageSquare" size={16} className="mr-2" />
                  Создать чат
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {chats.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Чаты отсутствуют</p>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedChat === chat.id
                    ? 'bg-blue-600/30 border border-blue-500/50'
                    : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon name="MessageSquare" size={16} className="text-blue-400" />
                    <h3 className="font-semibold text-white">{chat.name}</h3>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <>
                    <p className="text-sm text-slate-300 mb-1 line-clamp-1">{chat.last_message}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(chat.last_message_time).toLocaleString('ru-RU')}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};