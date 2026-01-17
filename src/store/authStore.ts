import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/types/settings';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (mobile: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  signup: (mobile: string, pin: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

// Simple hash function for PIN (in production, use bcrypt on server)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (mobile: string, pin: string) => {
        try {
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('mobile', mobile)
            .eq('is_active', true)
            .single();

          if (error || !users) {
            return { success: false, error: 'User not found' };
          }

          const pinHash = hashPin(pin);
          if (users.pin_hash !== pinHash) {
            return { success: false, error: 'Incorrect PIN' };
          }

          const user: User = {
            id: users.id,
            mobile: users.mobile,
            name: users.name,
            role: users.role as User['role'],
            isActive: users.is_active,
            createdAt: users.created_at,
          };

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          console.error('Login error:', err);
          return { success: false, error: 'Login failed' };
        }
      },

      signup: async (mobile: string, pin: string, name?: string) => {
        try {
          // Check if user already exists
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('mobile', mobile)
            .single();

          if (existing) {
            return { success: false, error: 'Mobile number already registered' };
          }

          const pinHash = hashPin(pin);
          
          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              mobile,
              pin_hash: pinHash,
              name: name || null,
              role: 'admin', // First user is admin
            })
            .select()
            .single();

          if (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Failed to create account' };
          }

          const user: User = {
            id: newUser.id,
            mobile: newUser.mobile,
            name: newUser.name,
            role: newUser.role as User['role'],
            isActive: newUser.is_active,
            createdAt: newUser.created_at,
          };

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          console.error('Signup error:', err);
          return { success: false, error: 'Signup failed' };
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      checkAuth: async () => {
        const currentUser = get().user;
        if (currentUser) {
          // Verify user still exists and is active
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .eq('is_active', true)
            .single();

          if (!data) {
            set({ user: null, isAuthenticated: false, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
