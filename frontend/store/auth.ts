// frontend/store/auth.ts
import { create } from 'zustand';
import * as storage from '../lib/storage';
import { getMe } from '../lib/api';
import type { UserOut } from '../types/api';

interface AuthStore {
  token: string | null;
  user: UserOut | null;
  hydrated: boolean;
  setAuth: (token: string, user: UserOut) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>(set => ({
  token: null,
  user: null,
  hydrated: false,
  setAuth: async (token, user) => {
    await storage.setToken(token);
    set({ token, user });
  },
  clearAuth: async () => {
    await storage.removeToken();
    set({ token: null, user: null });
  },
  hydrate: async () => {
    try {
      const token = await storage.getToken();
      if (token) {
        const user = await getMe();
        set({ token, user, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      await storage.removeToken();
      set({ token: null, user: null, hydrated: true });
    }
  },
}));
