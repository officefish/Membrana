const STORAGE_KEY = 'membrana.cabinet.sessionToken';

/** API base: dev proxy `/api` or explicit env. */
export function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_CABINET_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return '/api';
}

export interface AuthUser {
  id: string;
  login: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function loginRequest(login: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${getApiBase()}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as LoginResponse;
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${getApiBase()}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { user: AuthUser };
  return body.user;
}

export async function logoutRequest(token: string): Promise<void> {
  await fetch(`${getApiBase()}/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
