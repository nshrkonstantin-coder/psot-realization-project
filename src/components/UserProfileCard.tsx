import Icon from '@/components/ui/icon';

interface UserProfileCardProps {
  variant?: 'dark' | 'light';
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Супер-администратор',
  admin: 'Администратор',
  org_admin: 'Администратор организации',
  miniadmin: 'Мини-администратор',
  org_mini_admin: 'Мини-администратор',
  user: 'Пользователь',
};

const STATUS_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  admin: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  org_admin: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  miniadmin: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  org_mini_admin: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  user: 'bg-green-500/20 text-green-300 border-green-500/40',
};

const UserProfileCard = ({ variant = 'dark', className = '' }: UserProfileCardProps) => {
  const fio = localStorage.getItem('userFio') || localStorage.getItem('userName') || '—';
  const position = localStorage.getItem('userPosition') || localStorage.getItem('userDepartment') || '';
  const role = localStorage.getItem('userRole') || 'user';
  const department = localStorage.getItem('userDepartment') || '';

  const roleLabel = ROLE_LABELS[role] || 'Пользователь';
  const statusColor = STATUS_COLORS[role] || STATUS_COLORS['user'];

  const initials = fio
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm select-none ${
      isDark
        ? 'bg-slate-800/60 border-slate-600/40'
        : 'bg-white/80 border-slate-200 shadow-md'
    } ${className}`}>
      {/* Аватар с инициалами */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
        isDark
          ? 'bg-gradient-to-br from-orange-500/30 to-red-600/30 text-orange-300 border border-orange-500/30'
          : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 border border-blue-300/40'
      }`}>
        {initials || <Icon name="User" size={18} />}
      </div>

      {/* Текст */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {fio}
        </p>
        {(position || department) && (
          <p className={`text-[11px] leading-tight truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {position || department}
          </p>
        )}
      </div>

      {/* Роль/статус */}
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border whitespace-nowrap ${statusColor}`}>
        {roleLabel}
      </span>
    </div>
  );
};

export default UserProfileCard;
