import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface OrganizationUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
  company: string;
  email: string;
  last_activity?: string;
}

interface OrganizationUsersDialogProps {
  showRegisteredUsers: boolean;
  showOnlineUsers: boolean;
  registeredUsers: OrganizationUser[];
  onlineUsers: OrganizationUser[];
  onClose: () => void;
  onUserClick: (user: OrganizationUser) => void;
}

export default function OrganizationUsersDialog({
  showRegisteredUsers,
  showOnlineUsers,
  registeredUsers,
  onlineUsers,
  onClose,
  onUserClick
}: OrganizationUsersDialogProps) {
  const isOpen = showRegisteredUsers || showOnlineUsers;
  const users = showRegisteredUsers ? registeredUsers : onlineUsers;
  const title = showRegisteredUsers ? 'Зарегистрированные пользователи' : 'Пользователи онлайн';
  const description = showRegisteredUsers 
    ? `Всего зарегистрировано: ${registeredUsers.length}` 
    : `Онлайн сейчас: ${onlineUsers.length}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Icon name={showRegisteredUsers ? "Users" : "UserCheck"} size={24} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {users.map((user) => (
            <Card 
              key={user.id}
              className="bg-slate-800/50 border-slate-700/50 hover:border-blue-600/50 cursor-pointer transition-all p-4"
              onClick={() => onUserClick(user)}
            >
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                  <Icon name="User" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">{user.fio}</h4>
                  {user.position && (
                    <p className="text-slate-400 text-sm mb-1">{user.position}</p>
                  )}
                  {user.subdivision && (
                    <p className="text-slate-500 text-xs mb-1">{user.subdivision}</p>
                  )}
                  {user.email && (
                    <p className="text-blue-400 text-xs">{user.email}</p>
                  )}
                  {user.last_activity && (
                    <p className="text-green-400 text-xs mt-2">
                      Последняя активность: {new Date(user.last_activity).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Users" size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">Пользователи не найдены</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
