// src/components/modules/services/api/authService.ts
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // ── Telefone ────────────────────────────────────────────────
  enviarCodigo: (telefone: string) =>
    api.post('/auth/telefone/enviar-codigo', { telefone }),

  verificarCodigo: (telefone: string, codigo: string) =>
    api.post('/auth/telefone/verificar-codigo', { telefone, codigo }),

  // ── Google ───────────────────────────────────────────────────
  loginGoogle: (data: { uid: string; email?: string; displayName?: string }) =>
    api.post('/auth/google', data),

  // ── Perfil ───────────────────────────────────────────────────
  perfil: () => api.get('/auth/perfil'),

  atualizarPerfil: (dados: {
    nome?: string;
    sobrenome?: string;
    dataNascimento?: string;
    email?: string;
    fcmToken?: string;
  }) => api.patch('/auth/perfil', dados),

  // ── Role ─────────────────────────────────────────────────────
  escolherRole: (role: 'cliente' | 'motoqueiro') =>
    api.patch('/auth/escolher-role', { role }),

  // ── FCM ──────────────────────────────────────────────────────
  atualizarFcmToken: (fcmToken: string) =>
    api.patch('/auth/fcm-token', { fcmToken }),

  // ── Helpers de sessão ────────────────────────────────────────
  salvarSessao: async (user: any) => {
    await AsyncStorage.setItem('@Baza:user', JSON.stringify(user));
  },

  obterSessao: async () => {
    const raw = await AsyncStorage.getItem('@Baza:user');
    return raw ? JSON.parse(raw) : null;
  },

  limparSessao: async () => {
    await AsyncStorage.multiRemove(['@Baza:user', '@Baza:token']);
  },
};