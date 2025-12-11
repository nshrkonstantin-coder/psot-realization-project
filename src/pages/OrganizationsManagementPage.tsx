import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import BlockOrganizationDialog from '@/components/BlockOrganizationDialog';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
  created_at: string;
  trial_end_date: string | null;
  subscription_type: string;
  is_active: boolean;
  user_count: number;
  module_count: number;
  page_count: number;
}

const OrganizationsManagementPage = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

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
    
    loadOrganizations();
  }, [navigate]);

  const loadOrganizations = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b');
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      toast.error('Не удалось загрузить список предприятий');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Ссылка скопирована');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/superadmin')} className="text-purple-400">
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

        <div className="mt-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-xl shadow-lg">
              <Icon name="Building2" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Управление предприятиями</h1>
              <p className="text-purple-400">Всего предприятий: {organizations.length}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/logo-library')}
              variant="outline"
              className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10"
            >
              <Icon name="Image" size={20} className="mr-2" />
              Библиотека логотипов
            </Button>
            <Button
              onClick={() => navigate('/create-organization')}
              className="bg-gradient-to-r from-green-600 to-emerald-700"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Регистрация нового предприятия
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {organizations.length === 0 ? (
          <Card className="p-12 text-center bg-slate-800/50 border-purple-600/30">
            <Icon name="Building2" size={64} className="mx-auto text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Нет зарегистрированных предприятий</h3>
            <p className="text-gray-400 mb-6">Начните с регистрации первого предприятия</p>
            <Button
              onClick={() => navigate('/create-organization')}
              className="bg-gradient-to-r from-green-600 to-emerald-700"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Зарегистрировать предприятие
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="bg-slate-800/50 border-purple-600/30 hover:border-purple-600 transition-all p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-2xl font-bold text-white">{org.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          org.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {org.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-600/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                          <Icon name="Users" size={16} />
                          <span className="text-sm">Пользователи</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{org.user_count}</div>
                      </div>

                      <div className="bg-purple-600/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-400 mb-1">
                          <Icon name="Package" size={16} />
                          <span className="text-sm">Модули</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{org.module_count}</div>
                      </div>

                      <div className="bg-pink-600/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-pink-400 mb-1">
                          <Icon name="FileText" size={16} />
                          <span className="text-sm">Страницы</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{org.page_count}</div>
                      </div>

                      <div className="bg-orange-600/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-400 mb-1">
                          <Icon name="CreditCard" size={16} />
                          <span className="text-sm">Тариф</span>
                        </div>
                        <div className="text-sm font-semibold text-white">{org.subscription_type}</div>
                      </div>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Код регистрации пользователей:</div>
                          <div className="text-lg font-mono font-bold text-green-400">{org.registration_code}</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/register?code=${org.registration_code}`)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Icon name="Copy" size={16} className="mr-2" />
                          Скопировать ссылку
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400">
                      Создано: {new Date(org.created_at).toLocaleDateString('ru-RU')}
                      {org.trial_end_date && (
                        <> • Пробный период до: {new Date(org.trial_end_date).toLocaleDateString('ru-RU')}</>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => navigate(`/organization-users/${org.id}`)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Icon name="Users" size={20} className="mr-2" />
                      Пользователи
                    </Button>
                    <Button
                      onClick={() => navigate(`/organization-modules/${org.id}`)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Icon name="Package" size={20} className="mr-2" />
                      Модули
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedOrg(org);
                        setBlockDialogOpen(true);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Icon name="Ban" size={20} className="mr-2" />
                      Заблокировать
                    </Button>
                    <Button
                      onClick={() => navigate(`/organization-settings/${org.id}`)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Icon name="Settings" size={20} className="mr-2" />
                      Настроить
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedOrg && (
        <BlockOrganizationDialog
          organization={selectedOrg}
          isOpen={blockDialogOpen}
          onClose={() => {
            setBlockDialogOpen(false);
            setSelectedOrg(null);
          }}
          onSuccess={() => {
            loadOrganizations();
          }}
        />
      )}
    </div>
  );
};

export default OrganizationsManagementPage;