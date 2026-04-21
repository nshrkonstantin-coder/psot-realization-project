import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface PointsManagementSectionProps {
  organizationId: string;
  pointsBalance: number;
  pointsEnabled: boolean;
  onPointsBalanceChange: (newBalance: number) => void;
  onPointsEnabledChange: (enabled: boolean) => void;
}

export const PointsManagementSection = ({
  organizationId,
  pointsBalance,
  pointsEnabled,
  onPointsBalanceChange,
  onPointsEnabledChange
}: PointsManagementSectionProps) => {
  const navigate = useNavigate();
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [showPointsHistory, setShowPointsHistory] = useState(false);

  const togglePoints = async () => {
    try {
      const newState = !pointsEnabled;
      const response = await fetch('https://functions.poehali.dev/1e66556d-e508-403d-aced-20637779242a', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: organizationId, is_enabled: newState })
      });

      if (response.ok) {
        onPointsEnabledChange(newState);
        toast.success(newState ? 'Система баллов включена' : 'Система баллов выключена');
      } else {
        toast.error('Не удалось изменить настройки');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка изменения настроек');
    }
  };

  const addPoints = async () => {
    const amount = prompt('Введите количество баллов для начисления:');
    if (!amount || isNaN(Number(amount))) return;

    try {
      const response = await fetch('https://functions.poehali.dev/1e66556d-e508-403d-aced-20637779242a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: organizationId,
          points_amount: parseFloat(amount),
          operation_type: 'admin_add',
          description: 'Начисление администратором'
        })
      });

      if (response.ok) {
        const data = await response.json();
        onPointsBalanceChange(data.new_balance);
        toast.success('Баллы начислены');
      } else {
        toast.error('Не удалось начислить баллы');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка начисления баллов');
    }
  };

  const loadPointsHistory = async () => {
    try {
      const response = await fetch(`https://functions.poehali.dev/1e66556d-e508-403d-aced-20637779242a?org_id=${organizationId}&history=true`);
      if (response.ok) {
        const data = await response.json();
        setPointsHistory(data);
        setShowPointsHistory(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Не удалось загрузить историю');
    }
  };

  return (
    <div className="border-t border-purple-600/30 pt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white">Система баллов</h4>
          <p className="text-sm text-gray-400">Начисление и использование баллов для оплаты</p>
        </div>
        <Button
          onClick={togglePoints}
          variant={pointsEnabled ? "default" : "outline"}
          className={pointsEnabled ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <Icon name={pointsEnabled ? "Check" : "X"} size={16} className="mr-2" />
          {pointsEnabled ? 'Включено' : 'Выключено'}
        </Button>
      </div>

      {pointsEnabled && (
        <div className="bg-gradient-to-r from-orange-600/20 to-amber-700/20 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-400">Баланс баллов</p>
              <p className="text-3xl font-bold text-white">{pointsBalance.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => navigate(`/points-rules/${organizationId}`)} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Icon name="Settings" size={16} className="mr-2" />
                Правила
              </Button>
              <Button size="sm" onClick={addPoints} className="bg-green-600 hover:bg-green-700">
                <Icon name="Plus" size={16} className="mr-2" />
                Начислить
              </Button>
              <Button size="sm" variant="outline" onClick={loadPointsHistory}>
                <Icon name="History" size={16} className="mr-2" />
                История
              </Button>
            </div>
          </div>

          {showPointsHistory && pointsHistory.length > 0 && (
            <div className="border-t border-orange-600/30 pt-3 mt-3">
              <h5 className="text-sm font-semibold text-white mb-2">Последние операции</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pointsHistory.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm bg-slate-700/30 p-2 rounded">
                    <span className="text-gray-300">{item.description}</span>
                    <span className={item.points_amount > 0 ? "text-green-400" : "text-red-400"}>
                      {item.points_amount > 0 ? '+' : ''}{item.points_amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};