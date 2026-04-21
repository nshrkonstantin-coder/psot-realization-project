import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
  user_count: number;
  subscription_type: string;
  logo_url: string | null;
}

interface LogoTemplate {
  id: number;
  name: string;
  category: string;
  logo_url: string;
}

interface OrganizationInfoSectionProps {
  organization: Organization;
  onLogoChange: (logoUrl: string | null) => void;
}

export const OrganizationInfoSection = ({ organization, onLogoChange }: OrganizationInfoSectionProps) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logo_url);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [logoTemplates, setLogoTemplates] = useState<LogoTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLogoDialogOpen) loadTemplates();
  }, [isLogoDialogOpen]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await apiFetch('https://functions.poehali.dev/d5352f1d-bdec-44b8-b0b5-34901c6a3245');
      if (res.ok) {
        const data = await res.json();
        setLogoTemplates(data.filter((t: LogoTemplate) => t.logo_url && t.logo_url.length > 200));
      }
    } catch {
      toast.error('Не удалось загрузить библиотеку');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success(`${type} скопирована`);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const saveLogo = async (logoUrl: string | null) => {
    const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: organization.id, logo_url: logoUrl })
    });
    if (!response.ok) throw new Error('Ошибка сохранения');
    return response;
  };

  const handleSelectFromLibrary = async (template: LogoTemplate) => {
    setUploadingLogo(true);
    try {
      await saveLogo(template.logo_url);
      setLogoPreview(template.logo_url);
      onLogoChange(template.logo_url);
      toast.success('Логотип выбран из библиотеки');
      setIsLogoDialogOpen(false);
    } catch {
      toast.error('Не удалось сохранить логотип');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Можно загружать только изображения'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Размер не должен превышать 10 МБ'); return; }

    setUploadingLogo(true);
    try {
      toast.info('Сжатие изображения...');
      const compressed = await compressImage(file);
      await saveLogo(compressed);
      setLogoPreview(compressed);
      onLogoChange(compressed);
      toast.success('Логотип загружен');
      setIsLogoDialogOpen(false);
    } catch {
      toast.error('Ошибка загрузки логотипа');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await saveLogo(null);
      setLogoPreview(null);
      onLogoChange(null);
      toast.success('Логотип удалён');
    } catch {
      toast.error('Не удалось удалить логотип');
    }
  };

  const categories = [...new Set(logoTemplates.map(t => t.category))].sort();

  return (
    <Card className="bg-slate-800/50 border-purple-600/30 p-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Информация о предприятии</h3>
        <div className="space-y-4 text-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>Тариф: <span className="font-semibold text-white">{organization.subscription_type}</span></div>
            <div>Пользователей: <span className="font-semibold text-white">{organization.user_count}</span></div>
          </div>

          <div className="border-t border-purple-600/30 pt-4">
            <h4 className="text-lg font-semibold text-white mb-3">Логотип предприятия</h4>
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="Логотип" className="w-32 h-32 object-contain rounded-lg border-2 border-yellow-600/30 bg-white/5" />
                  <Button size="sm" variant="destructive" onClick={handleDeleteLogo} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-yellow-600/30 rounded-lg bg-slate-700/30">
                  <Icon name="Image" size={32} className="text-slate-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-3">Логотип отображается на странице входа. Рекомендуемый размер: 256×256px</p>
                <Button
                  type="button"
                  size="sm"
                  disabled={uploadingLogo}
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setActiveTab('library'); setIsLogoDialogOpen(true); }}
                >
                  <Icon name={uploadingLogo ? "Loader2" : "Upload"} size={16} className={`mr-2 ${uploadingLogo ? 'animate-spin' : ''}`} />
                  {uploadingLogo ? 'Сохранение...' : logoPreview ? 'Изменить логотип' : 'Загрузить логотип'}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-purple-600/30 pt-4 mt-4">
            <h4 className="text-lg font-semibold text-white mb-3">Ссылки для входа и регистрации</h4>
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-yellow-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-yellow-400">Страница входа для сотрудников:</span>
                <Button size="sm" variant={copiedLink ? "outline" : "default"} onClick={() => copyToClipboard(`${window.location.origin}/org/${organization.registration_code}`, 'Ссылка для входа')} className="bg-blue-600 hover:bg-blue-700">
                  <Icon name={copiedLink ? "Check" : "Copy"} size={14} className="mr-1" />
                  {copiedLink ? 'Скопировано' : 'Копировать'}
                </Button>
              </div>
              <code className="text-xs text-blue-300 break-all">{window.location.origin}/org/{organization.registration_code}</code>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-green-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-400">Страница регистрации новых сотрудников:</span>
                <Button size="sm" onClick={() => copyToClipboard(`${window.location.origin}/register/${organization.registration_code}`, 'Ссылка для регистрации')} className="bg-green-600 hover:bg-green-700">
                  <Icon name="Copy" size={14} className="mr-1" />
                  Копировать
                </Button>
              </div>
              <code className="text-xs text-green-300 break-all">{window.location.origin}/register/{organization.registration_code}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Диалог выбора логотипа */}
      <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
        <DialogContent className="bg-slate-800 border-purple-600/30 text-white max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Выбор логотипа</DialogTitle>
          </DialogHeader>

          {/* Табы */}
          <div className="flex gap-2 border-b border-purple-600/30 pb-0">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'library' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              <Icon name="Images" size={16} className="inline mr-2" />
              Из библиотеки
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              <Icon name="Upload" size={16} className="inline mr-2" />
              Загрузить с ПК
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Таб: Библиотека */}
            {activeTab === 'library' && (
              <div>
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Icon name="Loader2" size={32} className="animate-spin text-purple-400" />
                  </div>
                ) : logoTemplates.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Icon name="Images" size={48} className="mx-auto mb-3 opacity-30" />
                    <p>Библиотека пуста</p>
                    <p className="text-sm mt-1">Добавьте логотипы в разделе Администрация → Библиотека логотипов</p>
                  </div>
                ) : (
                  categories.map(category => (
                    <div key={category} className="mb-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{category}</p>
                      <div className="grid grid-cols-4 gap-3">
                        {logoTemplates.filter(t => t.category === category).map(template => (
                          <div
                            key={template.id}
                            onClick={() => !uploadingLogo && handleSelectFromLibrary(template)}
                            className="cursor-pointer p-2 rounded-lg border-2 border-purple-600/30 bg-slate-700/30 hover:border-blue-500 hover:bg-blue-600/10 transition-all"
                          >
                            <div className="aspect-square flex items-center justify-center bg-white/5 rounded mb-1">
                              <img src={template.logo_url} alt={template.name} className="w-full h-full object-contain p-1" />
                            </div>
                            <p className="text-xs text-gray-300 text-center truncate">{template.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Таб: Загрузка с ПК */}
            {activeTab === 'upload' && (
              <div>
                <p className="text-sm text-gray-400 mb-4">PNG, JPG, SVG до 10 МБ. Изображение будет сжато до 800×800px.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                  id="logo-upload-org"
                />
                <div
                  onClick={() => !uploadingLogo && document.getElementById('logo-upload-org')?.click()}
                  className="border-2 border-dashed border-purple-600/30 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-600/5 transition-colors"
                >
                  {uploadingLogo ? (
                    <>
                      <Icon name="Loader2" size={48} className="mx-auto text-purple-400 mb-3 animate-spin" />
                      <p className="text-white">Загрузка...</p>
                    </>
                  ) : (
                    <>
                      <Icon name="Upload" size={48} className="mx-auto text-purple-400 mb-3" />
                      <p className="text-white mb-1">Нажмите для выбора файла</p>
                      <p className="text-sm text-gray-400">или перетащите изображение сюда</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
