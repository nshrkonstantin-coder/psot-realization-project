import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface User {
  id: number;
  email: string;
  fio: string;
  display_name?: string;
  company: string;
  subdivision: string;
  position: string;
  role: string;
}

interface PasswordManagementTabProps {
  users: User[];
  onClose: () => void;
}

interface SelectedUser {
  id: number;
  email: string;
  fio: string;
  newPassword: string;
}

export const PasswordManagementTab = ({ users, onClose }: PasswordManagementTabProps) => {
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleUser = (user: User) => {
    const isSelected = selectedUsers.find((u) => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, { id: user.id, email: user.email, fio: user.fio, newPassword: '' }]);
    }
  };

  const handlePasswordChange = (userId: number, password: string) => {
    setSelectedUsers(selectedUsers.map((u) => (u.id === userId ? { ...u, newPassword: password } : u)));
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => ({ id: u.id, email: u.email, fio: u.fio, newPassword: '' })));
    }
  };

  const handleSendCredentials = async () => {
    const usersWithoutPassword = selectedUsers.filter((u) => !u.newPassword.trim());
    if (usersWithoutPassword.length > 0) {
      toast({
        title: 'Ошибка',
        description: 'Укажите пароли для всех выбранных пользователей',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('https://functions.poehali.dev/b00816fd-60cd-4a53-9b44-802868bfbb11', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: selectedUsers.map((u) => ({
            email: u.email,
            password: u.newPassword,
          })),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: `Учётные данные отправлены ${selectedUsers.length} пользователям`,
        });
        setSelectedUsers([]);
        setShowConfirmDialog(false);
      } else {
        const error = await response.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось отправить учётные данные',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при отправке данных',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Управление паролями</h2>
          <p className="text-slate-400 mt-1">
            Выберите пользователей, установите пароли и отправьте учётные данные на почту
          </p>
        </div>
        <Button onClick={onClose} variant="outline">
          <Icon name="X" size={20} className="mr-2" />
          Закрыть
        </Button>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Поиск по email или ФИО..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Button onClick={handleSelectAll} variant="outline">
              <Icon name={selectedUsers.length === filteredUsers.length ? 'CheckSquare' : 'Square'} size={20} className="mr-2" />
              {selectedUsers.length === filteredUsers.length ? 'Снять все' : 'Выбрать все'}
            </Button>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <div className="text-white">
                <strong>Выбрано пользователей: {selectedUsers.length}</strong>
              </div>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={selectedUsers.some((u) => !u.newPassword.trim())}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Icon name="Send" size={20} className="mr-2" />
                Отправить учётные данные
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const selected = selectedUsers.find((u) => u.id === user.id);
          return (
            <Card
              key={user.id}
              className={`border ${
                selected ? 'bg-slate-700 border-blue-500' : 'bg-slate-800 border-slate-700'
              } transition-colors`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <button
                      onClick={() => handleToggleUser(user)}
                      className="w-5 h-5 border-2 rounded border-slate-500 flex items-center justify-center hover:border-blue-500 transition-colors"
                    >
                      {selected && <Icon name="Check" size={16} className="text-blue-500" />}
                    </button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{user.fio || user.display_name || 'Не указано'}</span>
                        <span className="text-slate-400 text-sm">({user.email})</span>
                      </div>
                      <div className="text-slate-400 text-sm mt-1">
                        {user.company && <span>{user.company}</span>}
                        {user.position && <span> • {user.position}</span>}
                      </div>
                    </div>

                    {selected && (
                      <div className="space-y-2">
                        <Label className="text-slate-300">Новый пароль для {user.email}</Label>
                        <Input
                          type="text"
                          value={selected.newPassword}
                          onChange={(e) => handlePasswordChange(user.id, e.target.value)}
                          placeholder="Введите пароль для отправки"
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Подтверждение отправки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-slate-300">
            <p>
              Вы собираетесь отправить учётные данные <strong>{selectedUsers.length}</strong> пользователям:
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 bg-slate-900 p-4 rounded">
              {selectedUsers.map((u) => (
                <div key={u.id} className="text-sm">
                  <strong>{u.email}</strong> — пароль: <code className="bg-slate-700 px-2 py-1 rounded">{u.newPassword}</code>
                </div>
              ))}
            </div>
            <p className="text-yellow-400 text-sm">
              ⚠️ Учётные данные будут отправлены на указанные email адреса
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowConfirmDialog(false)} variant="outline" disabled={isSending}>
              Отмена
            </Button>
            <Button onClick={handleSendCredentials} className="bg-blue-600 hover:bg-blue-700" disabled={isSending}>
              {isSending ? 'Отправка...' : 'Подтвердить отправку'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};