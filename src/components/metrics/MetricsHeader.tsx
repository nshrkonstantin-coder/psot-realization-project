import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface MetricsHeaderProps {
  userCompany: string;
}

export const MetricsHeader = ({ userCompany }: MetricsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 mb-8">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="outline"
        className="border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10"
      >
        <Icon name="ArrowLeft" size={20} className="mr-2" />
        Назад
      </Button>
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg">
          <Icon name="TrendingUp" size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Мои показатели</h1>
          {userCompany && (
            <p className="text-blue-400 font-semibold text-lg">{userCompany}</p>
          )}
        </div>
      </div>
    </div>
  );
};
