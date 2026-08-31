import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@infrastructure/firebase';
import { User } from '@/types/domain';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: User | null) => void;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
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
      signOut: async () => {
        try {
          await firebaseSignOut(auth);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Firebase signOut failed:', err);
          // Still clear local state so the user isn't stuck if Firebase is unavailable.
        }
        // Clear the persisted auth entry explicitly in case the middleware hasn't flushed yet.
        await AsyncStorage.removeItem('@thehk/auth-store').catch(() => undefined);
        set({ user: null, isAuthenticated: false, isLoading: false, authError: null });
      },
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
