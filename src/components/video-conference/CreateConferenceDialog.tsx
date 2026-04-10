import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { User, Company } from './conferenceTypes';

interface CreateConferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conferenceName: string;
  onConferenceNameChange: (val: string) => void;
  selectedCompanyId: string;
  onSelectedCompanyIdChange: (val: string) => void;
  selectedUserIds: number[];
  searchUser: string;
  onSearchUserChange: (val: string) => void;
  users: User[];
  companies: Company[];
  userRole: string;
  loading: boolean;
  onToggleUser: (id: number) => void;
  onCreate: () => void;
}

const CreateConferenceDialog = ({
  open,
  onOpenChange,
  conferenceName,
  onConferenceNameChange,
  selectedCompanyId,
  onSelectedCompanyIdChange,
  selectedUserIds,
  searchUser,
  onSearchUserChange,
  users,
  companies,
  userRole,
  loading,
  onToggleUser,
  onCreate,
}: CreateConferenceDialogProps) => {
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.fio.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase());
    const matchesCompany =
      selectedCompanyId === 'all' || u.company_id === Number(selectedCompanyId);
    return matchesSearch && matchesCompany;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-pink-600/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Icon name="Video" size={24} className="text-pink-500" />
            Создать конференцию
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-white">Название конференции</Label>
            <Input
              value={conferenceName}
              onChange={e => onConferenceNameChange(e.target.value)}
              placeholder="Введите название конференции"
              className="bg-slate-900/50 text-white border-pink-600/30"
            />
          </div>

          <div>
            <Label className="text-white">Фильтр по предприятию</Label>
            <Select value={selectedCompanyId} onValueChange={onSelectedCompanyIdChange}>
              <SelectTrigger className="bg-slate-900/50 text-white border-pink-600/30">
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
            <Label className="text-white">Участники ({selectedUserIds.length})</Label>
            <Input
              value={searchUser}
              onChange={e => onSearchUserChange(e.target.value)}
              placeholder="Поиск пользователей..."
              className="bg-slate-900/50 text-white border-pink-600/30 mb-2"
            />
            <div className="bg-slate-900/50 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-400 text-center py-4">Пользователи не найдены</p>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded cursor-pointer"
                    onClick={() => onToggleUser(user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => onToggleUser(user.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-white">{user.fio}</p>
                      <p className="text-slate-400 text-sm">
                        {user.email} · {user.company_name || 'Без предприятия'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            onClick={onCreate}
            disabled={loading || !conferenceName.trim() || selectedUserIds.length === 0}
            className="w-full bg-pink-600 hover:bg-pink-700"
          >
            <Icon name="Video" size={20} className="mr-2" />
            Создать и присоединиться
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateConferenceDialog;
