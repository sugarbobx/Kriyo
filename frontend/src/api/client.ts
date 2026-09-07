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
    if (data && typeof data === 'object' && 'detail' in data) {
      throw new Error(String(data.detail));
    }
    if (data && typeof data === 'object') {
      throw new ApiValidationError(data as Record<string, string[]>);
    }
    throw new Error(response.statusText);
  }

  return data as T;
}

export class ApiValidationError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>) {
    super(Object.values(fieldErrors).flat().join(' '));
    this.fieldErrors = fieldErrors;
  }
}

export const api = {
  health: () => request<{ status: string }>('/health/'),
  csrf: () => request<void>('/auth/csrf/'),
  signup: (email: string, password: string) =>
    request<User>('/auth/signup/', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<User>('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout/', { method: 'POST' }),
  me: () => request<User>('/auth/me/')
};
