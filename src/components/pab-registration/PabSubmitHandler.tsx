import { toast } from 'sonner';
import { generatePabHtml } from '@/utils/generatePabHtml';
import { uploadDocumentToStorage } from '@/utils/documentUpload';

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

interface PabSubmitHandlerParams {
  docNumber: string;
  docDate: string;
  inspectorFio: string;
  inspectorPosition: string;
  location: string;
  checkedObject: string;
  department: string;
  headerPhotoFile: File | null;
  observations: Observation[];
  userCompany: string;
  sendEmail: (recipients: string[], subject: string, message: string, attachments?: Array<{filename: string; url: string}>) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setShowEmailStatus: (show: boolean) => void;
  navigate: (path: string) => void;
}

export async function handlePabSubmit({
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
}: PabSubmitHandlerParams) {
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
    
    const organizationId = localStorage.getItem('organizationId') || '1';
    let headerPhotoUrl = '';

    if (headerPhotoFile) {
      try {
        const formData = new FormData();
        formData.append('file', headerPhotoFile);
        formData.append('folder_id', '1');

        const response = await fetch('https://functions.poehali.dev/02f4ee55-2a57-4a53-b04e-3e1dcb43b37a', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          headerPhotoUrl = data.file?.url || '';
        }
      } catch (error) {
        console.error('Error uploading header photo:', error);
      }
    }

    const observationsWithPhotos = await Promise.all(
      observations.map(async (obs) => {
        let photoUrl = '';
        if (obs.photo_file) {
          try {
            const formData = new FormData();
            formData.append('file', obs.photo_file);
            formData.append('folder_id', '1');

            const response = await fetch('https://functions.poehali.dev/02f4ee55-2a57-4a53-b04e-3e1dcb43b37a', {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              const data = await response.json();
              photoUrl = data.file?.url || '';
            }
          } catch (error) {
            console.error('Error uploading observation photo:', error);
          }
        }
        
        return {
          observation_number: obs.observation_number,
          description: obs.description,
          category: obs.category,
          conditions_actions: obs.conditions_actions,
          hazard_factors: obs.hazard_factors,
          measures: obs.measures,
          responsible_person: obs.responsible_person,
          deadline: obs.deadline,
          photo_url: photoUrl
        };
      })
    );

    const payload = {
      doc_number: docNumber,
      doc_date: docDate,
      inspector_fio: inspectorFio,
      inspector_position: inspectorPosition,
      location,
      checked_object: checkedObject,
      department,
      header_photo_url: headerPhotoUrl,
      observations: observationsWithPhotos,
      user_id: parseInt(userId),
      organization_id: parseInt(organizationId)
    };

    const response = await fetch('https://functions.poehali.dev/4a7c2ea5-72b0-4b31-8fdf-fccf70af8b54', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      const htmlContent = generatePabHtml({
        doc_number: docNumber,
        doc_date: docDate,
        inspector_fio: inspectorFio,
        inspector_position: inspectorPosition,
        location,
        checked_object: checkedObject,
        department,
        header_photo_url: headerPhotoUrl,
        observations: observationsWithPhotos,
        organization_name: userCompany
      });

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const file = new File([blob], `${docNumber}.html`, { type: 'text/html' });

      const cdnUrl = await uploadDocumentToStorage(file, '1');

      if (cdnUrl) {
        console.log('[PAB] HTML uploaded to CDN:', cdnUrl);

        try {
          await fetch('https://functions.poehali.dev/8e2c9f7c-c6ea-4e0f-b32d-4b5f0e9a1234', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pab_id: result.pab_id,
              html_url: cdnUrl
            })
          });
          console.log('[PAB] HTML URL saved to DB');
        } catch (error) {
          console.error('[PAB] Error saving HTML URL to DB:', error);
        }

        const recipients: string[] = [];
        for (const obs of observationsWithPhotos) {
          const responsibleFio = obs.responsible_person;
          const orgUsersResponse = await fetch(`https://functions.poehali.dev/bceeaee7-5cfa-418c-9c0d-0a61668ab1a4?organization_id=${organizationId}`);
          const orgUsers = await orgUsersResponse.json();
          
          if (Array.isArray(orgUsers)) {
            const user = orgUsers.find((u: { fio: string; email: string }) => u.fio === responsibleFio);
            if (user?.email && !recipients.includes(user.email)) {
              recipients.push(user.email);
            }
          }
        }

        console.log('[PAB] Sending email to:', recipients);

        if (recipients.length > 0) {
          await sendEmail(
            recipients,
            `Новое наблюдение ПАБ: ${docNumber}`,
            `Вам назначено наблюдение в карте ПАБ №${docNumber}. Ознакомьтесь с деталями по ссылке: ${cdnUrl}`,
            [{ filename: `${docNumber}.html`, url: cdnUrl }]
          );
          setShowEmailStatus(true);
        }
      }

      // Отправляем уведомления
      const notificationData = {
        form_type: 'pab',
        doc_number: docNumber,
        report_id: result.pab_id,
        organization_id: parseInt(organizationId),
        responsible_user_ids: [],
        form_data: {
          observer_name: inspectorFio,
          department,
          observed_name: checkedObject,
          observation_date: docDate
        }
      };
      
      fetch('https://functions.poehali.dev/4a977fe4-5b7e-477d-b142-d85522845415', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      }).then(res => res.json()).then(notifResult => {
        if (notifResult.success) {
          console.log(`Уведомления отправлены: email: ${notifResult.email_sent}`);
        }
      }).catch(err => console.error('Error sending notifications:', err));

      toast.success(
        <div className="flex flex-col gap-2">
          <div className="font-bold">✅ Карта ПАБ успешно сохранена!</div>
          <div className="text-sm text-gray-600">
            <strong>Номер:</strong> {docNumber}<br/>
            <strong>Дата:</strong> {docDate}<br/>
            <strong>ID в базе:</strong> {result.pab_id}<br/>
            <strong>Место хранения:</strong> База данных (таблица: pab_records)<br/>
            <strong>📧 Уведомления:</strong> Отправлены администратору
          </div>
          {cdnUrl && (
            <a 
              href={cdnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline text-left mt-1"
            >
              📄 Открыть сохранённую карту ПАБ
            </a>
          )}
          <button 
            onClick={() => navigate('/pab-list')}
            className="text-blue-600 hover:text-blue-800 text-sm underline text-left"
          >
            📋 Перейти к списку всех карт ПАБ
          </button>
        </div>,
        {
          duration: Infinity,
          closeButton: true
        }
      );
      setTimeout(() => {
        navigate('/pab-list');
      }, 3000);
    } else {
      toast.error(result.error || 'Ошибка сохранения карты ПАБ');
    }
  } catch (error) {
    console.error('Error submitting PAB:', error);
    toast.error('Ошибка отправки данных');
  } finally {
    setLoading(false);
  }
}