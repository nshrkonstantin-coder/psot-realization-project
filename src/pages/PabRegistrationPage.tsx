import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function PabRegistrationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/pab-list')} className="mb-4">
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Назад к списку ПАБ
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Регистрация ПАБ</h1>
          <p className="text-gray-600 mt-2">Форма для регистрации будет загружена</p>
        </div>
      </div>
    </div>
  );
}
