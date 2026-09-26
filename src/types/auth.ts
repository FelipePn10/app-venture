export interface LoginPayload {
  email: string;
  password: string;
  /**
   * "Manter conectado". Com ele o backend emite um token de uma semana, que o
   * app renova a cada abertura até o teto de 30 dias; sem ele a sessão vale o
   * dia e some quando o app fecha.
   */
  rememberMe?: boolean;
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
  /** Eco da escolha aceita pelo backend — é ela que define o prazo do token. */
  rememberMe?: boolean;
  user?: AuthUser;
}

/** Resposta da renovação de sessão (`POST /users/session/renew`). */
export interface SessionRenewResponse {
  token: string;
  expiresAt?: string;
  rememberMe?: boolean;
}

export interface SessionProfileResponse {
  userName?: string;
  user?: AuthUser;
}
