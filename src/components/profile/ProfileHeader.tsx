import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface UserProfile {
  fio: string;
  display_name?: string;
  company: string;
  email: string;
  role: string;
  stats: {
    registered_count: number;
    online_count: number;
    offline_count: number;
  };
}

interface ProfileHeaderProps {
  profile: UserProfile;
  onBack: () => void;
}

const ProfileHeader = ({ profile, onBack }: ProfileHeaderProps) => (
  <>
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="border-yellow-600/50">
          <Icon name="ArrowLeft" size={20} />
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-yellow-600 to-orange-700 p-3 rounded-xl shadow-lg">
            <Icon name="User" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {profile.role === 'superadmin' ? profile.fio : (profile.display_name || profile.fio)}
            </h1>
            {profile.company && (
              <p className="text-blue-400 font-semibold text-lg">{profile.company}</p>
            )}
            <p className="text-yellow-500">{profile.email}</p>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-slate-800/50 border-green-600/30 p-6">
        <div className="flex items-center gap-4">
          <div className="bg-green-600 p-3 rounded-lg">
            <Icon name="CheckCircle" size={24} className="text-white" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Назначено</p>
            <p className="text-2xl font-bold text-white">{profile.stats.registered_count}</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/50 border-blue-600/30 p-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-lg">
            <Icon name="Activity" size={24} className="text-white" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">В работе</p>
            <p className="text-2xl font-bold text-white">{profile.stats.online_count}</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/50 border-red-600/30 p-6">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-lg">
            <Icon name="AlertCircle" size={24} className="text-white" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Просрочено</p>
            <p className="text-2xl font-bold text-white">{profile.stats.offline_count}</p>
          </div>
        </div>
      </Card>
    </div>
  </>
);

export default ProfileHeader;
