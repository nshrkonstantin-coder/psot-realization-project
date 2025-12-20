import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface UserTableRowProps {
  user: User;
  isSuperAdmin: boolean;
  onUpdateRole: (userId: number, newRole: string) => void;
  onEditProfile: (user: User) => void;
  onEditCredentials: (user: User) => void;
  onDelete: (userId: number) => void;
  onLoginAs: (userId: number, userRole: string) => void;
  getRoleBadgeColor: (role: string) => string;
  getRoleLabel: (role: string) => string;
  isHighlighted?: boolean;
}

export const UserTableRow = ({
  user,
  isSuperAdmin,
  onUpdateRole,
  onEditProfile,
  onEditCredentials,
  onDelete,
  onLoginAs,
  getRoleBadgeColor,
  getRoleLabel,
  isHighlighted = false,
}: UserTableRowProps) => {
  return (
    <tr className={`border-b border-slate-700 hover:bg-slate-700/30 transition-all duration-500 ${
      isHighlighted ? 'bg-blue-600/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse' : ''
    }`}>
      <td className="px-2 py-3 text-slate-300 text-sm truncate">
        {user.display_name || `ID№${String(user.id).padStart(5, '0')}`}
      </td>
      <td className="px-2 py-3 text-slate-300 text-sm truncate" title={user.fio}>{user.fio}</td>
      <td className="px-2 py-3 text-slate-300 text-sm truncate" title={user.email}>{user.email}</td>
      <td className="px-2 py-3 text-slate-300 text-sm truncate" title={user.company}>{user.company}</td>
      <td className="px-2 py-3 text-slate-300 text-sm truncate" title={user.subdivision}>{user.subdivision}</td>
      <td className="px-2 py-3 text-slate-300 text-sm truncate" title={user.position}>{user.position}</td>
      <td className="px-2 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>
      </td>
      <td className="px-2 py-3 text-slate-300 text-sm">
        {new Date(user.created_at).toLocaleDateString('ru-RU')}
      </td>
      <td className="px-2 py-3">
        <div className="text-xs text-slate-400">
          <div>ПАБ: {user.stats?.registered_count || 0}</div>
          <div>Он: {user.stats?.online_count || 0}</div>
          <div>Оф: {user.stats?.offline_count || 0}</div>
        </div>
      </td>
      <td className="px-2 py-3">
        <div className="flex flex-col gap-1.5">
          {isSuperAdmin && (
            <Select
              value={user.role}
              onValueChange={(value) => onUpdateRole(user.id, value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-7 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="user" className="text-white hover:bg-slate-600 text-xs">
                  Пользователь
                </SelectItem>
                <SelectItem value="admin" className="text-white hover:bg-slate-600 text-xs">
                  Администратор
                </SelectItem>
                <SelectItem value="superadmin" className="text-white hover:bg-slate-600 text-xs">
                  Суперадмин
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => onEditProfile(user)}
            variant="outline"
            size="sm"
            className="border-blue-600/50 text-blue-500 hover:bg-blue-600/10 text-xs h-7 px-2"
          >
            <Icon name="Edit" size={12} className="mr-1" />
            Профиль
          </Button>
          {isSuperAdmin && (
            <>
              <Button
                onClick={() => onLoginAs(user.id, user.role)}
                variant="outline"
                size="sm"
                className="border-green-600/50 text-green-500 hover:bg-green-600/10 text-xs h-7 px-2"
              >
                <Icon name="LogIn" size={12} className="mr-1" />
                Вход в ЛК
              </Button>
              <Button
                onClick={() => onEditCredentials(user)}
                variant="outline"
                size="sm"
                className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10 text-xs h-7 px-2"
              >
                <Icon name="Key" size={12} className="mr-1" />
                Учётка
              </Button>
              <Button
                onClick={() => onDelete(user.id)}
                variant="outline"
                size="sm"
                className="border-red-600/50 text-red-500 hover:bg-red-600/10 text-xs h-7 px-2"
              >
                <Icon name="Trash2" size={12} className="mr-1" />
                Удалить
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};