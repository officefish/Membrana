export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  login: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: AuthUser;
}
