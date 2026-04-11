import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileInfoTab from '@/components/profile/ProfileInfoTab';
import ProfileTelegramTab from '@/components/profile/ProfileTelegramTab';
import ProfileSecurityTab from '@/components/profile/ProfileSecurityTab';

const PROFILE_API = 'https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f';

interface UserProfile {
  id: number;
  email: string;
  fio: string;
  display_name?: string;
  company: string;
  subdivision: string;
  position: string;
  role: string;
  created_at: string;
  telegram_chat_id?: number;
  telegram_username?: string;
  telegram_linked_at?: string;
  stats: {
    registered_count: number;
    online_count: number;
    offline_count: number;
  };
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'superadmin': return 'bg-purple-600 text-white';
    case 'admin': return 'bg-blue-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'superadmin': return 'Главный администратор';
    case 'admin': return 'Администратор';
    default: return 'Пользователь';
  }
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [fio, setFio] = useState('');
  const [company, setCompany] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [position, setPosition] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/'); return; }
    loadProfile(userId);
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const response = await fetch(`${PROFILE_API}?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setProfile(data.user);
        setFio(data.user.fio);
        setCompany(data.user.company);
        setSubdivision(data.user.subdivision);
        setPosition(data.user.position);
      }
    } catch {
      toast({ title: 'Ошибка загрузки профиля', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const response = await fetch(PROFILE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', userId, fio, company, subdivision, position }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Профиль обновлён' });
        localStorage.setItem('userFio', fio);
        setEditMode(false);
        loadProfile(userId);
      }
    } catch {
      toast({ title: 'Ошибка обновления профиля', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Загрузка...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Профиль не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <ProfileHeader profile={profile} onBack={() => navigate(-1)} />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-yellow-600/30">
            <TabsTrigger value="profile" className="data-[state=active]:bg-yellow-600">
              <Icon name="User" size={18} className="mr-2" />Профиль
            </TabsTrigger>
            <TabsTrigger value="telegram" className="data-[state=active]:bg-yellow-600">
              <Icon name="Send" size={18} className="mr-2" />Telegram
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-yellow-600">
              <Icon name="Lock" size={18} className="mr-2" />Безопасность
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileInfoTab
              profile={profile}
              fio={fio} company={company} subdivision={subdivision} position={position}
              editMode={editMode}
              onFioChange={setFio} onCompanyChange={setCompany}
              onSubdivisionChange={setSubdivision} onPositionChange={setPosition}
              onEdit={() => setEditMode(true)}
              onSave={handleUpdateProfile}
              onCancel={() => {
                setEditMode(false);
                setFio(profile.fio);
                setCompany(profile.company);
                setSubdivision(profile.subdivision);
                setPosition(profile.position);
              }}
              getRoleBadgeColor={getRoleBadgeColor}
              getRoleLabel={getRoleLabel}
            />
          </TabsContent>

          <TabsContent value="telegram">
            <ProfileTelegramTab profile={profile} onReload={loadProfile} />
          </TabsContent>

          <TabsContent value="security">
            <ProfileSecurityTab />
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default Profile;
