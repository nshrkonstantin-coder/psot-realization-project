import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface LogoTemplate {
  id: number;
  name: string;
  category: string;
  logo_url: string;
  preview_url: string;
  is_active: boolean;
  created_at: string;
}

const LogoLibraryPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [templates, setTemplates] = useState<LogoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: '' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = ['Промышленность', 'Строительство', 'Добыча', 'Офис', 'Транспорт', 'Энергетика', 'Другое'];

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
    
    loadTemplates();
  }, [navigate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://functions.poehali.dev/d5352f1d-bdec-44b8-b0b5-34901c6a3245');
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      toast.error('Не удалось загрузить шаблоны');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Размер изображения не должен превышать 5 МБ');
      return;
    }

    setUploadingLogo(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoPreview(base64);
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка загрузки логотипа');
      setUploadingLogo(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name || !newTemplate.category) {
      toast.error('Заполните все поля');
      return;
    }

    if (!logoPreview) {
      toast.error('Загрузите логотип');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('https://functions.poehali.dev/d5352f1d-bdec-44b8-b0b5-34901c6a3245', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name,
          category: newTemplate.category,
          logo_url: logoPreview,
          preview_url: logoPreview
        })
      });

      if (!response.ok) throw new Error('Failed to add');

      toast.success('Шаблон добавлен');
      setIsAddDialogOpen(false);
      setNewTemplate({ name: '', category: '' });
      setLogoPreview(null);
      loadTemplates();
    } catch (error) {
      toast.error('Не удалось добавить шаблон');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Удалить этот шаблон?')) return;

    try {
      const response = await fetch('https://functions.poehali.dev/d5352f1d-bdec-44b8-b0b5-34901c6a3245', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Шаблон удален');
      loadTemplates();
    } catch (error) {
      toast.error('Не удалось удалить шаблон');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, LogoTemplate[]>);

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

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-xl shadow-lg">
              <Icon name="Image" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Библиотека логотипов</h1>
              <p className="text-purple-400">Управление шаблонами логотипов для предприятий</p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-700"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Добавить логотип
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <Card key={category} className="bg-slate-800/50 border-purple-600/30 p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Icon name="Folder" size={24} className="text-purple-400" />
                {category}
                <span className="text-sm font-normal text-gray-400">({categoryTemplates.length})</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {categoryTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group relative bg-slate-700/50 p-4 rounded-lg border border-purple-600/30 hover:border-purple-600 transition-all"
                  >
                    <div className="aspect-square flex items-center justify-center mb-3 bg-white/5 rounded-lg overflow-hidden">
                      <img 
                        src={template.preview_url} 
                        alt={template.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm text-white text-center truncate mb-2">{template.name}</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="Trash2" size={14} className="mr-1" />
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-slate-800 border-purple-600/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Добавить новый шаблон логотипа</DialogTitle>
            <DialogDescription className="text-slate-400">
              Загрузите изображение и укажите информацию о шаблоне
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name" className="text-white">Название шаблона</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Например: Нефтедобыча - Вышка"
                className="bg-slate-700/50 border-purple-600/30 text-white"
              />
            </div>

            <div>
              <Label htmlFor="template-category" className="text-white">Категория</Label>
              <select
                id="template-category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-600/30 text-white rounded-md px-3 py-2"
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-white mb-2 block">Логотип</Label>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img 
                      src={logoPreview} 
                      alt="Preview" 
                      className="w-32 h-32 object-contain rounded-lg border-2 border-purple-600/30 bg-white/5"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setLogoPreview(null)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-green-400 mb-2">✓ Логотип загружен</p>
                    <label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="*/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        as="span"
                        className="cursor-pointer"
                      >
                        <Icon name="Upload" size={16} className="mr-2" />
                        Изменить
                      </Button>
                    </label>
                  </div>
                </div>
              ) : (
                <label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-purple-600/30 rounded-lg p-8 text-center cursor-pointer hover:border-purple-600 transition-colors bg-slate-700/30">
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
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewTemplate({ name: '', category: '' });
                setLogoPreview(null);
              }}
              className="border-slate-600 text-slate-300"
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddTemplate}
              disabled={saving || uploadingLogo}
              className="bg-gradient-to-r from-green-600 to-emerald-700"
            >
              {saving ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Check" size={20} className="mr-2" />
                  Добавить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogoLibraryPage;