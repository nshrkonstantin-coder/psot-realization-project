import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface PointsRule {
  id: number;
  rule_name: string;
  action_type: string;
  points_amount: number;
  description: string;
  is_active: boolean;
  org_enabled: boolean;
  org_multiplier: number;
  org_rule_id?: number;
}

const PointsRulesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');

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
      const [rulesRes, orgRes] = await Promise.all([
        apiFetch(`https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca?org_id=${id}`),
        apiFetch(`https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?id=${id}`)
      ]);

      if (!rulesRes.ok || !orgRes.ok) throw new Error('Failed to load');

      const rulesData = await rulesRes.json();
      const orgData = await orgRes.json();

      setRules(rulesData);
      setOrgName(orgData.name);
    } catch (error) {
      toast.error('Не удалось загрузить данные');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: number, currentState: boolean) => {
    try {
      const response = await apiFetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
        method: 'PUT',
        body: JSON.stringify({
          org_id: id,
          rule_id: ruleId,
          is_enabled: !currentState,
          multiplier: rules.find(r => r.id === ruleId)?.org_multiplier || 1.0
        })
      });

      if (!response.ok) throw new Error('Failed to update');

      setRules(prev =>
        prev.map(r =>
          r.id === ruleId ? { ...r, org_enabled: !currentState } : r
        )
      );

      toast.success('Настройка сохранена');
    } catch (error) {
      toast.error('Ошибка сохранения');
      console.error(error);
    }
  };

  const updateMultiplier = async (ruleId: number, multiplier: number) => {
    if (multiplier < 0 || multiplier > 10) {
      toast.error('Множитель должен быть от 0 до 10');
      return;
    }

    try {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) return;

      const response = await apiFetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
        method: 'PUT',
        body: JSON.stringify({
          org_id: id,
          rule_id: ruleId,
          is_enabled: rule.org_enabled,
          multiplier: multiplier
        })
      });

      if (!response.ok) throw new Error('Failed to update');

      setRules(prev =>
        prev.map(r =>
          r.id === ruleId ? { ...r, org_multiplier: multiplier } : r
        )
      );

      toast.success('Множитель обновлен');
    } catch (error) {
      toast.error('Ошибка обновления');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const groupedRules = rules.reduce((acc, rule) => {
    const category = getCategoryName(rule.action_type);
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, PointsRule[]>);

  function getCategoryName(actionType: string): string {
    if (actionType.includes('user_')) return 'Действия пользователя';
    if (actionType.includes('pab_')) return 'Работа с ПАБ';
    if (actionType.includes('file_') || actionType.includes('folder_')) return 'Работа с файлами';
    if (actionType.includes('activity_')) return 'Достижения активности';
    if (actionType.includes('safety_')) return 'Безопасность';
    return 'Прочее';
  }

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
          <Button variant="ghost" onClick={() => navigate(`/organization-settings/${id}`)} className="text-purple-400">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад к настройкам
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
          <div className="bg-gradient-to-br from-orange-600 to-amber-700 p-3 rounded-xl shadow-lg">
            <Icon name="Star" size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Настройка начисления баллов</h1>
            <p className="text-purple-400">{orgName} — автоматические правила</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Card className="bg-slate-800/50 border-purple-600/30 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Icon name="Info" size={24} className="text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Как работает система</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Включите нужные правила для начисления баллов за действия пользователей</li>
                <li>• Множитель позволяет изменить базовое количество баллов (0.5 = половина, 2.0 = удвоение)</li>
                <li>• Баллы начисляются автоматически при совершении действий пользователями</li>
                <li>• В будущем накопленные баллы можно будет использовать для оплаты тарифов</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {Object.entries(groupedRules).map(([category, categoryRules]) => (
            <Card key={category} className="bg-slate-800/50 border-purple-600/30 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="Layers" size={24} className="text-purple-400" />
                {category}
              </h2>

              <div className="space-y-3">
                {categoryRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`bg-slate-700/30 p-4 rounded-lg border-2 transition-all ${
                      rule.org_enabled ? 'border-green-600/50' : 'border-slate-600/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Switch
                            checked={rule.org_enabled}
                            onCheckedChange={() => toggleRule(rule.id, rule.org_enabled)}
                          />
                          <h3 className="text-lg font-semibold text-white">{rule.rule_name}</h3>
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-mono">
                            {rule.action_type}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm ml-11">{rule.description}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Базовая сумма</p>
                          <p className="text-lg font-bold text-white">{rule.points_amount}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Множитель</p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMultiplier(rule.id, Math.max(0, rule.org_multiplier - 0.5))}
                              disabled={!rule.org_enabled}
                              className="h-8 w-8 p-0"
                            >
                              <Icon name="Minus" size={16} />
                            </Button>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={rule.org_multiplier}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  setRules(prev =>
                                    prev.map(r => r.id === rule.id ? { ...r, org_multiplier: val } : r)
                                  );
                                }
                              }}
                              onBlur={() => updateMultiplier(rule.id, rule.org_multiplier)}
                              disabled={!rule.org_enabled}
                              className="w-20 text-center bg-slate-700/50 border-purple-600/30 text-white"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMultiplier(rule.id, Math.min(10, rule.org_multiplier + 0.5))}
                              disabled={!rule.org_enabled}
                              className="h-8 w-8 p-0"
                            >
                              <Icon name="Plus" size={16} />
                            </Button>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Итого баллов</p>
                          <p className={`text-2xl font-bold ${rule.org_enabled ? 'text-green-400' : 'text-gray-500'}`}>
                            {(rule.points_amount * rule.org_multiplier).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PointsRulesPage;