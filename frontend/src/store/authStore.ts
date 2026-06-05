import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import api from '../lib/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'member';
  avatar?: string;
  isActive: boolean;
  isDisabled?: boolean;
  joinedAt: string;
  lastLogin?: string;
  createdAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  installmentAmount: number;
  dueDay: number;
  penaltyRate: number;
  qrCodeImage?: string;
  upiId?: string;
  upiName?: string;
  minimumVotesRequired: number;
  startDate?: string;
  rules?: string[];
}

interface AuthState {
  user: User | null;
  group: Group | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  setGroup: (group: Group) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      group: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, group, tokens } = response.data.data;

          // Store tokens
          Cookies.set('accessToken', tokens.accessToken, { expires: 1 / 96 });
          Cookies.set('refreshToken', tokens.refreshToken, { expires: 7 });
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);

          set({ user, group, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          // Ignore errors
        }
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, group: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const { user, group } = response.data.data;
          set({ user, group, isAuthenticated: true });
        } catch (error) {
          set({ user: null, group: null, isAuthenticated: false });
        }
      },

      setUser: (user: User) => set({ user }),
      setGroup: (group: Group) => set({ group }),
    }),
    {
      name: 'raftar-auth',
      partialize: (state) => ({
        user: state.user,
        group: state.group,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
