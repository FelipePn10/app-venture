export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id?: string;
  name: string;
  email?: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  userName: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: AuthUser;
}

export interface SessionProfileResponse {
  userName?: string;
  user?: AuthUser;
}
