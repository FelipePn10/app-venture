import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { getClientVersion } from '@/services/clientVersion';
import { notifyClientUpgradeRequired, type ClientUpgradeRequiredDetail } from '@/services/versionCompatibility';

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim();

export const httpClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;

  config.headers = config.headers ?? {};
  config.headers['X-ERP-Client-Version'] = await getClientVersion();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 426) {
      const body = error.response.data as ClientUpgradeRequiredDetail | undefined;
      notifyClientUpgradeRequired({
        clientVersion: body?.client_version ?? body?.clientVersion,
        minClient: body?.min_client ?? body?.minClient,
        message: body?.message,
      });
    }

    if (error?.response?.status === 401) {
      useAuthStore.getState().clearAuthData();
    }

    return Promise.reject(error);
  },
);
