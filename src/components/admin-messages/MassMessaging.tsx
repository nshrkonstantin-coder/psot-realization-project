import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface MassMessagingProps {
  users: User[];
  companies: Company[];
  userRole: string;
  onSendMassMessage: (userIds: number[], message: string, deliveryType: 'email' | 'internal') => Promise<void>;
  loading: boolean;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '☺️', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '🤩', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇',
  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '💯', '✅', '❌', '⚠️', '🚀', '🎉', '🎊', '🎈', '🎁'
];

export const MassMessaging = ({
  users,
  companies,
  userRole,
  onSendMassMessage,
  loading
}: MassMessagingProps) => {
  const [massMessageText, setMassMessageText] = useState('');
  const [massDeliveryType, setMassDeliveryType] = useState<'email' | 'internal'>('internal');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUsers, setSearchUsers] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const massMessageRef = useRef<HTMLTextAreaElement>(null);

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const getFilteredUsers = () => {
    return users.filter(u => {
      const matchesSearch = u.fio.toLowerCase().includes(searchUsers.toLowerCase()) ||
                           u.email.toLowerCase().includes(searchUsers.toLowerCase());
      const matchesCompany = filterCompanyId === 'all' || u.company_id === Number(filterCompanyId);
      return matchesSearch && matchesCompany;
    });
  };

  const selectAllUsers = () => {
    const filtered = getFilteredUsers();
    setSelectedUserIds(filtered.map(u => u.id));
  };

  const getUsersCountByCompany = (companyId: string) => {
    if (companyId === 'all') {
      return users.filter(u =>
        u.fio.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUsers.toLowerCase())
      ).length;
    }
    return users.filter(u => 
      u.company_id === Number(companyId) && 
      (u.fio.toLowerCase().includes(searchUsers.toLowerCase()) ||
       u.email.toLowerCase().includes(searchUsers.toLowerCase()))
    ).length;
  };

  const addEmojiToMass = (emoji: string) => {
    const textarea = massMessageRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = massMessageText;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setMassMessageText(newText);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSend = async () => {
    if (!massMessageText.trim() || selectedUserIds.length === 0) return;
    
    await onSendMassMessage(selectedUserIds, massMessageText, massDeliveryType);
    
    setMassMessageText('');
    setSelectedUserIds([]);
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-blue-600/30">
        <CardHeader>
          <CardTitle className="text-white">Выбор получателей</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Фильтр по предприятию</Label>
            <Select 
              value={filterCompanyId} 
              onValueChange={setFilterCompanyId}
              disabled={userRole !== 'admin' && userRole !== 'superadmin'}
            >
              <SelectTrigger className="bg-slate-900/50 text-white border-blue-600/30">
                <SelectValue placeholder="Выберите предприятие" />
              </SelectTrigger>
              <SelectContent>
                {(userRole === 'admin' || userRole === 'superadmin') && (
                  <SelectItem value="all">
                    Все предприятия ({getUsersCountByCompany('all')})
                  </SelectItem>
                )}
                {companies.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({getUsersCountByCompany(String(c.id))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white">Поиск пользователей</Label>
            <Input
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              placeholder="ФИО или email..."
              className="bg-slate-900/50 text-white border-blue-600/30"
            />
          </div>

          <div className="flex justify-between items-center">
            <Label className="text-white">Выбрано: {selectedUserIds.length}</Label>
            <Button
              onClick={selectAllUsers}
              variant="outline"
              size="sm"
              className="border-blue-600/50"
            >
              Выбрать всех ({filteredUsers.length})
            </Button>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Пользователи не найдены</p>
            ) : (
              filteredUsers.map(user => (
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
                    {user.company_name && (
                      <p className="text-slate-500 text-xs">{user.company_name}</p>
                    )}
                  </div>
                  <span className="text-xs text-blue-400">{user.role}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-blue-600/30">
        <CardHeader>
          <CardTitle className="text-white">Сообщение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Способ доставки</Label>
            <Select
              value={massDeliveryType}
              onValueChange={(v) => setMassDeliveryType(v as 'email' | 'internal')}
            >
              <SelectTrigger className="bg-slate-900/50 text-white border-blue-600/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Внутренние сообщения</SelectItem>
                <SelectItem value="email">Email рассылка</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white">Текст сообщения</Label>
            <div className="flex gap-2 items-start">
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-slate-700/50 border-blue-600/30 hover:bg-slate-600/50"
                  >
                    😊
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-slate-800 border-blue-600/30 p-2">
                  <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                    {EMOJI_LIST.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => addEmojiToMass(emoji)}
                        className="text-2xl hover:bg-slate-700/50 rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Textarea
                ref={massMessageRef}
                value={massMessageText}
                onChange={(e) => setMassMessageText(e.target.value)}
                placeholder="Введите текст рассылки..."
                className="flex-1 bg-slate-900/50 text-white border-blue-600/30 min-h-[200px]"
              />
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || !massMessageText.trim() || selectedUserIds.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Icon name="Send" size={16} className="mr-2" />
            Отправить {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
