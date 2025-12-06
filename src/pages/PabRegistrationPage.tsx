import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { generatePabHtml } from '@/utils/generatePabHtml';
import { uploadDocumentToStorage } from '@/utils/documentUpload';
import { PabHeaderForm } from '@/components/pab-registration/PabHeaderForm';
import { PabObservationCard } from '@/components/pab-registration/PabObservationCard';
import { PabActionButtons } from '@/components/pab-registration/PabActionButtons';

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
  email: string;
}

export default function PabRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userCompany, setUserCompany] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  
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
    
    // Временно показываем форму всегда для диагностики
    setUserCompany(localStorage.getItem('userCompany') || '');
    setAuthChecked(true);
    
    if (userId) {
      loadData();
    }
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
        const usersResponse = await fetch(`https://functions.poehali.dev/bceeaee7-5cfa-418c-9c0d-0a61668ab1a4?organization_id=${organizationId}`);
        const usersData = await usersResponse.json();
        console.log('[PAB] Loaded organization users:', usersData);
        if (Array.isArray(usersData)) {
          setOrgUsers(usersData);
        } else {
          setOrgUsers([]);
        }
      } catch (error) {
        console.error('Error loading organization users:', error);
        setOrgUsers([]);
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

  const handleObservationPhotoChange = (index: number, file: File | null) => {
    const updated = [...observations];
    updated[index] = { ...updated[index], photo_file: file };
    setObservations(updated);
  };

  const areAllObservationsFilled = () => {
    if (observations.length < 3) return false;
    
    for (const obs of observations) {
      if (!obs.description || !obs.category || !obs.conditions_actions || 
          !obs.hazard_factors || !obs.measures || !obs.responsible_person || !obs.deadline) {
        return false;
      }
    }
    return true;
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

      const userResponse = await fetch(`https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f?userId=${userId}`);
      const userData = await userResponse.json();
      const senderEmail = userData.user?.email || '';

      const firstObservationResponsible = observations[0].responsible_person;
      const responsibleUser = orgUsers.find(u => u.fio === firstObservationResponsible);
      const responsibleEmail = responsibleUser?.email || '';

      const adminEmail = 'nshrkonstantin@gmail.com';

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
          sender_email: senderEmail,
          responsible_email: responsibleEmail,
          admin_email: adminEmail,
          observations
        })
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        try {
          await fetch('https://functions.poehali.dev/c250cb0e-130b-4d0b-8980-cc13bad4acdd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              organization_id: organizationId,
              action: 'create_pab',
              points: 10
            })
          });
        } catch (pointsError) {
          console.error('Error awarding points:', pointsError);
        }
      }

      const htmlContent = generatePabHtml({
        doc_number: newDocNumber,
        doc_date: docDate,
        inspector_fio: inspectorFio,
        inspector_position: inspectorPosition,
        department,
        location,
        checked_object: checkedObject,
        observations,
        company: userCompany
      });

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const htmlFile = new File([blob], `ПАБ_${newDocNumber}_${docDate}.html`, { type: 'text/html' });

      let htmlUrl = '';
      if (organizationId && userId) {
        try {
          htmlUrl = await uploadDocumentToStorage({
            userId: userId,
            department: department,
            documentType: 'ПАБ',
            file: htmlFile
          });
        } catch (uploadError) {
          console.error('Error uploading to storage:', uploadError);
        }
      }

      if (htmlUrl && (responsibleEmail || adminEmail)) {
        try {
          await fetch('https://functions.poehali.dev/963fb84a-6c11-4009-a2f8-e46804543809', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doc_number: newDocNumber,
              responsible_email: responsibleEmail,
              admin_email: adminEmail,
              html_url: htmlUrl
            })
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      toast.success('ПАБ успешно сохранен и отправлен на почту');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    toast.info('Функция экспорта в PDF в разработке');
  };

  const handleDownloadWord = () => {
    toast.info('Функция экспорта в Word в разработке');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border-2 border-red-600/30">
          <div className="text-center">
            <Icon name="ShieldAlert" size={60} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Доступ запрещен</h2>
            <p className="text-gray-300 mb-6">
              Для доступа к форме регистрации ПАБ необходимо войти в систему.
            </p>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">
                userId: <span className="text-red-400 font-mono">не найден</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                localStorage: {Object.keys(localStorage).join(', ') || 'пусто'}
              </p>
            </div>
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-700 hover:to-orange-800"
            >
              <Icon name="LogIn" size={20} className="mr-2" />
              Перейти к входу
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        <PabHeaderForm
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
        />

        {observations.map((obs, index) => (
          <PabObservationCard
            key={index}
            observation={obs}
            index={index}
            dictionaries={dictionaries}
            orgUsers={orgUsers}
            subdivisionFilter={subdivisionFilter}
            onSubdivisionFilterChange={setSubdivisionFilter}
            onUpdate={updateObservation}
            onPhotoChange={handleObservationPhotoChange}
          />
        ))}

        <PabActionButtons
          loading={loading}
          canAddObservation={observations.length < 3}
          allObservationsFilled={areAllObservationsFilled()}
          onBack={() => navigate('/dashboard')}
          onAddObservation={addObservation}
          onSubmit={handleSubmit}
          onDownloadPdf={handleDownloadPdf}
          onDownloadWord={handleDownloadWord}
        />
      </div>
    </div>
  );
}