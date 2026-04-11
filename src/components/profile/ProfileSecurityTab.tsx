import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const PROFILE_API = 'https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f';

const ProfileSecurityTab = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Пароли не совпадают', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Пароль должен быть не менее 6 символов', variant: 'destructive' });
      return;
    }
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const response = await fetch(PROFILE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', userId, currentPassword, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Пароль изменён' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка изменения пароля', variant: 'destructive' });
    }
  };

  return (
    <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-red-600 to-orange-700 p-3 rounded-xl">
            <Icon name="ShieldAlert" size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Изменить пароль</h2>
            <p className="text-gray-400 text-sm">Рекомендуется использовать сложный пароль</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Текущий пароль</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-slate-700/50 border-yellow-600/30 text-white" placeholder="Введите текущий пароль" />
          </div>
          <div>
            <Label className="text-gray-300">Новый пароль</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="bg-slate-700/50 border-yellow-600/30 text-white" placeholder="Введите новый пароль" />
          </div>
          <div>
            <Label className="text-gray-300">Подтвердите новый пароль</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-slate-700/50 border-yellow-600/30 text-white" placeholder="Повторите новый пароль" />
          </div>
        </div>

        <Button onClick={handleChangePassword}
          className="w-full bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-700 hover:to-orange-800"
          disabled={!currentPassword || !newPassword || !confirmPassword}>
          <Icon name="Key" size={20} className="mr-2" />Изменить пароль
        </Button>
      </div>
    </Card>
  );
};

export default ProfileSecurityTab;
