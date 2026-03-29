import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import FUNC_URLS from '../../backend/func2url.json';

interface Module {
  id: number;
  name: string;
  display_name: string;
  description: string;
  route_path: string;
  icon: string;
  category: string;
  is_active?: boolean;
}

interface TariffPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  is_default: boolean;
  module_count?: number;
  modules?: Module[];
}

const CATEGORY_NAMES: Record<string, string> = {
  main: 'Основные',
  logistics: 'Логистика',
  production: 'Производство',
  hr: 'Персонал',
  analytics: 'Аналитика',
  system: 'Системные',
  pab: 'ПАБ',
  storage: 'Хранилище',
  users: 'Пользователи',
  other: 'Другие',
  custom: 'Пользовательские',
};

const CATEGORIES = Object.entries(CATEGORY_NAMES).map(([value, label]) => ({ value, label }));

const ICONS = [
  'Package', 'BarChart2', 'Truck', 'Factory', 'Users', 'ShieldCheck',
  'FolderOpen', 'FileText', 'Settings', 'ClipboardList', 'Database',
  'Activity', 'Bell', 'BookOpen', 'Layers', 'Map', 'Star', 'Zap'
];

export default function TariffManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tariffs' | 'modules'>('tariffs');

  // Тарифы
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<TariffPlan | null>(null);
  const [isCreatingTariff, setIsCreatingTariff] = useState(false);
  const [loadingTariffs, setLoadingTariffs] = useState(true);
  const [savingTariff, setSavingTariff] = useState(false);
  const [tariffForm, setTariffForm] = useState({ name: '', description: '', price: 0, module_ids: [] as number[] });

  // Модули
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const [deletingModuleId, setDeletingModuleId] = useState<number | null>(null);
  const [moduleForm, setModuleForm] = useState({
    name: '', display_name: '', description: '', route_path: '', icon: 'Package', category: 'other'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoadingTariffs(true);
    try {
      const [tariffsRes, modulesRes] = await Promise.all([
        fetch(FUNC_URLS.tariffs),
        fetch(FUNC_URLS.modules)
      ]);
      setTariffs(await tariffsRes.json());
      setAllModules(await modulesRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTariffs(false);
    }
  };

  // ── Тарифы ──────────────────────────────────────────────
  const loadTariffDetails = async (tariffId: number) => {
    try {
      const res = await fetch(`${FUNC_URLS.tariffs}?id=${tariffId}`);
      const data = await res.json();
      setSelectedTariff(data);
      setIsCreatingTariff(false);
      setTariffForm({
        name: data.name,
        description: data.description || '',
        price: data.price,
        module_ids: data.modules?.map((m: Module) => m.id) || []
      });
    } catch (e) { console.error(e); }
  };

  const handleSaveTariff = async () => {
    setSavingTariff(true);
    try {
      const method = isCreatingTariff ? 'POST' : 'PUT';
      const body = isCreatingTariff ? tariffForm : { id: selectedTariff?.id, ...tariffForm };
      const res = await fetch(FUNC_URLS.tariffs, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await loadData();
        setIsCreatingTariff(false);
        setSelectedTariff(null);
        setTariffForm({ name: '', description: '', price: 0, module_ids: [] });
      }
    } catch (e) { console.error(e); } finally { setSavingTariff(false); }
  };

  const toggleModule = (moduleId: number) => {
    setTariffForm(prev => ({
      ...prev,
      module_ids: prev.module_ids.includes(moduleId)
        ? prev.module_ids.filter(id => id !== moduleId)
        : [...prev.module_ids, moduleId]
    }));
  };

  // ── Модули ──────────────────────────────────────────────
  const handleSaveModule = async () => {
    setSavingModule(true);
    try {
      const method = isCreatingModule ? 'POST' : 'PUT';
      const body = isCreatingModule ? moduleForm : { id: selectedModule?.id, ...moduleForm };
      const res = await fetch(FUNC_URLS.modules, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await loadData();
        setIsCreatingModule(false);
        setSelectedModule(null);
        setModuleForm({ name: '', display_name: '', description: '', route_path: '', icon: 'Package', category: 'other' });
      }
    } catch (e) { console.error(e); } finally { setSavingModule(false); }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!confirm('Удалить этот модуль? Он будет убран из всех тарифов.')) return;
    setDeletingModuleId(moduleId);
    try {
      await fetch(`${FUNC_URLS.modules}?id=${moduleId}`, { method: 'DELETE' });
      await loadData();
      if (selectedModule?.id === moduleId) setSelectedModule(null);
    } catch (e) { console.error(e); } finally { setDeletingModuleId(null); }
  };

  const openEditModule = (mod: Module) => {
    setSelectedModule(mod);
    setIsCreatingModule(false);
    setModuleForm({
      name: mod.name,
      display_name: mod.display_name,
      description: mod.description || '',
      route_path: mod.route_path || '',
      icon: mod.icon || 'Package',
      category: mod.category || 'other'
    });
  };

  const groupedModules = allModules.reduce((acc, mod) => {
    const cat = mod.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(mod);
    return acc;
  }, {} as Record<string, Module[]>);

  if (loadingTariffs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Icon name="Loader2" size={48} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/superadmin')} className="text-purple-400">
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Управление тарифами и модулями</h1>
              <p className="text-gray-400">Настройка для предприятий</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-800/50 p-1 rounded-xl border border-purple-600/20 w-fit">
          <button
            onClick={() => setActiveTab('tariffs')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'tariffs'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon name="CreditCard" size={16} className="inline mr-2" />
            Тарифные планы ({tariffs.length})
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'modules'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon name="Package" size={16} className="inline mr-2" />
            Модули ({allModules.length})
          </button>
        </div>

        {/* ═══════════════ ТАРИФЫ ═══════════════ */}
        {activeTab === 'tariffs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Тарифные планы</h2>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsCreatingTariff(true);
                    setSelectedTariff(null);
                    setTariffForm({ name: '', description: '', price: 0, module_ids: [] });
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Icon name="Plus" size={16} className="mr-1" />
                  Создать
                </Button>
              </div>
              {tariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  onClick={() => loadTariffDetails(tariff.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTariff?.id === tariff.id
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-purple-600/30 bg-slate-700/30 hover:border-purple-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-white">{tariff.name}</h3>
                    {tariff.is_default && (
                      <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded">По умолчанию</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{tariff.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400 font-semibold">
                      {tariff.price === 0 ? 'Бесплатно' : `${tariff.price} ₽/мес`}
                    </span>
                    <span className="text-gray-400">{tariff.module_count} модулей</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2">
              {(selectedTariff || isCreatingTariff) ? (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-600/30">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {isCreatingTariff ? 'Создание тарифного плана' : `Редактирование: ${selectedTariff?.name}`}
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <Label className="text-white mb-1 block">Название</Label>
                      <Input value={tariffForm.name} onChange={e => setTariffForm({ ...tariffForm, name: e.target.value })}
                        className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Базовый" />
                    </div>
                    <div>
                      <Label className="text-white mb-1 block">Описание</Label>
                      <Textarea value={tariffForm.description} onChange={e => setTariffForm({ ...tariffForm, description: e.target.value })}
                        className="bg-slate-700/50 border-purple-600/30 text-white" rows={2} />
                    </div>
                    <div>
                      <Label className="text-white mb-1 block">Стоимость (₽/мес)</Label>
                      <Input type="number" value={tariffForm.price}
                        onChange={e => setTariffForm({ ...tariffForm, price: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700/50 border-purple-600/30 text-white" />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">
                        Модули в тарифе ({tariffForm.module_ids.length} из {allModules.length})
                      </Label>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {Object.entries(groupedModules).map(([cat, mods]) => (
                          <div key={cat}>
                            <p className="text-xs font-semibold text-purple-400 mb-1">{CATEGORY_NAMES[cat] || cat}</p>
                            <div className="space-y-1">
                              {mods.map(mod => (
                                <div key={mod.id} onClick={() => toggleModule(mod.id)}
                                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                                    tariffForm.module_ids.includes(mod.id)
                                      ? 'border-blue-500 bg-blue-600/20'
                                      : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500'
                                  }`}>
                                  <Icon name={tariffForm.module_ids.includes(mod.id) ? 'CheckCircle2' : 'Circle'} size={18}
                                    className={tariffForm.module_ids.includes(mod.id) ? 'text-blue-400' : 'text-gray-500'} />
                                  <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{mod.display_name}</p>
                                    {mod.description && <p className="text-xs text-gray-400">{mod.description}</p>}
                                  </div>
                                  <Icon name={mod.icon} size={18} className="text-purple-400" fallback="Package" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleSaveTariff} disabled={savingTariff || !tariffForm.name} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {savingTariff ? <><Icon name="Loader2" size={18} className="mr-2 animate-spin" />Сохранение...</> : <><Icon name="Save" size={18} className="mr-2" />{isCreatingTariff ? 'Создать тариф' : 'Сохранить'}</>}
                      </Button>
                      <Button variant="outline" className="border-purple-600/30 text-gray-300"
                        onClick={() => { setIsCreatingTariff(false); setSelectedTariff(null); }}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl border border-purple-600/30 flex flex-col items-center justify-center text-center min-h-[400px]">
                  <Icon name="CreditCard" size={56} className="text-purple-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Выберите тариф</h3>
                  <p className="text-gray-400 text-sm">или создайте новый тарифный план</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ МОДУЛИ ═══════════════ */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Список модулей</h2>
                <Button size="sm" onClick={() => {
                    setIsCreatingModule(true);
                    setSelectedModule(null);
                    setModuleForm({ name: '', display_name: '', description: '', route_path: '', icon: 'Package', category: 'other' });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  <Icon name="Plus" size={16} className="mr-1" />
                  Создать
                </Button>
              </div>
              {allModules.map(mod => (
                <div key={mod.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedModule?.id === mod.id
                      ? 'border-emerald-500 bg-emerald-600/20'
                      : 'border-purple-600/30 bg-slate-700/30 hover:border-purple-600'
                  }`}>
                  <div className="flex items-center gap-3" onClick={() => openEditModule(mod)}>
                    <div className="bg-purple-600/30 p-2 rounded-lg">
                      <Icon name={mod.icon} size={20} className="text-purple-300" fallback="Package" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{mod.display_name}</p>
                      <p className="text-xs text-gray-400">{CATEGORY_NAMES[mod.category] || mod.category}</p>
                    </div>
                    <Button size="sm" variant="ghost"
                      onClick={e => { e.stopPropagation(); handleDeleteModule(mod.id); }}
                      disabled={deletingModuleId === mod.id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto">
                      <Icon name={deletingModuleId === mod.id ? 'Loader2' : 'Trash2'} size={15}
                        className={deletingModuleId === mod.id ? 'animate-spin' : ''} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2">
              {(selectedModule || isCreatingModule) ? (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-600/30">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {isCreatingModule ? 'Создание модуля' : `Редактирование: ${selectedModule?.display_name}`}
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white mb-1 block">Системное имя</Label>
                        <Input value={moduleForm.name} onChange={e => setModuleForm({ ...moduleForm, name: e.target.value })}
                          className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="my_module" />
                        <p className="text-xs text-gray-500 mt-1">Латиницей, без пробелов</p>
                      </div>
                      <div>
                        <Label className="text-white mb-1 block">Отображаемое название</Label>
                        <Input value={moduleForm.display_name} onChange={e => setModuleForm({ ...moduleForm, display_name: e.target.value })}
                          className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="Мой модуль" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-white mb-1 block">Описание</Label>
                      <Textarea value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
                        className="bg-slate-700/50 border-purple-600/30 text-white" rows={2} placeholder="Краткое описание модуля" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white mb-1 block">Путь маршрута</Label>
                        <Input value={moduleForm.route_path} onChange={e => setModuleForm({ ...moduleForm, route_path: e.target.value })}
                          className="bg-slate-700/50 border-purple-600/30 text-white" placeholder="/my-module" />
                      </div>
                      <div>
                        <Label className="text-white mb-1 block">Категория</Label>
                        <select value={moduleForm.category}
                          onChange={e => setModuleForm({ ...moduleForm, category: e.target.value })}
                          className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-purple-600/30 text-white text-sm">
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">Иконка: <span className="text-purple-400">{moduleForm.icon}</span></Label>
                      <div className="grid grid-cols-6 gap-2">
                        {ICONS.map(ic => (
                          <button key={ic} onClick={() => setModuleForm({ ...moduleForm, icon: ic })}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                              moduleForm.icon === ic ? 'border-emerald-500 bg-emerald-600/20' : 'border-slate-600/50 bg-slate-700/30 hover:border-purple-500'
                            }`}>
                            <Icon name={ic} size={22} className={moduleForm.icon === ic ? 'text-emerald-400' : 'text-gray-400'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleSaveModule} disabled={savingModule || !moduleForm.name || !moduleForm.display_name}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        {savingModule
                          ? <><Icon name="Loader2" size={18} className="mr-2 animate-spin" />Сохранение...</>
                          : <><Icon name="Save" size={18} className="mr-2" />{isCreatingModule ? 'Создать модуль' : 'Сохранить'}</>}
                      </Button>
                      <Button variant="outline" className="border-purple-600/30 text-gray-300"
                        onClick={() => { setIsCreatingModule(false); setSelectedModule(null); }}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl border border-purple-600/30 flex flex-col items-center justify-center text-center min-h-[400px]">
                  <Icon name="Package" size={56} className="text-purple-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Выберите модуль</h3>
                  <p className="text-gray-400 text-sm">или создайте новый</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}