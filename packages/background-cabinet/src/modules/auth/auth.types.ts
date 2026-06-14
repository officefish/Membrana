export interface AuthUser {
  id: string;
  login: string;
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
