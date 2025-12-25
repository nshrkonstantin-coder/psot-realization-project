import { useEffect } from 'react';

/**
 * Хук для автоматической синхронизации organizationId при загрузке приложения
 * Проверяет и обновляет organizationId для уже залогиненных пользователей
 */
export const useOrganizationSync = () => {
  useEffect(() => {
    const syncOrganizationId = async () => {
      const userId = localStorage.getItem('userId');
      const existingOrgId = localStorage.getItem('organizationId');
      
      // Если пользователь залогинен, но organizationId отсутствует
      if (userId && !existingOrgId) {
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
            
            // Сохраняем organizationId если он есть в профиле
            if (userData.organization_id) {
              localStorage.setItem('organizationId', userData.organization_id.toString());
              console.log('✅ organizationId синхронизирован:', userData.organization_id);
              
              // Перезагружаем страницу для применения изменений
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Ошибка синхронизации organizationId:', error);
        }
      }
    };
    
    syncOrganizationId();
  }, []);
};
