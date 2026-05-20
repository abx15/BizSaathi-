import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response.data, // unwrap { success, data } envelope
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(`${BASE_URL}/v1/auth/token/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        const { accessToken, refreshToken: newRefresh } = res.data.data;
        useAuthStore.getState().setTokens(accessToken, newRefresh);
        
        if (original.headers) {
          original.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = '/login';
        }
      }
    }

    // Extract error message from API envelope
    const message = error.response?.data?.error?.message || error.message || 'Kuch galat ho gaya';
    return Promise.reject(new Error(message));
  }
);

// Typed API call helpers
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return apiClient.get(url, config);
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return apiClient.post(url, data, config);
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  return apiClient.put(url, data);
}

export async function del<T>(url: string): Promise<T> {
  return apiClient.delete(url);
}
