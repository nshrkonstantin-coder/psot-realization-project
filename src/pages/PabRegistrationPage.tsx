import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { generatePabHtml } from '@/utils/generatePabHtml';
import { uploadDocumentToStorage } from '@/utils/documentUpload';
import { PabFormHeader } from '@/components/pab/PabFormHeader';
import { PabObservationForm } from '@/components/pab/PabObservationForm';
import { PabPhotoGallery } from '@/components/pab/PabPhotoGallery';
import { PabFormActions } from '@/components/pab/PabFormActions';

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [userCompany, setUserCompany] = useState('');
  const [dictionaries, setDictionaries] = useState<Dictionaries>({
    categories: [],
    conditions: [],
    hazards: []
  });
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [subdivisionFilter, setSubdivisionFilter] = useState<string>('');
  
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorFio, setInspectorFio] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');
  const [location, setLocation] = useState('');
  const [checkedObject, setCheckedObject] = useState('');
  const [department, setDepartment] = useState('');
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null]);
  
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
    
    // Разрешаем доступ только авторизованным пользователям
    if (!userId) {
      console.log('[PAB] Access denied: no user ID');
      toast.error('Доступ запрещен. Войдите в систему.');
      setInitialLoading(false);
      navigate('/');
      return;
    }
    
    setUserCompany(localStorage.getItem('userCompany') || '');
    loadData();
  }, [navigate]);

  const loadData = async () => {
    console.log('[PAB] Starting data load...');
    
    const userId = localStorage.getItem('userId');
    const organizationId = localStorage.getItem('organizationId');
    console.log('[PAB] User ID:', userId, 'Org ID:', organizationId);
    
    // Загрузка справочников (с таймаутом)
    try {
      const dictResponse = await Promise.race([
        fetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]) as Response;
      const dictData = await dictResponse.json();
      console.log('[PAB] Dictionaries loaded:', dictData);
      setDictionaries(dictData);
    } catch (error) {
      console.error('[PAB] Error loading dictionaries:', error);
    }

    // Генерация номера ПАБ (с таймаутом)
    try {
      const numberResponse = await Promise.race([
        fetch('https://functions.poehali.dev/c04242d9-b386-407e-bb84-10d219a16e97'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]) as Response;
      const numberData = await numberResponse.json();
      console.log('[PAB] Document number generated:', numberData.doc_number);
      setDocNumber(numberData.doc_number);
    } catch (error) {
      console.error('[PAB] Error generating doc number:', error);
      setDocNumber('ПАБ-' + Date.now());
    }

    // Загрузка данных пользователя (с таймаутом)
    if (userId) {
      try {
        const userResponse = await Promise.race([
          fetch(`https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f?userId=${userId}`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]) as Response;
        const userData = await userResponse.json();
        console.log('[PAB] User data loaded:', userData);
        if (userData.success && userData.user) {
          setInspectorFio(userData.user.fio || '');
          setInspectorPosition(userData.user.position || '');
          setDepartment(userData.user.subdivision || '');
        }
      } catch (error) {
        console.error('[PAB] Error loading user data:', error);
      }
    }

    // Загрузка пользователей организации (с таймаутом)
    if (organizationId) {
      try {
        const usersResponse = await Promise.race([
          fetch(`https://functions.poehali.dev/7f32d60e-dee5-4b28-901a-10984045d99e?organization_id=${organizationId}`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]) as Response;
        const usersData = await usersResponse.json();
        console.log('[PAB] Organization users loaded:', usersData.length);
        setOrgUsers(usersData);
      } catch (error) {
        console.error('[PAB] Error loading organization users:', error);
      }
    }
    
    console.log('[PAB] Data load complete!');
    setInitialLoading(false);
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

  const updateObservation = (index: number, field: keyof Observation, value: string | File | null) => {
    const updated = [...observations];
    updated[index] = { ...updated[index], [field]: value };
    setObservations(updated);
  };

  const isFieldFilled = (value: any): boolean => {
    if (typeof value === 'string') return value.trim() !== '';
    if (value instanceof File) return true;
    return false;
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
      
      const numberResponse = await fetch('https://functions.poehali.dev/c04242d9-b386-407e-bb84-10d219a16e97');
      const numberData = await numberResponse.json();
      const newDocNumber = numberData.doc_number;
      
      const photoBase64Array = await Promise.all(
        observations.map(async (obs) => {
          if (obs.photo_file) {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(obs.photo_file as File);
            });
          }
          return '';
        })
      );

      const userResponse = await fetch(`https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f?userId=${userId}`);
      const userData = await userResponse.json();
      const responsibleEmail = userData.user?.email || '';

      const adminEmail = 'admin@example.com';

      // Отправка ПАБ
      const response = await fetch('https://functions.poehali.dev/5054985e-ff94-4512-8302-c02f01b09d66', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_number: newDocNumber,
          doc_date: docDate,
          inspector_fio: inspectorFio,
          inspector_position: inspectorPosition,
          department,
          location,
          checked_object: checkedObject,
          photo_url: '',
          responsible_email: responsibleEmail,
          admin_email: adminEmail,
          observations
        })
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        try {
          await fetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4f6ca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: organizationId,
              action_type: 'pab_create',
              user_id: localStorage.getItem('userId')
            })
          });
        } catch (error) {
          console.log('Points award failed:', error);
        }
      }

      const observationsWithPhotos = observations.map((obs, index) => ({
        ...obs,
        photo_base64: photoBase64Array[index]
      }));

      const pabData = {
        doc_number: newDocNumber,
        doc_date: docDate,
        inspector_fio: inspectorFio,
        inspector_position: inspectorPosition,
        department,
        location,
        checked_object: checkedObject,
        photo_base64: photoBase64Array[0] || '',
        observations: observationsWithPhotos
      };
      
      const htmlContent = generatePabHtml(pabData);
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ПАБ_${newDocNumber}_${docDate}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (organizationId) {
        await uploadDocumentToStorage({
          file: blob,
          fileName: `ПАБ_${newDocNumber}_${docDate}.html`,
          organizationId: organizationId,
          docNumber: newDocNumber,
          docType: 'pab',
          docDate: docDate
        });
      }

      toast.success('ПАБ успешно сохранен');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (index: number, file: File | null) => {
    const updated = [...photoFiles];
    updated[index] = file;
    setPhotoFiles(updated);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Загрузка формы регистрации ПАБ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 p-3 rounded-xl shadow-lg">
              <Icon name="FileText" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Регистрация ПАБ</h1>
              {userCompany && (
                <p className="text-blue-400 font-semibold text-lg">{userCompany}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            Назад
          </button>
        </div>

        {!docNumber && (
          <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-4 mb-6">
            <p className="text-yellow-300 text-center">⚠️ Если форма не отображается, проверьте консоль браузера (F12) или обратитесь к администратору</p>
          </div>
        )}

        <div className="space-y-6">
          <PabFormHeader
            docNumber={docNumber}
            docDate={docDate}
            inspectorFio={inspectorFio}
            inspectorPosition={inspectorPosition}
            location={location}
            checkedObject={checkedObject}
            department={department}
            onDocDateChange={setDocDate}
            onInspectorFioChange={setInspectorFio}
            onInspectorPositionChange={setInspectorPosition}
            onLocationChange={setLocation}
            onCheckedObjectChange={setCheckedObject}
            onDepartmentChange={setDepartment}
            isFieldFilled={isFieldFilled}
          />

          {observations.map((obs, index) => (
            <PabObservationForm
              key={index}
              observation={obs}
              index={index}
              dictionaries={dictionaries}
              orgUsers={orgUsers}
              subdivisionFilter={subdivisionFilter}
              onSubdivisionFilterChange={setSubdivisionFilter}
              onUpdate={updateObservation}
              isFieldFilled={isFieldFilled}
            />
          ))}

          <PabPhotoGallery
            photoFiles={photoFiles}
            onPhotoChange={handlePhotoChange}
          />

          <PabFormActions
            onBack={() => navigate('/dashboard')}
            onAddObservation={addObservation}
            onSubmit={handleSubmit}
            loading={loading}
            canAddObservation={observations.length < 3}
          />
        </div>
      </div>
    </div>
  );
}