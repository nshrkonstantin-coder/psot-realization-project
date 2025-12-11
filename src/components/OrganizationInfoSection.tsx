import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Organization {
  id: number;
  name: string;
  registration_code: string;
  user_count: number;
  subscription_type: string;
  logo_url: string | null;
}

interface OrganizationInfoSectionProps {
  organization: Organization;
  onLogoChange: (logoUrl: string | null) => void;
}

export const OrganizationInfoSection = ({ organization, onLogoChange }: OrganizationInfoSectionProps) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logo_url);

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
      
      setLogoPreview(compressedBase64);

      const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organization.id,
          logo_url: compressedBase64
        })
      });

      if (response.ok) {
        toast.success('Логотип загружен');
        onLogoChange(compressedBase64);
      } else {
        const errorText = await response.text();
        console.error('Ошибка сервера:', response.status, errorText);
        toast.error('Не удалось загрузить логотип');
        setLogoPreview(organization.logo_url);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Ошибка загрузки логотипа');
      setLogoPreview(organization.logo_url);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organization.id,
          logo_url: null
        })
      });

      if (response.ok) {
        toast.success('Логотип удален');
        setLogoPreview(null);
        onLogoChange(null);
      } else {
        toast.error('Не удалось удалить логотип');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка удаления логотипа');
    }
  };

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
                  <img 
                    src={logoPreview} 
                    alt="Логотип" 
                    className="w-32 h-32 object-contain rounded-lg border-2 border-yellow-600/30 bg-white/5"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteLogo}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-yellow-600/30 rounded-lg bg-slate-700/30">
                  <Icon name="Image" size={32} className="text-slate-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-3">
                  Логотип будет отображаться на странице входа предприятия. Рекомендуемый размер: 256x256px
                </p>
                <div>
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploadingLogo}
                      className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('logo-upload')?.click();
                      }}
                    >
                      <Icon name={uploadingLogo ? "Loader2" : "Upload"} size={16} className={`mr-2 ${uploadingLogo ? 'animate-spin' : ''}`} />
                      {uploadingLogo ? 'Загрузка...' : logoPreview ? 'Изменить логотип' : 'Загрузить логотип'}
                    </Button>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-purple-600/30 pt-4 mt-4">
            <h4 className="text-lg font-semibold text-white mb-3">Ссылки для входа и регистрации</h4>
            
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-yellow-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-yellow-400">Страница входа для сотрудников:</span>
                <Button
                  size="sm"
                  variant={copiedLink ? "outline" : "default"}
                  onClick={() => copyToClipboard(`${window.location.origin}/org/${organization.registration_code}`, 'Ссылка для входа')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Icon name={copiedLink ? "Check" : "Copy"} size={16} className="mr-2" />
                  {copiedLink ? 'Скопировано' : 'Копировать'}
                </Button>
              </div>
              <code className="text-sm text-gray-300 break-all">
                {window.location.origin}/org/{organization.registration_code}
              </code>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg border border-green-600/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-400">Ссылка для регистрации новых пользователей:</span>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(`${window.location.origin}/register?code=${organization.registration_code}`, 'Ссылка для регистрации')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Icon name="Copy" size={16} className="mr-2" />
                  Копировать
                </Button>
              </div>
              <code className="text-sm text-gray-300 break-all">
                {window.location.origin}/register?code={organization.registration_code}
              </code>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              💡 Отправьте эти ссылки сотрудникам предприятия "{organization.name}" для входа в систему АСУБТ
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};