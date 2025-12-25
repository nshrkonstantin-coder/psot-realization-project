import { useEffect } from 'react';

/**
 * Хук для автоматической синхронизации данных пользователя при загрузке приложения
 * Проверяет и обновляет organizationId и email для уже залогиненных пользователей
 */
export const useOrganizationSync = () => {
  useEffect(() => {
    const syncUserData = async () => {
      const userId = localStorage.getItem('userId');
      const existingOrgId = localStorage.getItem('organizationId');
      const existingEmail = localStorage.getItem('userEmail');
      
      // Если пользователь залогинен, но нет organizationId или email
      if (userId && (!existingOrgId || !existingEmail || existingEmail === 'Не указан')) {
        try {
          const response = await fetch(
            `https://functions.poehali.dev/14fc7c96-08ce-46ad-81b8-3d2bb9f63638?userId=${userId}`,
            {
              headers: {
                'X-User-Id': userId
              }
            }
          );
          
          if (response.ok) {
            const userData = await response.json();
            let needsReload = false;
            
            // Сохраняем organizationId если он есть в профиле
            if (userData.organization_id && !existingOrgId) {
              localStorage.setItem('organizationId', userData.organization_id.toString());
              console.log('✅ organizationId синхронизирован:', userData.organization_id);
              needsReload = true;
            }
            
            // Сохраняем email если он есть в профиле
            if (userData.email && (!existingEmail || existingEmail === 'Не указан')) {
              localStorage.setItem('userEmail', userData.email);
              console.log('✅ userEmail синхронизирован:', userData.email);
              needsReload = true;
            }
            
            // Перезагружаем страницу для применения изменений
            if (needsReload) {
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Ошибка синхронизации данных пользователя:', error);
        }
      }
    };
    
    syncUserData();
  }, []);
};