import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  photo_file?: File | null;
}

interface Dictionaries {
  categories: Array<{ id: number; name: string }>;
  conditions: Array<{ id: number; name: string }>;
  hazards: Array<{ id: number; name: string }>;
}

interface OrgUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
}

export default function PabRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userCompany, setUserCompany] = useState('');
  
  const [dictionaries, setDictionaries] = useState<Dictionaries>({
    categories: [],
    conditions: [],
    hazards: []
  });
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorFio, setInspectorFio] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');
  const [location, setLocation] = useState('');
  const [checkedObject, setCheckedObject] = useState('');
  const [department, setDepartment] = useState('');
  const [violationPhoto, setViolationPhoto] = useState<File | null>(null);
  
  const [observations, setObservations] = useState<Observation[]>([
    {
      observation_number: 1,
      description: '',
      category: '',
      conditions_actions: '',
      hazard_factors: '',
      measures: '',
      responsible_person: '',
      deadline: '',
      photo_file: null
    }
  ]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      toast.error('Доступ запрещен. Войдите в систему.');
      navigate('/');
      return;
    }
    
    setUserCompany(localStorage.getItem('userCompany') || '');
    loadData();
  }, [navigate]);

  const loadData = async () => {
    const userId = localStorage.getItem('userId');
    const organizationId = localStorage.getItem('organizationId');
    
    try {
      const dictResponse = await fetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960');
      const dictData = await dictResponse.json();
      setDictionaries(dictData);
    } catch (error) {
      console.error('Error loading dictionaries:', error);
    }

    try {
      const numberResponse = await fetch('https://functions.poehali.dev/c04242d9-b386-407e-bb84-10d219a16e97');
      const numberData = await numberResponse.json();
      setDocNumber(numberData.doc_number);
    } catch (error) {
      console.error('Error generating doc number:', error);
      setDocNumber('ПАБ-' + Date.now());
    }

    if (userId) {
      try {
        const userResponse = await fetch(`https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f?userId=${userId}`);
        const userData = await userResponse.json();
        if (userData.success && userData.user) {
          setInspectorFio(userData.user.fio || '');
          setInspectorPosition(userData.user.position || '');
          setDepartment(userData.user.subdivision || '');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    if (organizationId) {
      try {
        const usersResponse = await fetch(`https://functions.poehali.dev/7f32d60e-dee5-4b28-901a-10984045d99e?organization_id=${organizationId}`);
        const usersData = await usersResponse.json();
        if (Array.isArray(usersData)) {
          setOrgUsers(usersData);
        }
      } catch (error) {
        console.error('Error loading organization users:', error);
      }
    }
  };

  const addObservation = () => {
    if (observations.length < 3) {
      setObservations([...observations, {
        observation_number: observations.length + 1,
        description: '',
        category: '',
        conditions_actions: '',
        hazard_factors: '',
        measures: '',
        responsible_person: '',
        deadline: '',
        photo_file: null
      }]);
    }
  };

  const updateObservation = (index: number, field: keyof Observation, value: string) => {
    const updated = [...observations];
    updated[index] = { ...updated[index], [field]: value };
    setObservations(updated);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setViolationPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!docDate || !inspectorFio || !inspectorPosition || !location || !checkedObject || !department) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    for (const obs of observations) {
      if (!obs.description || !obs.category || !obs.conditions_actions || 
          !obs.hazard_factors || !obs.measures || !obs.responsible_person || !obs.deadline) {
        toast.error('Заполните все обязательные поля в наблюдениях');
        return;
      }
    }

    setLoading(true);

    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        toast.error('Пользователь не авторизован');
        setLoading(false);
        return;
      }

      const response = await fetch('https://functions.poehali.dev/5054985e-ff94-4512-8302-c02f01b09d66', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_number: docNumber,
          doc_date: docDate,
          inspector_fio: inspectorFio,
          inspector_position: inspectorPosition,
          department,
          location,
          checked_object: checkedObject,
          photo_url: '',
          responsible_email: '',
          admin_email: 'nshrkonstantin@gmail.com',
          observations
        })
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      toast.success('ПАБ успешно сохранен');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Регистрация ПАБ</h1>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Icon name="ArrowLeft" size={20} />
            Назад на главную
          </Button>
        </div>

        <Card className="bg-white border border-gray-200 p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-700 mb-2 block">Название листа</Label>
              <Input
                value={docNumber}
                disabled
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700 mb-2 block">Номер документа</Label>
              <Input
                value={docNumber}
                disabled
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700 mb-2 block">Дата *</Label>
              <Input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700 mb-2 block">ФИО проверяющего *</Label>
              <Input
                value={inspectorFio}
                onChange={(e) => setInspectorFio(e.target.value)}
                className="border-gray-300 text-gray-900"
                placeholder="УЧЕБНЫЙ"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-700 mb-2 block">Должность проверяющего *</Label>
              <Input
                value={inspectorPosition}
                onChange={(e) => setInspectorPosition(e.target.value)}
                className="border-gray-300 text-gray-900"
                placeholder="Обучение"
              />
            </div>
            <div>
              <Label className="text-gray-700 mb-2 block">Участок *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-gray-300 text-gray-900"
                placeholder="Участок"
              />
            </div>
            <div>
              <Label className="text-gray-700 mb-2 block">Проверяемый объект *</Label>
              <Input
                value={checkedObject}
                onChange={(e) => setCheckedObject(e.target.value)}
                className="border-gray-300 text-gray-900"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-700 mb-2 block">Подразделение *</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="border-gray-300 text-gray-900"
                placeholder="Напр. З/ИО"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-700 mb-2 block">Фотография нарушения</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <Icon name="Image" size={20} className="text-gray-600" />
                  <span className="text-gray-700">Выберите файл</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {violationPhoto && (
                  <span className="text-sm text-gray-600">{violationPhoto.name}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {observations.map((obs, index) => (
          <Card key={index} className="bg-white border border-gray-200 p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Наблюдение №{obs.observation_number} *
            </h2>
            <div className="space-y-6">
              <div>
                <Label className="text-gray-700 mb-2 block">
                  Наблюдение №{obs.observation_number} *
                </Label>
                <Textarea
                  value={obs.description}
                  onChange={(e) => updateObservation(index, 'description', e.target.value)}
                  className="border-gray-300 text-gray-900 min-h-[100px]"
                  placeholder="Кратко опишите ситуацию..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-red-600 mb-2 block">Категория наблюдений *</Label>
                  <Select
                    value={obs.category}
                    onValueChange={(value) => updateObservation(index, 'category', value)}
                  >
                    <SelectTrigger className="border-gray-300 text-gray-900">
                      <SelectValue placeholder="-Не выбрано-" />
                    </SelectTrigger>
                    <SelectContent>
                      {dictionaries.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 mb-2 block">Вид условий и действий *</Label>
                  <Select
                    value={obs.conditions_actions}
                    onValueChange={(value) => updateObservation(index, 'conditions_actions', value)}
                  >
                    <SelectTrigger className="border-gray-300 text-gray-900">
                      <SelectValue placeholder="-Не выбрано-" />
                    </SelectTrigger>
                    <SelectContent>
                      {dictionaries.conditions.map((cond) => (
                        <SelectItem key={cond.id} value={cond.name}>
                          {cond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-red-600 mb-2 block">Опасные факторы *</Label>
                <Select
                  value={obs.hazard_factors}
                  onValueChange={(value) => updateObservation(index, 'hazard_factors', value)}
                >
                  <SelectTrigger className="border-gray-300 text-gray-900">
                    <SelectValue placeholder="-Не выбрано-" />
                  </SelectTrigger>
                  <SelectContent>
                    {dictionaries.hazards.map((hazard) => (
                      <SelectItem key={hazard.id} value={hazard.name}>
                        {hazard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 mb-2 block">Мероприятия *</Label>
                <Textarea
                  value={obs.measures}
                  onChange={(e) => updateObservation(index, 'measures', e.target.value)}
                  className="border-gray-300 text-gray-900 min-h-[100px]"
                  placeholder="Что нужно сделать..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-700 mb-2 block">Ответственный за выполнение *</Label>
                  <Select
                    value={obs.responsible_person}
                    onValueChange={(value) => updateObservation(index, 'responsible_person', value)}
                  >
                    <SelectTrigger className="border-gray-300 text-gray-900">
                      <SelectValue placeholder="Выберите из списка" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgUsers.map((user) => (
                        <SelectItem key={user.id} value={user.fio}>
                          {user.fio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={obs.responsible_person}
                    onChange={(e) => updateObservation(index, 'responsible_person', e.target.value)}
                    className="border-gray-300 text-gray-900 mt-2"
                    placeholder="Ф.И.О. или оставьте пустым"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 mb-2 block">Срок *</Label>
                  <Input
                    type="date"
                    value={obs.deadline}
                    onChange={(e) => updateObservation(index, 'deadline', e.target.value)}
                    className="border-gray-300 text-gray-900"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}

        {observations.length < 3 && (
          <Button
            onClick={addObservation}
            variant="outline"
            className="mb-6 w-full md:w-auto"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Добавить наблюдение {observations.length + 1}
          </Button>
        )}

        <div className="flex flex-wrap gap-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
          >
            Назад на главную
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Отправка...' : 'Отправить'}
          </Button>
          <Button variant="outline">
            Скачать в PDF
          </Button>
          <Button variant="outline">
            <Icon name="FileText" size={20} className="mr-2" />
            Скачать в Word
          </Button>
        </div>
      </div>
    </div>
  );
}
