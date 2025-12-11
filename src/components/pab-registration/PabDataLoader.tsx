import { useEffect } from 'react';

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

interface PabDataLoaderProps {
  onDictionariesLoaded: (dictionaries: Dictionaries) => void;
  onDocNumberLoaded: (docNumber: string) => void;
  onUserDataLoaded: (fio: string, position: string, subdivision: string) => void;
  onOrgUsersLoaded: (users: OrgUser[]) => void;
  onAllowSingleObservation: (allow: boolean) => void;
}

export function PabDataLoader({
  onDictionariesLoaded,
  onDocNumberLoaded,
  onUserDataLoaded,
  onOrgUsersLoaded,
  onAllowSingleObservation
}: PabDataLoaderProps) {
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userFio = localStorage.getItem('userFio') || '';
    
    if (userFio === 'Сергеев Дем Демович') {
      onAllowSingleObservation(true);
    }
    
    if (userId) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    const userId = localStorage.getItem('userId');
    const organizationId = localStorage.getItem('organizationId');
    
    try {
      const dictResponse = await fetch('https://functions.poehali.dev/8a3ae143-7ece-49b7-9863-4341c4bef960');
      const dictData = await dictResponse.json();
      onDictionariesLoaded(dictData);
    } catch (error) {
      console.error('Error loading dictionaries:', error);
    }

    try {
      const numberResponse = await fetch('https://functions.poehali.dev/c04242d9-b386-407e-bb84-10d219a16e97');
      const numberData = await numberResponse.json();
      onDocNumberLoaded(numberData.doc_number);
    } catch (error) {
      console.error('Error generating doc number:', error);
      onDocNumberLoaded('ПАБ-' + Date.now());
    }

    if (userId) {
      try {
        const userResponse = await fetch(`https://functions.poehali.dev/1428a44a-2d14-4e76-86e5-7e660fdfba3f?userId=${userId}`);
        const userData = await userResponse.json();
        if (userData.success && userData.user) {
          onUserDataLoaded(
            userData.user.fio || '',
            userData.user.position || '',
            userData.user.subdivision || ''
          );
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
          onOrgUsersLoaded(usersData);
        } else {
          onOrgUsersLoaded([]);
        }
      } catch (error) {
        console.error('Error loading organization users:', error);
        onOrgUsersLoaded([]);
      }
    }
  };

  return null;
}
