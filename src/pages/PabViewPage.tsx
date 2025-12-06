import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Observation {
  observation_number: number;
  description: string;
  category: string;
  conditions_actions: string;
  hazard_factors: string;
  measures: string;
  responsible_person: string;
  deadline: string;
}

interface PabDetail {
  id: number;
  doc_number: string;
  doc_date: string;
  inspector_fio: string;
  inspector_position: string;
  department: string;
  location: string;
  checked_object: string;
  status: string;
  observations: Observation[];
}

export default function PabViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pab, setPab] = useState<PabDetail | null>(null);

  useEffect(() => {
    if (id) {
      loadPab(id);
    }
  }, [id]);

  const loadPab = async (pabId: string) => {
    try {
      const response = await fetch(`https://functions.poehali.dev/ec299a8d-481e-470f-8487-4a1ca230b284?id=${pabId}`);
      const data = await response.json();
      setPab(data.pab);
    } catch (error) {
      console.error('Error loading PAB:', error);
      toast.error('Ошибка загрузки ПАБ');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  if (!pab) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">ПАБ не найден</p>
          <Button onClick={() => navigate('/pab-list')}>
            Вернуться к списку
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/pab-list')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Icon name="ArrowLeft" size={20} />
            Назад к списку
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{pab.doc_number}</h1>
          <div className="w-24" />
        </div>

        <Card className="p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Информация о проверке</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div>
              <span className="font-semibold">Дата:</span> {formatDate(pab.doc_date)}
            </div>
            <div>
              <span className="font-semibold">Проверяющий:</span> {pab.inspector_fio}
            </div>
            <div>
              <span className="font-semibold">Должность:</span> {pab.inspector_position}
            </div>
            <div>
              <span className="font-semibold">Подразделение:</span> {pab.department}
            </div>
            <div>
              <span className="font-semibold">Участок:</span> {pab.location}
            </div>
            <div>
              <span className="font-semibold">Объект:</span> {pab.checked_object}
            </div>
          </div>
        </Card>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Наблюдения</h2>
        {pab.observations.map((obs) => (
          <Card key={obs.observation_number} className="p-6 mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Наблюдение №{obs.observation_number}
            </h3>
            <div className="space-y-3 text-gray-700">
              <div>
                <span className="font-semibold">Описание:</span>
                <p className="mt-1">{obs.description}</p>
              </div>
              <div>
                <span className="font-semibold">Категория:</span> {obs.category}
              </div>
              <div>
                <span className="font-semibold">Вид условий и действий:</span> {obs.conditions_actions}
              </div>
              <div>
                <span className="font-semibold">Опасные факторы:</span> {obs.hazard_factors}
              </div>
              <div>
                <span className="font-semibold">Мероприятия:</span>
                <p className="mt-1">{obs.measures}</p>
              </div>
              <div>
                <span className="font-semibold">Ответственный:</span> {obs.responsible_person}
              </div>
              <div>
                <span className="font-semibold">Срок:</span> {formatDate(obs.deadline)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}