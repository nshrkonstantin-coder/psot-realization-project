import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { OrganizationInfoSection } from '@/components/OrganizationInfoSection';
import { PointsManagementSection } from '@/components/PointsManagementSection';
import { ModulesSection } from '@/components/ModulesSection';
import { PagesSection } from '@/components/PagesSection';
import { apiFetch } from '@/lib/api';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
  user_count: number;
  subscription_type: string;
  logo_url: string | null;
  points_balance?: number;
  points_enabled?: boolean;
}

interface Module {
  id: number;
  name: string;
  description: string;
  module_type: string;
  enabled: boolean;
}

interface Page {
  id: number;
  name: string;
  route: string;
  icon: string;
  description: string;
  enabled: boolean;
}

const OrganizationSettingsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsEnabled, setPointsEnabled] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'superadmin') {
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      return;
    }
    
    loadData();
  }, [navigate, id]);

  const loadData = async () => {
    try {
      const [orgRes, modulesRes, pagesRes, pointsRes] = await Promise.all([
        apiFetch(`https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?id=${id}`),
        apiFetch(`https://functions.poehali.dev/a4f6bfe1-8f77-48b2-b6dd-70ac0a1c023a?type=modules&organization_id=${id}`),
        apiFetch(`https://functions.poehali.dev/a4f6bfe1-8f77-48b2-b6dd-70ac0a1c023a?type=pages&organization_id=${id}`),
        apiFetch(`https://functions.poehali.dev/1e66556d-e508-403d-aced-20637779242a?org_id=${id}`)
      ]);

      const orgData = await orgRes.json();
      const modulesData = await modulesRes.json();
      const pagesData = await pagesRes.json();
      const pointsData = await pointsRes.json();

      setOrganization(orgData);
      setModules(modulesData);
      setPages(pagesData);
      setPointsBalance(pointsData.points_balance || 0);
      setPointsEnabled(pointsData.is_enabled || false);
    } catch (error) {
      toast.error('Не удалось загрузить данные');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: number) => {
    setModules(prev =>
      prev.map(m => (m.id === moduleId ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const togglePage = (pageId: number) => {
    setPages(prev =>
      prev.map(p => (p.id === pageId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const enabledModules = modules.filter(m => m.enabled).map(m => m.id);
      const enabledPages = pages.filter(p => p.enabled).map(p => p.id);

      await Promise.all([
        apiFetch('https://functions.poehali.dev/a4f6bfe1-8f77-48b2-b6dd-70ac0a1c023a', {
          method: 'PUT',
          body: JSON.stringify({
            organization_id: id,
            type: 'modules',
            items: enabledModules
          })
        }),
        apiFetch('https://functions.poehali.dev/a4f6bfe1-8f77-48b2-b6dd-70ac0a1c023a', {
          method: 'PUT',
          body: JSON.stringify({
            organization_id: id,
            type: 'pages',
            items: enabledPages
          })
        })
      ]);

      toast.success('Настройки сохранены');
    } catch (error) {
      toast.error('Не удалось сохранить настройки');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleLogoChange = (logoUrl: string | null) => {
    setOrganization(prev => prev ? { ...prev, logo_url: logoUrl } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Предприятие не найдено</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/organizations-management')} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10"
          >
            <Icon name="LogOut" size={20} className="mr-2" />
            Выход
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-xl shadow-lg">
            <Icon name="Settings" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{organization.name}</h1>
            <p className="text-purple-400">Настройка модулей и страниц</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <OrganizationInfoSection 
          organization={organization} 
          onLogoChange={handleLogoChange}
        />

        <Card className="bg-slate-800/50 border-purple-600/30 p-6">
          <PointsManagementSection
            organizationId={id!}
            pointsBalance={pointsBalance}
            pointsEnabled={pointsEnabled}
            onPointsBalanceChange={setPointsBalance}
            onPointsEnabledChange={setPointsEnabled}
          />
        </Card>

        <ModulesSection 
          modules={modules} 
          onToggleModule={toggleModule}
        />

        <PagesSection 
          pages={pages} 
          onTogglePage={togglePage}
        />

        <Card className="bg-slate-800/50 border-purple-600/30 p-6">
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-emerald-700 px-8"
            >
              {saving ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Save" size={20} className="mr-2" />
                  Сохранить настройки
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationSettingsPage;