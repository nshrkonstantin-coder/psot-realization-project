import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RequestSectionDialog from '@/components/RequestSectionDialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface SectionInfo {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const SECTIONS: Record<string, SectionInfo> = {
  '/orders': {
    title: 'Журнал поручений',
    description: 'Выдача поручений, контроль сроков и статусов исполнения',
    icon: 'BookOpen',
    color: 'from-red-500 to-red-600',
  },
  '/violations-stats': {
    title: 'Статистика нарушений',
    description: 'Наглядная аналитика нарушений по подразделениям и периодам',
    icon: 'BarChart3',
    color: 'from-blue-600 to-cyan-600',
  },
  '/otpb': {
    title: 'ОтПБ',
    description: 'Раздел отдела пожарной безопасности',
    icon: 'Flame',
    color: 'from-orange-500 to-red-600',
  },
  '/reports': {
    title: 'Сформировать отчёт',
    description: 'Автоматическое создание отчётных документов',
    icon: 'FileCheck',
    color: 'from-green-600 to-green-700',
  },
  '/asubt': {
    title: 'АСУБТ',
    description: 'Автоматизированная система управления безопасностью труда',
    icon: 'Mountain',
    color: 'from-blue-500 to-blue-600',
  },
};

const DEFAULT_SECTION: SectionInfo = {
  title: 'Раздел',
  description: 'Новый раздел системы',
  icon: 'Sparkles',
  color: 'from-yellow-500 to-orange-600',
};

const ComingSoonPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = SECTIONS[pathname] || DEFAULT_SECTION;
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <div className="relative inline-block mb-8">
          <div className={`bg-gradient-to-br ${section.color} p-8 rounded-3xl shadow-2xl`}>
            <Icon name={section.icon} size={64} className="text-white" />
          </div>
          <div className="absolute -top-3 -right-3 bg-yellow-500 text-slate-900 p-2 rounded-full shadow-lg">
            <Icon name="Sparkles" size={20} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3">{section.title}</h1>
        <p className="text-slate-400 mb-8">{section.description}</p>

        <div className="bg-slate-800/60 border border-yellow-600/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-yellow-500 font-semibold mb-2">
            <Icon name="Wrench" size={20} />
            Раздел в разработке
          </div>
          <p className="text-slate-300">
            Этот раздел будет разработан по запросу заказчика с учётом ваших задач и процессов предприятия.
          </p>
        </div>

        <Button
          onClick={() => setRequestOpen(true)}
          size="lg"
          className="mb-4 w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-slate-900 font-bold"
        >
          <Icon name="Send" size={18} className="mr-2" />
          Оставить заявку на разработку
        </Button>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-yellow-600/50 text-yellow-500 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-400"
          >
            <Icon name="LayoutDashboard" size={18} className="mr-2" />
            На главный экран
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-yellow-600/50 text-yellow-500 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-400"
          >
            <Icon name="ArrowLeft" size={18} className="mr-2" />
            Назад
          </Button>
        </div>
      </div>
      <RequestSectionDialog open={requestOpen} onOpenChange={setRequestOpen} sectionTitle={section.title} />
    </div>
  );
};

export default ComingSoonPage;