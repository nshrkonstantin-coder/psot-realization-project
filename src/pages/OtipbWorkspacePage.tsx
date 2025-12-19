import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const OtipbWorkspacePage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName') || 'Коллега';
    setUserName(storedUserName);

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
    navigate('/otipb-department');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/otipb-department')}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-xl shadow-lg">
              <Icon name="Briefcase" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Рабочий стол специалиста</h1>
              <p className="text-slate-400 text-sm mt-1">Добро пожаловать, {userName}!</p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-blue-500/30 p-12">
          <div className="flex flex-col items-center justify-center text-center gap-6">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-8 rounded-full shadow-xl animate-pulse">
              <Icon name="Construction" size={64} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Страница в разработке</h2>
              <p className="text-slate-400 text-lg max-w-2xl">
                Рабочий стол специалиста ОТиПБ находится в стадии активной разработки. 
                Скоро здесь появятся инструменты для эффективной работы с документами, 
                отчетами и управления задачами по охране труда и промышленной безопасности.
              </p>
            </div>
            <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center gap-3 text-blue-400">
                <Icon name="Info" size={24} />
                <p className="text-sm">
                  Следите за обновлениями. Новый функционал будет добавлен в ближайшее время.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OtipbWorkspacePage;
