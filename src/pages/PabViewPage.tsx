import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Observation {
  id: number;
  observation_number: number;
  description: string;
  category: string;
  conditions_actions: string;
  hazard_factors: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  status: 'new' | 'in_progress' | 'completed' | 'overdue';
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
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (id) {
      loadPab(id);
    }
    setUserRole(localStorage.getItem('userRole') || '');
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

  const updateObservationStatus = async (observationId: number, newStatus: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/226be57f-c09b-4429-9cc3-7def6c7317a0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation_id: observationId, status: newStatus })
      });
      
      if (response.ok) {
        toast.success('Статус обновлён');
        if (id) loadPab(id);
      } else {
        toast.error('Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getObservationStatusIndicator = (obs: Observation) => {
    const isOverdue = obs.deadline && new Date(obs.deadline) < new Date();
    
    if (obs.status === 'completed') {
      return <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg" />;
    }
    
    if (isOverdue || obs.status === 'overdue') {
      return (
        <div className="w-3 h-3 rounded-full bg-red-600 shadow-lg animate-pulse" 
             style={{ animation: 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      );
    }
    
    return <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg" />;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return { label: 'Новый', color: 'bg-blue-100 text-blue-800' };
      case 'in_progress':
        return { label: 'В работе', color: 'bg-yellow-100 text-yellow-800' };
      case 'completed':
        return { label: 'Выполнен', color: 'bg-green-100 text-green-800' };
      case 'overdue':
        return { label: 'Просрочен', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Новый', color: 'bg-gray-100 text-gray-800' };
    }
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

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const completedCount = pab.observations.filter(o => o.status === 'completed').length;
  const totalCount = pab.observations.length;

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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {pab.observations.map((obs, idx) => (
                <div key={idx} title={`Наблюдение ${obs.observation_number}`}>
                  {getObservationStatusIndicator(obs)}
                </div>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{pab.doc_number}</h1>
            <span className="text-sm text-gray-600">({completedCount}/{totalCount})</span>
          </div>
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
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getObservationStatusIndicator(obs)}
                <h3 className="text-xl font-bold text-gray-900">
                  Наблюдение №{obs.observation_number}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusLabel(obs.status).color}`}>
                  {getStatusLabel(obs.status).label}
                </span>
              </div>
              {isAdmin && (
                <Select
                  value={obs.status}
                  onValueChange={(value) => updateObservationStatus(obs.id, value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Изменить статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="completed">Выполнен</SelectItem>
                    <SelectItem value="overdue">Просрочен</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
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