import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const KBTReportsPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/kbt')}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Icon name="BarChart3" size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Отчеты по КБТ</h1>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-purple-500/30 p-12">
          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg inline-block mb-6">
              <Icon name="Construction" size={64} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Страница в разработке</h2>
            <p className="text-slate-400">Данный раздел находится в процессе разработки и скоро будет доступен</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default KBTReportsPage;
