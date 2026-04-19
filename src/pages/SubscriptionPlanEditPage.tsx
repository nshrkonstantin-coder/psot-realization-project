import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlanComponent {
  id?: number;
  component_type: string;
  component_name: string;
  price: number;
  is_included: boolean;
}

interface AvailableComponents {
  blocks: Array<{ name: string; default_price: number }>;
  pages: Array<{ name: string; default_price: number }>;
  buttons: Array<{ name: string; default_price: number }>;
  modules: Array<{ name: string; default_price: number }>;
}

interface PlanDetails {
  id: number;
  name: string;
  description: string;
  base_price: number;
  is_active: boolean;
  is_points_enabled: boolean;
  points_value: number;
  components: PlanComponent[];
}

const SubscriptionPlanEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [availableComponents, setAvailableComponents] = useState<AvailableComponents>({
    blocks: [],
    pages: [],
    buttons: [],
    modules: []
  });
  
  const [selectedComponents, setSelectedComponents] = useState<PlanComponent[]>([]);

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
  }, [id, navigate]);

  const loadData = async () => {
    try {
      const [planRes, componentsRes] = await Promise.all([
        apiFetch(`https://functions.poehali.dev/74e617c7-d1e0-48d6-a5a6-0d25d554958e?id=${id}`),
        apiFetch('https://functions.poehali.dev/48cabc8b-baa9-4c41-9f08-c1b32cf7ad84')
      ]);

      if (!planRes.ok || !componentsRes.ok) throw new Error('Failed to load');

      const planData = await planRes.json();
      const componentsData = await componentsRes.json();

      setPlan(planData);
      setAvailableComponents(componentsData);
      setSelectedComponents(planData.components || []);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;

    setSaving(true);
    try {
      const response = await apiFetch('https://functions.poehali.dev/74e617c7-d1e0-48d6-a5a6-0d25d554958e', {
        method: 'PUT',
        body: JSON.stringify({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          is_active: plan.is_active,
          is_points_enabled: plan.is_points_enabled,
          points_value: plan.points_value,
          components: selectedComponents
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success('Тариф сохранен');
      navigate('/subscription-plans');
    } catch (error) {
      toast.error('Ошибка сохранения');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleComponent = (type: string, name: string, defaultPrice: number) => {
    const existing = selectedComponents.find(
      (c) => c.component_type === type && c.component_name === name
    );

    if (existing) {
      setSelectedComponents(
        selectedComponents.map((c) =>
          c.component_type === type && c.component_name === name
            ? { ...c, is_included: !c.is_included }
            : c
        )
      );
    } else {
      setSelectedComponents([
        ...selectedComponents,
        {
          component_type: type,
          component_name: name,
          price: defaultPrice,
          is_included: true
        }
      ]);
    }
  };

  const updateComponentPrice = (type: string, name: string, newPrice: number) => {
    setSelectedComponents(
      selectedComponents.map((c) =>
        c.component_type === type && c.component_name === name
          ? { ...c, price: newPrice }
          : c
      )
    );
  };

  const isComponentIncluded = (type: string, name: string): boolean => {
    const comp = selectedComponents.find(
      (c) => c.component_type === type && c.component_name === name
    );
    return comp?.is_included || false;
  };

  const getComponentPrice = (type: string, name: string): number => {
    const comp = selectedComponents.find(
      (c) => c.component_type === type && c.component_name === name
    );
    return comp?.price || 0;
  };

  const calculateTotal = (): number => {
    return selectedComponents
      .filter((c) => c.is_included)
      .reduce((sum, c) => sum + c.price, 0);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-slate-800/50 border-purple-600/30">
          <p className="text-white">Тариф не найден</p>
          <Button onClick={() => navigate('/subscription-plans')} className="mt-4">
            Вернуться к списку
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/subscription-plans')} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            К списку тарифов
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

        <div className="mt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-3 rounded-xl shadow-lg">
              <Icon name="Settings" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Настройка тарифа: {plan.name}</h1>
              <p className="text-purple-400">Управление компонентами и ценами</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-slate-800/50 border-purple-600/30 p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Основные настройки</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white mb-2 block">Название тарифа</Label>
                    <Input
                      id="name"
                      value={plan.name}
                      onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                      className="bg-slate-700/50 border-purple-600/30 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-white mb-2 block">Описание</Label>
                    <Textarea
                      id="description"
                      value={plan.description || ''}
                      onChange={(e) => setPlan({ ...plan, description: e.target.value })}
                      className="bg-slate-700/50 border-purple-600/30 text-white"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active" className="text-white">Тариф активен</Label>
                    <Switch
                      id="is_active"
                      checked={plan.is_active}
                      onCheckedChange={(checked) => setPlan({ ...plan, is_active: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_points_enabled" className="text-white">Включить баллы</Label>
                    <Switch
                      id="is_points_enabled"
                      checked={plan.is_points_enabled}
                      onCheckedChange={(checked) => setPlan({ ...plan, is_points_enabled: checked })}
                    />
                  </div>

                  {plan.is_points_enabled && (
                    <div>
                      <Label htmlFor="points_value" className="text-white mb-2 block">Начисление баллов</Label>
                      <Input
                        id="points_value"
                        type="number"
                        value={plan.points_value}
                        onChange={(e) => setPlan({ ...plan, points_value: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700/50 border-purple-600/30 text-white"
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-slate-800/50 border-purple-600/30 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Компоненты тарифа</h2>

                <Tabs defaultValue="blocks" className="w-full">
                  <TabsList className="bg-slate-700/50 mb-4">
                    <TabsTrigger value="blocks">Блоки</TabsTrigger>
                    <TabsTrigger value="pages">Страницы</TabsTrigger>
                    <TabsTrigger value="buttons">Кнопки</TabsTrigger>
                    <TabsTrigger value="modules">Модули</TabsTrigger>
                  </TabsList>

                  <TabsContent value="blocks" className="space-y-2">
                    {availableComponents.blocks.map((item) => {
                      const included = isComponentIncluded('blocks', item.name);
                      const price = getComponentPrice('blocks', item.name) || item.default_price;
                      
                      return (
                        <div key={item.name} className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg">
                          <Switch
                            checked={included}
                            onCheckedChange={() => toggleComponent('blocks', item.name, item.default_price)}
                          />
                          <span className="flex-1 text-white">{item.name}</span>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) => updateComponentPrice('blocks', item.name, parseFloat(e.target.value) || 0)}
                            disabled={!included}
                            className="w-32 bg-slate-700/50 border-purple-600/30 text-white"
                          />
                          <span className="text-gray-400 w-8">₽</span>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="pages" className="space-y-2">
                    {availableComponents.pages.map((item) => {
                      const included = isComponentIncluded('pages', item.name);
                      const price = getComponentPrice('pages', item.name) || item.default_price;
                      
                      return (
                        <div key={item.name} className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg">
                          <Switch
                            checked={included}
                            onCheckedChange={() => toggleComponent('pages', item.name, item.default_price)}
                          />
                          <span className="flex-1 text-white">{item.name}</span>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) => updateComponentPrice('pages', item.name, parseFloat(e.target.value) || 0)}
                            disabled={!included}
                            className="w-32 bg-slate-700/50 border-purple-600/30 text-white"
                          />
                          <span className="text-gray-400 w-8">₽</span>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="buttons" className="space-y-2">
                    {availableComponents.buttons.map((item) => {
                      const included = isComponentIncluded('buttons', item.name);
                      const price = getComponentPrice('buttons', item.name) || item.default_price;
                      
                      return (
                        <div key={item.name} className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg">
                          <Switch
                            checked={included}
                            onCheckedChange={() => toggleComponent('buttons', item.name, item.default_price)}
                          />
                          <span className="flex-1 text-white">{item.name}</span>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) => updateComponentPrice('buttons', item.name, parseFloat(e.target.value) || 0)}
                            disabled={!included}
                            className="w-32 bg-slate-700/50 border-purple-600/30 text-white"
                          />
                          <span className="text-gray-400 w-8">₽</span>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="modules" className="space-y-2">
                    {availableComponents.modules.map((item) => {
                      const included = isComponentIncluded('modules', item.name);
                      const price = getComponentPrice('modules', item.name) || item.default_price;
                      
                      return (
                        <div key={item.name} className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg">
                          <Switch
                            checked={included}
                            onCheckedChange={() => toggleComponent('modules', item.name, item.default_price)}
                          />
                          <span className="flex-1 text-white">{item.name}</span>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) => updateComponentPrice('modules', item.name, parseFloat(e.target.value) || 0)}
                            disabled={!included}
                            className="w-32 bg-slate-700/50 border-purple-600/30 text-white"
                          />
                          <span className="text-gray-400 w-8">₽</span>
                        </div>
                      );
                    })}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            <div>
              <Card className="bg-slate-800/50 border-purple-600/30 p-6 sticky top-6">
                <h2 className="text-xl font-bold text-white mb-4">Итоговая стоимость</h2>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-600/20 to-indigo-700/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-400 mb-2">Компонентов включено</p>
                    <p className="text-3xl font-bold text-white">
                      {selectedComponents.filter((c) => c.is_included).length}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-700/20 p-4 rounded-lg">
                    <p className="text-sm text-green-400 mb-2">Общая цена тарифа</p>
                    <p className="text-3xl font-bold text-white">
                      {calculateTotal().toLocaleString()} ₽
                    </p>
                  </div>

                  {plan.is_points_enabled && (
                    <div className="bg-gradient-to-r from-orange-600/20 to-amber-700/20 p-4 rounded-lg">
                      <p className="text-sm text-orange-400 mb-2">Баллов начисляется</p>
                      <p className="text-3xl font-bold text-white">
                        {plan.points_value.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-lg py-6"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Icon name="Save" size={20} className="mr-2" />
                        Сохранить тариф
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlanEditPage;