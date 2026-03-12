export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userName: string;
}
