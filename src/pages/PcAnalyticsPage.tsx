import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

export default function PcAnalyticsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Icon name="ArrowLeft" size={20} />
            Назад
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Аналитика Производственного Контроля</h1>
          <div className="w-24" />
        </div>

        <Card className="p-12 text-center border-emerald-200 shadow-lg">
          <div className="flex flex-col items-center gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl">
              <Icon name="BarChart2" size={64} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Страница в разработке
            </h2>
            <p className="text-gray-600 max-w-md">
              Здесь будет отображаться аналитика по производственному контролю: 
              статистика нарушений, динамика по периодам, топ нарушителей и другие метрики.
            </p>
            <Button
              onClick={() => navigate('/pc-list')}
              className="bg-emerald-600 hover:bg-emerald-700 mt-4"
            >
              <Icon name="List" size={18} className="mr-2" />
              Перейти к списку ПК
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
