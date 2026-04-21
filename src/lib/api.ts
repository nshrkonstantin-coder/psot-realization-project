/**
 * Централизованный API-клиент.
 * Автоматически добавляет заголовок Authorization с sessionToken.
 * Все fetch-запросы к бэкенду должны использовать apiFetch вместо fetch.
 */

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('sessionToken');
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole');
  const fio = localStorage.getItem('userFio');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['X-Auth-Token'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  if (role) {
    headers['X-User-Role'] = role;
  }
  if (fio) {
    headers['X-User-Fio'] = encodeURIComponent(fio);
  }

  return headers;
}

export async function apiFetch(url: string, options: RequestInit = {}, autoRedirect = false): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && autoRedirect) {
    clearSession();
    window.location.href = '/';
  }

  return response;
}

export function clearSession(): void {
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userFio');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userPosition');
  localStorage.removeItem('userDepartment');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('organizationId');
  localStorage.removeItem('userCompany');
}