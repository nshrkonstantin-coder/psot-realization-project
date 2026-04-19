import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import FUNC_URLS from '../../backend/func2url.json';
import { apiFetch } from '@/lib/api';

interface Module {
  id: number;
  name: string;
  display_name: string;
  description: string;
  route_path: string;
  icon: string;
  category: string;
  is_enabled: boolean;
}

interface Organization {
  id: number;
  name: string;
  logo_url: string;
}

export default function OrganizationModulesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [orgRes, modulesRes] = await Promise.all([
        apiFetch(`${FUNC_URLS.organizations}?id=${id}`),
        apiFetch(`${FUNC_URLS['organization-modules']}?organization_id=${id}`)
      ]);

      const orgData = await orgRes.json();
      const modulesData = await modulesRes.json();

      setOrganization(orgData);
      setModules(modulesData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleId: number, currentStatus: boolean) => {
    try {
      const res = await apiFetch(FUNC_URLS['organization-modules'], {
        method: 'POST',
        body: JSON.stringify({
          organization_id: parseInt(id!),
          module_id: moduleId,
          is_enabled: !currentStatus
        })
      });

      if (res.ok) {
        setModules(prev =>
          prev.map(m =>
            m.id === moduleId ? { ...m, is_enabled: !currentStatus } : m
          )
        );
        toast.success(`Модуль ${!currentStatus ? 'включен' : 'выключен'}`);
      }
    } catch (error) {
      console.error('Ошибка обновления модуля:', error);
      toast.error('Не удалось обновить модуль');
    }
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      const enabledModuleIds = modules.filter(m => m.is_enabled).map(m => m.id);

      const res = await apiFetch(FUNC_URLS['organization-modules'], {
        method: 'PUT',
        body: JSON.stringify({
          organization_id: parseInt(id!),
          module_ids: enabledModuleIds
        })
      });

      if (res.ok) {
        toast.success('Настройки сохранены');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const groupedModules = modules.reduce((acc, module) => {
    const category = module.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);

  const categoryNames: Record<string, string> = {
    main: 'Основные',
    logistics: 'Логистика',
    production: 'Производство',
    hr: 'Персонал',
    analytics: 'Аналитика',
    system: 'Системные',
    pab: 'ПАБ',
    storage: 'Хранилище',
    users: 'Пользователи',
    other: 'Другие'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  const enabledCount = modules.filter(m => m.is_enabled).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/organizations-management')}
            variant="ghost"
            className="text-purple-400 mb-4"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад к списку предприятий
          </Button>

          <div className="flex items-center gap-4">
            {organization?.logo_url && (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-16 h-16 object-contain rounded-lg bg-white/5 p-2"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{organization?.name}</h1>
              <p className="text-gray-300">Управление модулями предприятия</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-600/30 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">
                Доступные модули
              </h2>
              <p className="text-gray-400">
                Активно {enabledCount} из {modules.length} модулей
              </p>
            </div>
            <Button
              onClick={saveAllChanges}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Save" size={20} className="mr-2" />
                  Сохранить все изменения
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedModules).map(([category, categoryModules]) => (
            <div key={category} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-600/30">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">
                {categoryNames[category] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryModules.map((module) => (
                  <div
                    key={module.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      module.is_enabled
                        ? 'border-blue-500 bg-blue-600/20'
                        : 'border-slate-600/50 bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Icon name={module.icon as any} size={24} className="text-purple-400" />
                        <div>
                          <h4 className="text-white font-semibold">{module.display_name}</h4>
                          <p className="text-sm text-gray-400">{module.description}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => toggleModule(module.id, module.is_enabled)}
                        size="sm"
                        variant={module.is_enabled ? 'default' : 'outline'}
                        className={module.is_enabled ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {module.is_enabled ? (
                          <>
                            <Icon name="Check" size={16} className="mr-1" />
                            Включено
                          </>
                        ) : (
                          <>
                            <Icon name="X" size={16} className="mr-1" />
                            Выключено
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}