const AUTH_STORAGE_KEY = 'habit_token';

export function saveToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return res;
}
