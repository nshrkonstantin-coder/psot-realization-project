import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  email: string;
  fio: string;
  display_name?: string;
  company: string;
  subdivision: string;
  position: string;
  role: string;
  created_at: string;
  stats: {
    registered_count: number;
    online_count: number;
    offline_count: number;
  };
}

interface UserEditDialogsProps {
  editUser: User | null;
  editCredentials: { id: number; email: string; newEmail: string; newPassword: string } | null;
  onEditUserChange: (user: User | null) => void;
  onEditCredentialsChange: (credentials: { id: number; email: string; newEmail: string; newPassword: string } | null) => void;
  onUpdateProfile: () => void;
  onChangeCredentials: () => void;
}

export const UserEditDialogs = ({
  editUser,
  editCredentials,
  onEditUserChange,
  onEditCredentialsChange,
  onUpdateProfile,
  onChangeCredentials,
}: UserEditDialogsProps) => {
  return (
    <>
      <Dialog open={!!editUser} onOpenChange={() => onEditUserChange(null)}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-500">Редактировать профиль</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">ФИО</Label>
                <Input
                  value={editUser.fio}
                  onChange={(e) => onEditUserChange({ ...editUser, fio: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Компания</Label>
                <Input
                  value={editUser.company}
                  onChange={(e) => onEditUserChange({ ...editUser, company: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Подразделение</Label>
                <Input
                  value={editUser.subdivision}
                  onChange={(e) => onEditUserChange({ ...editUser, subdivision: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Должность</Label>
                <Input
                  value={editUser.position}
                  onChange={(e) => onEditUserChange({ ...editUser, position: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={onUpdateProfile}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Icon name="Save" size={20} className="mr-2" />
                Сохранить
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCredentials} onOpenChange={() => onEditCredentialsChange(null)}>
        <DialogContent className="bg-slate-800 border-yellow-600/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-500">Изменить учётные данные</DialogTitle>
          </DialogHeader>
          {editCredentials && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Текущий Email</Label>
                <Input
                  value={editCredentials.email}
                  disabled
                  className="bg-slate-700/50 border-slate-600 text-slate-400"
                />
              </div>
              <div>
                <Label className="text-slate-300">Новый Email</Label>
                <Input
                  type="email"
                  value={editCredentials.newEmail}
                  onChange={(e) =>
                    onEditCredentialsChange({
                      ...editCredentials,
                      newEmail: e.target.value,
                    })
                  }
                  placeholder="Текущий email"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Новый пароль</Label>
                <Input
                  type="password"
                  value={editCredentials.newPassword}
                  onChange={(e) =>
                    onEditCredentialsChange({
                      ...editCredentials,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Текущий пароль (если установлен)"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={onChangeCredentials}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800"
              >
                <Icon name="Key" size={20} className="mr-2" />
                Изменить
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};