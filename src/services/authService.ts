import { httpClient } from "@/services/httpClient";
import type { AuthResponse, LoginPayload } from "@/types/auth";

const SIMULATED_DELAY_MS = 800;
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== "false";

async function simulateLogin(payload: LoginPayload): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

  if (!payload.email || !payload.password) {
    throw new Error("Preencha e-mail e senha para continuar.");
  }

  return {
    token: "mock-jwt-token",
    userName: "Usuário ERP",
  };
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  if (USE_MOCK_AUTH) {
    return simulateLogin(payload);
  }

  const response = await httpClient.post<AuthResponse>("/auth/login", payload);
  return response.data;
}
