export interface User {
  id: number;
  email: string;
  timezone: string;
  date_joined: string;
}

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) headers.set('X-CSRFToken', csrfToken);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include'
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? String(data.detail) : response.statusText;
    throw new Error(detail);
  }

  return data as T;
}

export const api = {
  health: () => request<{ status: string }>('/health/'),
  csrf: () => request<void>('/auth/csrf/'),
  login: (email: string, password: string) =>
    request<User>('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout/', { method: 'POST' }),
  me: () => request<User>('/auth/me/')
};
