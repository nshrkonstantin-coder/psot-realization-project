import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { PabHeaderForm } from '@/components/pab-registration/PabHeaderForm';
import { PabObservationCard } from '@/components/pab-registration/PabObservationCard';
import { PabActionButtons } from '@/components/pab-registration/PabActionButtons';
import { useEmailSender } from '@/hooks/useEmailSender';
import EmailStatusDialog from '@/components/EmailStatusDialog';
import { PabDataLoader } from '@/components/pab-registration/PabDataLoader';
import { usePabObservationManager } from '@/components/pab-registration/PabObservationManager';
import { handlePabSubmit } from '@/components/pab-registration/PabSubmitHandler';

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
  console.log('PabRegistrationPage: component rendering');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userCompany, setUserCompany] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const { sendEmail, sending: emailSending, lastResult: emailResult } = useEmailSender();
  const [showEmailStatus, setShowEmailStatus] = useState(false);
  
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
  const [headerPhotoFile, setHeaderPhotoFile] = useState<File | null>(null);
  
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
  const [allowSingleObservation, setAllowSingleObservation] = useState(false);

  const {
    addObservation,
    updateObservation,
    handleObservationPhotoChange,
    areAllObservationsFilled
  } = usePabObservationManager({
    observations,
    setObservations,
    allowSingleObservation
  });

  const handleSubmit = async () => {
    await handlePabSubmit({
      docNumber,
      docDate,
      inspectorFio,
      inspectorPosition,
      location,
      checkedObject,
      department,
      headerPhotoFile,
      observations,
      userCompany,
      sendEmail,
      setLoading,
      setShowEmailStatus,
      navigate
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PabDataLoader
        onDictionariesLoaded={setDictionaries}
        onDocNumberLoaded={setDocNumber}
        onUserDataLoaded={(fio, position, subdivision) => {
          setInspectorFio(fio);
          setInspectorPosition(position);
          setDepartment(subdivision);
          setUserCompany(localStorage.getItem('userCompany') || '');
          setAuthChecked(true);
        }}
        onOrgUsersLoaded={setOrgUsers}
        onAllowSingleObservation={setAllowSingleObservation}
      />

      {!authChecked ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        </div>
      ) : (
        <>

      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/pab-list')} className="mb-4">
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Назад к списку ПАБ
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Создание карты ПАБ</h1>
          <p className="text-gray-600 mt-2">Заполните информацию о проведенном наблюдении</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <PabHeaderForm
            docNumber={docNumber}
            docDate={docDate}
            inspectorFio={inspectorFio}
            inspectorPosition={inspectorPosition}
            location={location}
            checkedObject={checkedObject}
            department={department}
            headerPhotoFile={headerPhotoFile}
            onDocDateChange={setDocDate}
            onInspectorFioChange={setInspectorFio}
            onInspectorPositionChange={setInspectorPosition}
            onLocationChange={setLocation}
            onCheckedObjectChange={setCheckedObject}
            onDepartmentChange={setDepartment}
            onHeaderPhotoChange={setHeaderPhotoFile}
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Наблюдения</h2>
            {observations.length < 3 && (
              <Button onClick={addObservation} variant="outline">
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Добавить наблюдение
              </Button>
            )}
          </div>

          {!areAllObservationsFilled() && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                {allowSingleObservation 
                  ? 'Заполните все поля хотя бы в одном наблюдении'
                  : 'Необходимо заполнить минимум 3 наблюдения'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {observations.map((obs, index) => (
              <PabObservationCard
                key={index}
                observation={obs}
                index={index}
                dictionaries={dictionaries}
                orgUsers={orgUsers}
                subdivisionFilter={subdivisionFilter}
                onSubdivisionFilterChange={setSubdivisionFilter}
                onUpdate={(field, value) => updateObservation(index, field, value)}
                onPhotoChange={(file) => handleObservationPhotoChange(index, file)}
              />
            ))}
          </div>
        </div>

        <PabActionButtons
          loading={loading}
          areAllObservationsFilled={areAllObservationsFilled()}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/pab')}
        />
      </div>

      {showEmailStatus && (
        <EmailStatusDialog
          open={showEmailStatus}
          onClose={() => setShowEmailStatus(false)}
          sending={emailSending}
          result={emailResult}
        />
      )}
      </>
      )}
    </div>
  );
}