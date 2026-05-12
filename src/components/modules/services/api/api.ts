// src/components/modules/services/api/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getIdToken } from '../firebase-token';

// ─── IP do servidor — alterar para o IP da tua máquina na rede local ─────────
// Exemplo: 'http://192.168.1.50:3000'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3000';

const api: AxiosInstance = axios.create({
  baseURL: 'http://192.168.43.220:3000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injeta o Firebase Bearer token em todos os pedidos
api.interceptors.request.use(async (config) => {
  try {
    const token = await getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {
    // rotas @Public() não precisam de token
  }
  return config;
});

// Log de erros
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const msg = (error.response?.data as any)?.message || error.message;
    console.warn(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${msg}`);
    return Promise.reject(error);
  },
);

export default api;
