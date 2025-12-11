/**
 * Утилита для автоматической отправки системных уведомлений
 * Используется для логирования ошибок и важных событий
 */

const NOTIFICATIONS_URL = 'https://functions.poehali.dev/93aa0398-4cd1-4a05-956b-50984ea3e98e';

export interface NotificationData {
  type: 'error' | 'warning' | 'info' | 'success';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  pageUrl?: string;
  pageName?: string;
  actionType?: string;
  errorDetails?: string;
  stackTrace?: string;
  metadata?: any;
}

/**
 * Отправляет уведомление в систему
 */
export const sendNotification = async (data: NotificationData): Promise<void> => {
  try {
    const userId = localStorage.getItem('userId');
    const userFio = localStorage.getItem('userFio');
    const organizationId = localStorage.getItem('organizationId');
    
    // Получаем информацию о пользователе и организации
    let userPosition = '';
    let organizationName = '';
    
    if (userId) {
      try {
        const userResponse = await fetch(`https://functions.poehali.dev/9d7b143e-21c6-4e84-95b5-302b35a8eedf?user_id=${userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userPosition = userData.position || '';
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    }
    
    if (organizationId) {
      try {
        const orgResponse = await fetch(`https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b?id=${organizationId}`);
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          organizationName = orgData.name || '';
        }
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
      }
    }

    await fetch(NOTIFICATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        type: data.type,
        severity: data.severity || 'medium',
        title: data.title,
        message: data.message,
        pageUrl: data.pageUrl || window.location.href,
        pageName: data.pageName || document.title,
        userId: userId ? parseInt(userId) : undefined,
        userFio,
        userPosition,
        organizationId: organizationId ? parseInt(organizationId) : undefined,
        organizationName,
        actionType: data.actionType,
        errorDetails: data.errorDetails,
        stackTrace: data.stackTrace,
        metadata: data.metadata
      })
    });
  } catch (error) {
    // Не показываем ошибку пользователю, только логируем в консоль
    console.error('Failed to send notification:', error);
  }
};

/**
 * Логирует ошибку в систему уведомлений
 */
export const logError = async (
  error: Error,
  context: string,
  actionType?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
): Promise<void> => {
  await sendNotification({
    type: 'error',
    severity,
    title: `Ошибка: ${context}`,
    message: error.message,
    actionType,
    errorDetails: error.message,
    stackTrace: error.stack,
    metadata: {
      context,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Логирует предупреждение в систему
 */
export const logWarning = async (
  title: string,
  message: string,
  actionType?: string,
  metadata?: any
): Promise<void> => {
  await sendNotification({
    type: 'warning',
    severity: 'medium',
    title,
    message,
    actionType,
    metadata
  });
};

/**
 * Логирует информационное сообщение
 */
export const logInfo = async (
  title: string,
  message: string,
  actionType?: string,
  metadata?: any
): Promise<void> => {
  await sendNotification({
    type: 'info',
    severity: 'low',
    title,
    message,
    actionType,
    metadata
  });
};

/**
 * Логирует успешное действие
 */
export const logSuccess = async (
  title: string,
  message: string,
  actionType?: string,
  metadata?: any
): Promise<void> => {
  await sendNotification({
    type: 'success',
    severity: 'low',
    title,
    message,
    actionType,
    metadata
  });
};
