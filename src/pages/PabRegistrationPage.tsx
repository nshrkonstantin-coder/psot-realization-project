import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import OrganizationLogo from '@/components/OrganizationLogo';

interface ObservationData {
  description: string;
  category: string;
  conditions: string;
  hazards: string;
  measures: string;
  responsible: string;
  deadline: string;
  photo?: File | null;
}

interface Dictionary {
  id: number;
  name: string;
}

interface OrgUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
  email: string;
}

export default function PabRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [pabNumber, setPabNumber] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');
  
  const [area, setArea] = useState('');
  const [inspectedObject, setInspectedObject] = useState('');
  const [subdivision, setSubdivision] = useState('');
  
  const [observations, setObservations] = useState<ObservationData[]>([
    {
      description: '',
      category: '',
      conditions: '',
      hazards: '',
      measures: '',
      responsible: '',
      deadline: '',
      photo: null
    }
  ]);
  
  const [categories, setCategories] = useState<Dictionary[]>([]);
  const [conditions, setConditions] = useState<Dictionary[]>([]);
  const [hazards, setHazards] = useState<Dictionary[]>([]);
  const [responsibleUsers, setResponsibleUsers] = useState<OrgUser[]>([]);
  const [canSubmitSingle, setCanSubmitSingle] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/74d22125-c73a-42f1-9ad2-542f5186d614');
      const data = await response.json();
      setPabNumber(data.pabNumber);
      
      const today = new Date().toISOString().split('T')[0];
      setCurrentDate(today);
      
      const userId = localStorage.getItem('userId');
      console.log('userId from localStorage:', userId);
      
      if (userId) {
        const userResponse = await fetch(`https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f?userId=${userId}`);
        const responseData = await userResponse.json();
        console.log('User data received:', responseData);
        
        const userData = responseData.user || responseData;
        
        if (userData && userData.fio) {
          setInspectorName(userData.fio);
          console.log('Set inspector name:', userData.fio);
        }
        
        if (userData && userData.position) {
          setInspectorPosition(userData.position);
          console.log('Set inspector position:', userData.position);
        }
        
        if (userData.fio === 'Сергеев Дем Демович') {
          setCanSubmitSingle(true);
        }
        
        const orgId = localStorage.getItem('organizationId');
        if (orgId) {
          const usersResponse = await fetch(`https://functions.poehali.dev/7f32d60e-dee5-4b28-901a-10984045d99e?organization_id=${orgId}`);
          const usersData = await usersResponse.json();
          setResponsibleUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
        }
      }
      
      const dictionariesResponse = await fetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960');
      const dictionariesData = await dictionariesResponse.json();
      
      setCategories(dictionariesData.categories || []);
      setConditions(dictionariesData.conditions || []);
      setHazards(dictionariesData.hazards || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    }
  };

  const handleAddObservation = () => {
    if (observations.length < 3) {
      setObservations([...observations, {
        description: '',
        category: '',
        conditions: '',
        hazards: '',
        measures: '',
        responsible: '',
        deadline: '',
        photo: null
      }]);
    }
  };

  const handleObservationChange = (index: number, field: keyof ObservationData, value: string | File) => {
    const updated = [...observations];
    if (field === 'photo') {
      updated[index][field] = value as File;
    } else {
      updated[index][field] = value as string;
    }
    setObservations(updated);
  };

  const handlePhotoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleObservationChange(index, 'photo', file);
    }
  };

  const validateForm = (): boolean => {
    if (!area || !inspectedObject || !subdivision) {
      toast.error('Заполните все обязательные поля шапки');
      return false;
    }
    
    if (!canSubmitSingle && observations.length < 3) {
      toast.error('Необходимо заполнить все 3 наблюдения');
      return false;
    }
    
    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      if (!obs.description || !obs.category || !obs.conditions || !obs.hazards || !obs.measures || !obs.responsible || !obs.deadline) {
        toast.error(`Заполните все обязательные поля наблюдения №${i + 1}`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      const observationsWithPhotos = await Promise.all(observations.map(async obs => {
        let photoBase64 = null;
        if (obs.photo) {
          photoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(obs.photo as File);
          });
        }
        
        return {
          description: obs.description,
          category: obs.category,
          conditions: obs.conditions,
          hazards: obs.hazards,
          measures: obs.measures,
          responsible: obs.responsible,
          deadline: obs.deadline,
          photo: photoBase64
        };
      }));
      
      const payload = {
        date: currentDate,
        inspectorName,
        inspectorPosition,
        area,
        inspectedObject,
        subdivision,
        userId: userId,
        observations: observationsWithPhotos
      };
      
      const response = await fetch('https://functions.poehali.dev/5054985e-ff94-4512-8302-c02f01b09d66', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        toast.success('ПАБ успешно зарегистрирован и отправлен');
        navigate('/pab-list');
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Ошибка отправки');
      }
    } catch (error) {
      console.error('Error submitting PAB:', error);
      toast.error('Ошибка отправки ПАБ: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/pab-list')} className="mb-4">
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Назад к списку ПАБ
          </Button>
          <div className="flex items-center justify-center gap-4 mb-8">
            <OrganizationLogo size={56} showCompanyName={false} />
            <h1 className="text-3xl font-bold text-gray-900">Регистрация ПАБ</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pabNumberSheet">Название листа</Label>
              <Input id="pabNumberSheet" value={pabNumber} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="pabNumberDoc">Номер документа</Label>
              <Input id="pabNumberDoc" value={pabNumber} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="date">Дата *</Label>
              <Input 
                id="date" 
                type="date" 
                value={currentDate} 
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inspectorName">ФИО проверяющего *</Label>
              <Input id="inspectorName" value={inspectorName} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="inspectorPosition">Должность проверяющего *</Label>
              <Input id="inspectorPosition" value={inspectorPosition} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="area">Участок *</Label>
              <Input 
                id="area" 
                value={area} 
                onChange={(e) => setArea(e.target.value)}
                placeholder="Участок"
                className={area ? 'bg-green-50 border-green-300' : ''}
              />
            </div>
            <div>
              <Label htmlFor="inspectedObject">Проверяемый объект *</Label>
              <Input 
                id="inspectedObject" 
                value={inspectedObject} 
                onChange={(e) => setInspectedObject(e.target.value)}
                placeholder="Проверяемый объект"
                className={inspectedObject ? 'bg-green-50 border-green-300' : ''}
              />
            </div>
            <div>
              <Label htmlFor="subdivision">Подразделение *</Label>
              <Input 
                id="subdivision" 
                value={subdivision} 
                onChange={(e) => setSubdivision(e.target.value)}
                placeholder="Например ПГУ"
                className={subdivision ? 'bg-green-50 border-green-300' : ''}
              />
            </div>
          </div>

          {observations.map((obs, index) => (
            <div key={index} className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Наблюдение №{index + 1}</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`description-${index}`}>Наблюдение №{index + 1} *</Label>
                  <Textarea 
                    id={`description-${index}`}
                    value={obs.description}
                    onChange={(e) => handleObservationChange(index, 'description', e.target.value)}
                    placeholder="Кратко опишите ситуацию..."
                    rows={4}
                    className={obs.description ? 'bg-green-50 border-green-300' : ''}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`category-${index}`}>Категория наблюдений *</Label>
                    <Select 
                      value={obs.category} 
                      onValueChange={(value) => handleObservationChange(index, 'category', value)}
                    >
                      <SelectTrigger className={obs.category ? 'bg-green-50 border-green-300' : ''}>
                        <SelectValue placeholder="-Не выбрано-" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`conditions-${index}`}>Вид условий и действий *</Label>
                    <Select 
                      value={obs.conditions} 
                      onValueChange={(value) => handleObservationChange(index, 'conditions', value)}
                    >
                      <SelectTrigger className={obs.conditions ? 'bg-green-50 border-green-300' : ''}>
                        <SelectValue placeholder="-Не выбрано-" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((cond) => (
                          <SelectItem key={cond.id} value={cond.name}>{cond.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`hazards-${index}`}>Опасные факторы *</Label>
                  <Select 
                    value={obs.hazards} 
                    onValueChange={(value) => handleObservationChange(index, 'hazards', value)}
                  >
                    <SelectTrigger className={obs.hazards ? 'bg-green-50 border-green-300' : ''}>
                      <SelectValue placeholder="-Не выбрано-" />
                    </SelectTrigger>
                    <SelectContent>
                      {hazards.map((haz) => (
                        <SelectItem key={haz.id} value={haz.name}>{haz.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`measures-${index}`}>Мероприятия *</Label>
                  <Textarea 
                    id={`measures-${index}`}
                    value={obs.measures}
                    onChange={(e) => handleObservationChange(index, 'measures', e.target.value)}
                    placeholder="Что нужно сделать..."
                    rows={4}
                    className={obs.measures ? 'bg-green-50 border-green-300' : ''}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`photo-${index}`}>Фотография нарушения</Label>
                    <Input 
                      id={`photo-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(index, e)}
                      className="cursor-pointer"
                    />
                    {obs.photo && (
                      <p className="text-sm text-gray-600 mt-1">Выбран файл: {obs.photo.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`deadline-${index}`}>Срок *</Label>
                    <Input 
                      id={`deadline-${index}`}
                      type="date"
                      value={obs.deadline}
                      onChange={(e) => handleObservationChange(index, 'deadline', e.target.value)}
                      className={obs.deadline ? 'bg-green-50 border-green-300' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`responsible-${index}`}>Ответственный за выполнение *</Label>
                  <Select 
                    value={obs.responsible} 
                    onValueChange={(value) => handleObservationChange(index, 'responsible', value)}
                  >
                    <SelectTrigger className={obs.responsible ? 'bg-green-50 border-green-300' : ''}>
                      <SelectValue placeholder="Выберите из списка" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsibleUsers.map((user) => (
                        <SelectItem key={user.id} value={user.fio}>
                          {user.fio} ({user.position})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">Ф.И.О. или оставьте пустым</p>
                </div>
              </div>

              {index === observations.length - 1 && observations.length < 3 && (
                <Button 
                  onClick={handleAddObservation} 
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Заполнить наблюдение №{observations.length + 1}
                </Button>
              )}
            </div>
          ))}

          {(canSubmitSingle || observations.length === 3) && (
            <div className="flex flex-col md:flex-row gap-3 pt-6">
              <Button 
                onClick={() => navigate('/user-cabinet')} 
                variant="outline"
                className="flex-1"
              >
                Назад на главную
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Отправка...' : 'Отправить'}
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
              >
                Скачать в PDF
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
              >
                <Icon name="FileText" className="mr-2 h-4 w-4" />
                Скачать в Word
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}