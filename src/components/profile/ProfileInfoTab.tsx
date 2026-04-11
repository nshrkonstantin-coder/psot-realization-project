import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface UserProfile {
  fio: string;
  email: string;
  role: string;
  created_at: string;
}

interface ProfileInfoTabProps {
  profile: UserProfile;
  fio: string;
  company: string;
  subdivision: string;
  position: string;
  editMode: boolean;
  onFioChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onSubdivisionChange: (v: string) => void;
  onPositionChange: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  getRoleBadgeColor: (role: string) => string;
  getRoleLabel: (role: string) => string;
}

const ProfileInfoTab = ({
  profile, fio, company, subdivision, position, editMode,
  onFioChange, onCompanyChange, onSubdivisionChange, onPositionChange,
  onEdit, onSave, onCancel, getRoleBadgeColor, getRoleLabel,
}: ProfileInfoTabProps) => (
  <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-600 to-orange-700 p-4 rounded-2xl">
          <Icon name="UserCircle" size={48} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{profile.fio}</h2>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(profile.role)} mt-2`}>
            {getRoleLabel(profile.role)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-gray-300">ФИО</Label>
          <Input value={fio} onChange={(e) => onFioChange(e.target.value)} disabled={!editMode}
            className="bg-slate-700/50 border-yellow-600/30 text-white disabled:opacity-50" />
        </div>
        <div>
          <Label className="text-gray-300">Компания</Label>
          <Input value={company} onChange={(e) => onCompanyChange(e.target.value)} disabled={!editMode}
            className="bg-slate-700/50 border-yellow-600/30 text-white disabled:opacity-50" />
        </div>
        <div>
          <Label className="text-gray-300">Подразделение</Label>
          <Input value={subdivision} onChange={(e) => onSubdivisionChange(e.target.value)} disabled={!editMode}
            className="bg-slate-700/50 border-yellow-600/30 text-white disabled:opacity-50" />
        </div>
        <div>
          <Label className="text-gray-300">Должность</Label>
          <Input value={position} onChange={(e) => onPositionChange(e.target.value)} disabled={!editMode}
            className="bg-slate-700/50 border-yellow-600/30 text-white disabled:opacity-50" />
        </div>
        <div>
          <Label className="text-gray-300">Email</Label>
          <Input value={profile.email} disabled
            className="bg-slate-700/30 border-yellow-600/20 text-gray-400" />
        </div>
        <div>
          <Label className="text-gray-300">Дата регистрации</Label>
          <Input value={new Date(profile.created_at).toLocaleDateString('ru-RU')} disabled
            className="bg-slate-700/30 border-yellow-600/20 text-gray-400" />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        {!editMode ? (
          <Button onClick={onEdit}
            className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-700 hover:to-orange-800">
            <Icon name="Edit" size={20} className="mr-2" />Редактировать
          </Button>
        ) : (
          <>
            <Button onClick={onSave}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
              <Icon name="Check" size={20} className="mr-2" />Сохранить
            </Button>
            <Button onClick={onCancel} variant="outline"
              className="flex-1 border-red-600/50 text-red-400 hover:bg-red-600/10">
              <Icon name="X" size={20} className="mr-2" />Отмена
            </Button>
          </>
        )}
      </div>
    </div>
  </Card>
);

export default ProfileInfoTab;
