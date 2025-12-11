import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface TariffPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  is_default: boolean;
  module_count: number;
}

interface LogoTemplate {
  id: number;
  name: string;
  category: string;
  logo_url: string;
  preview_url: string;
}

const CreateOrganizationPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [logoTemplates, setLogoTemplates] = useState<LogoTemplate[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [activeLogoTab, setActiveLogoTab] = useState<'templates' | 'upload'>('templates');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
    
    loadTariffs();
    loadLogoTemplates();
  }, [navigate]);

  const loadTariffs = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/78e6bfda-487d-4a51-a368-1870e67aba1a');
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setTariffs(data.filter((t: TariffPlan) => t.is_active));
    } catch (error) {
      toast.error('Не удалось загрузить тарифные планы');
      console.error(error);
    }
  };

  const loadLogoTemplates = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/d5352f1d-bdec-44b8-b0b5-34901c6a3245');
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setLogoTemplates(data);
    } catch (error) {
      console.error('Не удалось загрузить шаблоны логотипов:', error);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Размер изображения не должен превышать 10 МБ');
      return;
    }

    setUploadingLogo(true);

    try {
      toast.info('Сжатие изображения...');
      const compressedBase64 = await compressImage(file);
      
      console.log('Исходный размер:', (file.size / 1024).toFixed(2), 'КБ');
      console.log('Размер после сжатия:', (compressedBase64.length / 1024).toFixed(2), 'КБ');
      
      setCustomLogo(compressedBase64);
      setSelectedLogo(null);
      toast.success('Логотип загружен и сжат');
    } catch (error) {
      console.error('Ошибка сжатия:', error);
      toast.error('Ошибка загрузки логотипа');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Введите название предприятия');
      return;
    }

    if (!selectedPlan) {
      toast.error('Выберите тарифный план');
      return;
    }

    setLoading(true);

    try {
      const logoUrl = customLogo || (selectedLogo ? logoTemplates.find(t => t.logo_url === selectedLogo)?.logo_url : null);

      const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tariff_plan_id: selectedPlan,
          logo_url: logoUrl
        })
      });

      if (!response.ok) throw new Error('Failed to create');

      const data = await response.json();
      toast.success('Предприятие успешно зарегистрировано');
      navigate(`/organization-settings/${data.id}`);
    } catch (error) {
      toast.error('Не удалось зарегистрировать предприятие');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto mb-8">
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
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-3 rounded-xl shadow-lg">
            <Icon name="Plus" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Регистрация нового предприятия</h1>
            <p className="text-purple-400">Заполните информацию о предприятии</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card className="bg-slate-800/50 border-purple-600/30 p-8 mb-6">
            <div className="mb-6">
              <Label htmlFor="name" className="text-white text-lg mb-2">
                Название предприятия
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ООО Рога и Копыта"
                className="bg-slate-700/50 border-purple-600/30 text-white text-lg"
              />
            </div>

            <div>
              <Label className="text-white text-lg mb-3 block">
                Логотип предприятия
              </Label>
              
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  onClick={() => setActiveLogoTab('templates')}
                  variant={activeLogoTab === 'templates' ? 'default' : 'outline'}
                  className={activeLogoTab === 'templates' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <Icon name="Grid3x3" size={18} className="mr-2" />
                  Из библиотеки
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveLogoTab('upload')}
                  variant={activeLogoTab === 'upload' ? 'default' : 'outline'}
                  className={activeLogoTab === 'upload' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <Icon name="Upload" size={18} className="mr-2" />
                  Загрузить свой
                </Button>
              </div>

              {activeLogoTab === 'templates' && (
                <div>
                  <p className="text-sm text-gray-400 mb-4">
                    Выберите готовый шаблон логотипа из библиотеки
                  </p>
                  <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {logoTemplates.filter(t => t.logo_url !== 'placeholder').map((template) => (
                      <div
                        key={template.id}
                        onClick={() => {
                          setSelectedLogo(template.logo_url);
                          setCustomLogo(null);
                        }}
                        className={`cursor-pointer p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          selectedLogo === template.logo_url
                            ? 'border-blue-500 bg-blue-600/20'
                            : 'border-purple-600/30 bg-slate-700/30'
                        }`}
                      >
                        <div className="aspect-square flex items-center justify-center mb-2 bg-white/5 rounded">
                          <img src={template.logo_url} alt={template.name} className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs text-gray-300 text-center truncate">{template.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeLogoTab === 'upload' && (
                <div>
                  <p className="text-sm text-gray-400 mb-4">
                    Загрузите свой логотип (рекомендуемый размер: 256x256px, до 5 МБ)
                  </p>
                  {customLogo ? (
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        <img 
                          src={customLogo} 
                          alt="Загруженный логотип" 
                          className="w-32 h-32 object-contain rounded-lg border-2 border-blue-600/30 bg-white/5"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setCustomLogo(null)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm text-green-400 mb-2">✓ Логотип загружен</p>
                        <div>
                          <input
                            type="file"
                            accept="*/*"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                            className="hidden"
                            id="logo-change"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => document.getElementById('logo-change')?.click()}
                          >
                            <Icon name="Upload" size={16} className="mr-2" />
                            Изменить
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="*/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                        id="logo-upload-new"
                      />
                      <div 
                        onClick={() => !uploadingLogo && document.getElementById('logo-upload-new')?.click()}
                        className="border-2 border-dashed border-purple-600/30 rounded-lg p-8 text-center cursor-pointer hover:border-purple-600 transition-colors bg-slate-700/30">
                        {uploadingLogo ? (
                          <>
                            <Icon name="Loader2" size={48} className="mx-auto text-purple-400 mb-3 animate-spin" />
                            <p className="text-white">Загрузка...</p>
                          </>
                        ) : (
                          <>
                            <Icon name="Upload" size={48} className="mx-auto text-purple-400 mb-3" />
                            <p className="text-white mb-1">Нажмите для загрузки</p>
                            <p className="text-sm text-gray-400">PNG, JPG до 5 МБ</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Выберите тарифный план</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tariffs.map((tariff) => (
                <Card
                  key={tariff.id}
                  onClick={() => setSelectedPlan(tariff.id)}
                  className={`cursor-pointer transition-all p-6 ${
                    selectedPlan === tariff.id
                      ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-blue-500 scale-105'
                      : 'bg-slate-800/50 border-purple-600/30 hover:border-purple-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{tariff.name}</h3>
                    {selectedPlan === tariff.id && (
                      <Icon name="CheckCircle2" size={24} className="text-green-400" />
                    )}
                  </div>

                  {tariff.is_default && (
                    <div className="mb-2">
                      <span className="px-2 py-1 bg-green-600/30 text-green-400 text-xs rounded">
                        По умолчанию
                      </span>
                    </div>
                  )}

                  <div className="text-3xl font-bold text-white mb-2">
                    {tariff.price === 0 ? 'Бесплатно' : `${tariff.price} ₽/мес`}
                  </div>

                  <p className="text-sm text-gray-300 mb-4">
                    {tariff.description}
                  </p>

                  <div className="border-t border-purple-600/30 pt-3">
                    <div className="flex items-center gap-2 text-sm text-purple-400">
                      <Icon name="Package" size={16} />
                      <span>{tariff.module_count} модулей в тарифе</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="bg-slate-800/50 border-purple-600/30 p-6">
            <div className="flex justify-between items-center">
              <div className="text-gray-400">
                После регистрации будет сгенерирована уникальная ссылка для регистрации пользователей предприятия
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-700 px-8"
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Icon name="Check" size={20} className="mr-2" />
                    Зарегистрировать предприятие
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationPage;