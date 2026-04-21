/**
 * Централизованный API-клиент.
 * Передаёт токен через ?token= (GET) или в теле запроса (POST/PUT/DELETE).
 * Кастомные заголовки не используются — прокси их дропает.
 */

export async function apiFetch(url: string, options: RequestInit = {}, autoRedirect = false): Promise<Response> {
  const token = localStorage.getItem('sessionToken') || '';
  const method = (options.method || 'GET').toUpperCase();

  let finalUrl = url;
  let finalOptions: RequestInit = { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } };

  if (method === 'GET' || method === 'DELETE' && !options.body) {
    // Добавляем token в query-параметры
    const separator = url.includes('?') ? '&' : '?';
    if (token) finalUrl = `${url}${separator}token=${token}`;
  } else {
    // Добавляем token в тело запроса
    if (token) {
      try {
        const body = options.body ? JSON.parse(options.body as string) : {};
        body.token = token;
        finalOptions = { ...finalOptions, body: JSON.stringify(body) };
      } catch {
        // Если тело не JSON (например FormData) — не трогаем
      }
    }
  }

  const response = await fetch(finalUrl, finalOptions);

  if (response.status === 401 && autoRedirect) {
    clearSession();
    window.location.href = '/';
  }

  return response;
}

export function getAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
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
