import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const OtipbDepartmentPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    const department = localStorage.getItem('userDepartment');
    setHasAccess(department === 'ОТиПБ' || department === 'Отдел ОТиПБ');
  }, [navigate]);

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              onClick={() => navigate('/additional')}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-red-600 to-orange-600 p-3 rounded-xl shadow-lg">
                <Icon name="ShieldAlert" size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
            </div>
          </div>

          <Card className="bg-slate-800/50 border-red-500/30 p-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-600 to-orange-600 p-6 rounded-2xl shadow-lg inline-block mb-6">
                <Icon name="ShieldX" size={64} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Доступ запрещён</h2>
              <p className="text-slate-400 text-lg">У вас нет допуска на страницу отдела ОТиПБ</p>
              <p className="text-slate-500 text-sm mt-4">Данная страница доступна только сотрудникам подразделения ОТиПБ</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/additional')}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-red-600 to-orange-600 p-3 rounded-xl shadow-lg">
              <Icon name="ShieldAlert" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Отдел ОТиПБ</h1>
              <p className="text-slate-400 text-sm mt-1">Охрана труда и промышленная безопасность</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <Card
            onClick={() => navigate('/otipb-additional-directions')}
            className="group relative overflow-hidden cursor-pointer bg-slate-800/50 border-red-500/30 hover:border-red-500 transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-orange-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            
            <div className="p-8 relative z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="bg-gradient-to-br from-red-600 to-orange-600 p-6 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform">
                  <Icon name="Layers" size={40} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors mb-2">
                    Дополнительные направления
                  </h3>
                  <p className="text-sm text-slate-400">Инструктажи, проверки, происшествия, СИЗ, документы, аналитика</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OtipbDepartmentPage;