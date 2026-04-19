import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface DictionaryItem {
  id: number;
  name: string;
}

interface Dictionaries {
  categories: DictionaryItem[];
  conditions: DictionaryItem[];
  hazards: DictionaryItem[];
}

type DictionaryType = 'category' | 'condition' | 'hazard';

export default function PabDictionariesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dictionaries, setDictionaries] = useState<Dictionaries>({
    categories: [],
    conditions: [],
    hazards: []
  });
  
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<DictionaryType>('category');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      navigate('/');
      return;
    }
    
    if (role !== 'superadmin' && role !== 'admin') {
      if (role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      return;
    }
    
    loadDictionaries();
  }, [navigate]);

  const loadDictionaries = async () => {
    try {
      const response = await apiFetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setDictionaries(data);
    } catch (error) {
      toast.error('Не удалось загрузить справочники');
      console.error(error);
    }
  };

  const openAddDialog = (type: DictionaryType) => {
    setDialogType(type);
    setNewItemName('');
    setEditingItem(null);
    setShowDialog(true);
  };

  const openEditDialog = (type: DictionaryType, item: DictionaryItem) => {
    setDialogType(type);
    setNewItemName(item.name);
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleSaveItem = async () => {
    if (!newItemName.trim()) {
      toast.error('Введите название');
      return;
    }

    setLoading(true);

    try {
      if (editingItem) {
        const response = await apiFetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960', {
          method: 'PUT',
          body: JSON.stringify({
            type: dialogType,
            id: editingItem.id,
            name: newItemName
          })
        });

        if (!response.ok) throw new Error('Ошибка редактирования');

        toast.success('Элемент обновлён');
      } else {
        const response = await apiFetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960', {
          method: 'POST',
          body: JSON.stringify({
            type: dialogType,
            name: newItemName
          })
        });

        if (!response.ok) throw new Error('Ошибка добавления');

        toast.success('Элемент добавлен');
      }
      
      setShowDialog(false);
      loadDictionaries();
    } catch (error) {
      toast.error(editingItem ? 'Не удалось обновить элемент' : 'Не удалось добавить элемент');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (type: DictionaryType, id: number) => {
    if (!confirm('Удалить этот элемент?')) return;

    setLoading(true);

    try {
      const response = await apiFetch(`https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960?type=${type}&id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      toast.success('Элемент удалён');
      loadDictionaries();
    } catch (error) {
      toast.error('Не удалось удалить элемент');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getDictionaryTitle = (type: DictionaryType) => {
    switch (type) {
      case 'category': return 'Категории наблюдений';
      case 'condition': return 'Виды условий и действий';
      case 'hazard': return 'Опасные факторы';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => {
            const role = localStorage.getItem('userRole');
            if (role === 'superadmin') {
              navigate('/superadmin');
            } else if (role === 'admin') {
              navigate('/admin');
            } else {
              navigate('/dashboard');
            }
          }}>
            <Icon name="ArrowLeft" className="mr-2" size={20} />
            Назад
          </Button>
          <h1 className="text-3xl font-bold">Управление регистрацией ПАБ</h1>
          <div className="w-32"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Категории наблюдений */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Категории наблюдений</h2>
              <Button size="sm" onClick={() => openAddDialog('category')}>
                <Icon name="Plus" size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              {dictionaries.categories.map((item) => (
                <div key={item.id} className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => openEditDialog('category', item)}
                      disabled={loading}
                    >
                      <Icon name="Pencil" size={16} className="text-blue-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteItem('category', item.id)}
                      disabled={loading}
                    >
                      <Icon name="Trash2" size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Виды условий */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Виды условий и действий</h2>
              <Button size="sm" onClick={() => openAddDialog('condition')}>
                <Icon name="Plus" size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              {dictionaries.conditions.map((item) => (
                <div key={item.id} className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => openEditDialog('condition', item)}
                      disabled={loading}
                    >
                      <Icon name="Pencil" size={16} className="text-blue-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteItem('condition', item.id)}
                      disabled={loading}
                    >
                      <Icon name="Trash2" size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Опасные факторы */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Опасные факторы</h2>
              <Button size="sm" onClick={() => openAddDialog('hazard')}>
                <Icon name="Plus" size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              {dictionaries.hazards.map((item) => (
                <div key={item.id} className="p-3 bg-red-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => openEditDialog('hazard', item)}
                      disabled={loading}
                    >
                      <Icon name="Pencil" size={16} className="text-blue-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteItem('hazard', item.id)}
                      disabled={loading}
                    >
                      <Icon name="Trash2" size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mt-6 p-6 bg-blue-50">
          <h3 className="font-semibold mb-2">Инструкция:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Нажмите кнопку "+" чтобы добавить новый элемент в справочник</li>
            <li>Нажмите кнопку с карандашом чтобы редактировать элемент</li>
            <li>Нажмите кнопку с корзиной чтобы удалить элемент</li>
            <li>Все добавленные элементы появятся в выпадающих списках при регистрации ПАБ</li>
            <li>Изменения сразу доступны всем пользователям</li>
          </ul>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Редактировать' : 'Добавить в'} "{getDictionaryTitle(dialogType)}"</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label>Название</Label>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Введите название..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveItem} disabled={loading}>
              {loading ? (
                editingItem ? 'Сохранение...' : 'Добавление...'
              ) : (
                editingItem ? 'Сохранить' : 'Добавить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}