import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

interface EmailSenderProps {
  users: User[];
  companies: Company[];
  userRole: string;
  onSendEmail: (userId: string, subject: string, body: string) => Promise<void>;
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

export const EmailSender = ({
  users,
  companies,
  userRole,
  onSendEmail,
  loading
}: EmailSenderProps) => {
  const [emailToUserId, setEmailToUserId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);

  const getFilteredUsers = () => {
    return users.filter(u => {
      const matchesSearch = u.fio.toLowerCase().includes(searchUsers.toLowerCase()) ||
                           u.email.toLowerCase().includes(searchUsers.toLowerCase());
      const matchesCompany = filterCompanyId === 'all' || u.company_id === Number(filterCompanyId);
      return matchesSearch && matchesCompany;
    });
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

  const addEmojiToEmail = (emoji: string) => {
    const textarea = emailBodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = emailBody;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setEmailBody(newText);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSend = async () => {
    if (!emailToUserId || !emailSubject.trim() || !emailBody.trim()) return;
    
    await onSendEmail(emailToUserId, emailSubject, emailBody);
    
    setEmailToUserId('');
    setEmailSubject('');
    setEmailBody('');
  };

  const filteredUsers = getFilteredUsers();
  const selectedUser = users.find(u => u.id === Number(emailToUserId));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-blue-600/30">
        <CardHeader>
          <CardTitle className="text-white">Выбор получателя</CardTitle>
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
            <Label className="text-white">Поиск пользователя</Label>
            <Input
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              placeholder="ФИО или email..."
              className="bg-slate-900/50 text-white border-blue-600/30"
            />
          </div>

          <div>
            <Label className="text-white">Получатель</Label>
            <Select value={emailToUserId} onValueChange={setEmailToUserId}>
              <SelectTrigger className="bg-slate-900/50 text-white border-blue-600/30">
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    Пользователи не найдены
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.fio}</span>
                        <span className="text-xs text-slate-400">{user.email}</span>
                        {user.company_name && (
                          <span className="text-xs text-slate-500">{user.company_name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-white font-semibold">{selectedUser.fio}</p>
              <p className="text-slate-400 text-sm">{selectedUser.email}</p>
              {selectedUser.company_name && (
                <p className="text-slate-500 text-xs">{selectedUser.company_name}</p>
              )}
              <span className="text-xs text-blue-400">{selectedUser.role}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-blue-600/30">
        <CardHeader>
          <CardTitle className="text-white">Письмо</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Тема письма</Label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Введите тему письма..."
              className="bg-slate-900/50 text-white border-blue-600/30"
            />
          </div>

          <div>
            <Label className="text-white">Текст письма</Label>
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
                        onClick={() => addEmojiToEmail(emoji)}
                        className="text-2xl hover:bg-slate-700/50 rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Textarea
                ref={emailBodyRef}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Введите текст письма..."
                className="flex-1 bg-slate-900/50 text-white border-blue-600/30 min-h-[250px]"
              />
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || !emailToUserId || !emailSubject.trim() || !emailBody.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Icon name="Mail" size={16} className="mr-2" />
            Отправить письмо
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
