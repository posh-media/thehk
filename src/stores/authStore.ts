import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types/domain';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: User | null) => void;
  signIn: (user: User) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      authError: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      signIn: (user) => set({ user, isAuthenticated: true, isLoading: false, authError: null }),
      signOut: () => set({ user: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setAuthError: (authError) => set({ authError, isLoading: false, isAuthenticated: false, user: null }),
      clearAuthError: () => set({ authError: null }),
    }),
    {
      name: '@thehk/auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
