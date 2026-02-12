import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { User, StaffPermissions, ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types/settings';
import { useUIStore } from './uiStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiresAt: string | null;

  // Actions
  login: (mobile: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  signup: (mobile: string, pin: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  loadUserPermissions: (userId: string) => Promise<StaffPermissions>;
  hasPermission: (permission: keyof StaffPermissions) => boolean;
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

// Session validity: 24 hours
const SESSION_DURATION_HOURS = 24;

// Get session expiry date (24 hours from now)
const getSessionExpiry = (): string => {
  const date = new Date();
  date.setHours(date.getHours() + SESSION_DURATION_HOURS);
  return date.toISOString();
};

// Check if session is expired
const isSessionExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
};

// Allowed localStorage keys after login
const ALLOWED_STORAGE_KEYS = [
  'auth-storage',
  'billing-ui-storage',
  'settings-storage',
];

/**
 * Clear all localStorage except allowed keys.
 * Called on app launch and on logout.
 */
function clearNonAllowedStorage() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !ALLOWED_STORAGE_KEYS.includes(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear ALL localStorage (used on logout / session expiry)
 */
function clearAllStorage() {
  localStorage.clear();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      sessionExpiresAt: null,

      loadUserPermissions: async (userId: string): Promise<StaffPermissions> => {
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

          if (roleData?.role === 'admin') {
            return {
              canAccessBilling: true,
              canAccessProducts: true,
              canAccessTables: true,
              canAccessReports: true,
              canAccessHistory: true,
              canAccessSettings: true,
              canAccessCustomers: true,
              canAccessStaff: true,
            };
          }

          const { data: permData } = await supabase
            .from('staff_permissions')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (permData) {
            return {
              canAccessBilling: permData.can_access_billing,
              canAccessProducts: permData.can_access_products,
              canAccessTables: permData.can_access_tables,
              canAccessReports: permData.can_access_reports,
              canAccessHistory: permData.can_access_history,
              canAccessSettings: permData.can_access_settings,
              canAccessCustomers: permData.can_access_customers,
              canAccessStaff: permData.can_access_staff,
            };
          }

          return {
            canAccessBilling: true,
            canAccessProducts: false,
            canAccessTables: false,
            canAccessReports: false,
            canAccessHistory: false,
            canAccessSettings: false,
            canAccessCustomers: false,
            canAccessStaff: false,
          };
        } catch (err) {
          console.error('Failed to load permissions:', err);
          return {
            canAccessBilling: true,
            canAccessProducts: false,
            canAccessTables: false,
            canAccessReports: false,
            canAccessHistory: false,
            canAccessSettings: false,
            canAccessCustomers: false,
            canAccessStaff: false,
          };
        }
      },

      hasPermission: (permission: keyof StaffPermissions): boolean => {
        const user = get().user;
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.[permission] ?? false;
      },

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

          // Load permissions
          const permissions = await get().loadUserPermissions(users.id);

          // Get role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', users.id)
            .single();

          const user: User = {
            id: users.id,
            mobile: users.mobile,
            name: users.name,
            role: (roleData?.role || users.role) as User['role'],
            isActive: users.is_active,
            createdAt: users.created_at,
            permissions,
          };

          const sessionExpiresAt = getSessionExpiry();

          // Update session expiry in database
          await supabase
            .from('users')
            .update({ session_expires_at: sessionExpiresAt })
            .eq('id', users.id);

          set({ user, isAuthenticated: true, isLoading: false, sessionExpiresAt });

          // Sync latest bill number from DB
          const { data: lastBill } = await supabase
            .from('bills')
            .select('bill_number')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          useUIStore.setState({
            currentBillNumber: lastBill?.bill_number || 'BILL-0000'
          });

          return { success: true };
        } catch (err) {
          console.error('Login error:', err);
          return { success: false, error: 'Login failed' };
        }
      },

      signup: async (mobile: string, pin: string, name?: string) => {
        try {
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('mobile', mobile)
            .single();

          if (existing) {
            return { success: false, error: 'Mobile number already registered' };
          }

          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

          const isFirstUser = count === 0;
          const pinHash = hashPin(pin);
          const sessionExpiresAt = getSessionExpiry();

          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              mobile,
              pin_hash: pinHash,
              name: name || null,
              role: isFirstUser ? 'admin' : 'staff',
              session_expires_at: sessionExpiresAt,
            })
            .select()
            .single();

          if (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Failed to create account' };
          }

          await supabase
            .from('user_roles')
            .insert({
              user_id: newUser.id,
              role: isFirstUser ? 'admin' : 'staff',
            });

          if (!isFirstUser) {
            await supabase
              .from('staff_permissions')
              .insert({
                user_id: newUser.id,
                can_access_billing: true,
              });
          }

          const permissions = await get().loadUserPermissions(newUser.id);

          const user: User = {
            id: newUser.id,
            mobile: newUser.mobile,
            name: newUser.name,
            role: isFirstUser ? 'admin' : 'staff',
            isActive: newUser.is_active,
            createdAt: newUser.created_at,
            permissions,
          };

          set({ user, isAuthenticated: true, isLoading: false, sessionExpiresAt });
          return { success: true };
        } catch (err) {
          console.error('Signup error:', err);
          return { success: false, error: 'Signup failed' };
        }
      },

      logout: () => {
        // Clear ALL localStorage on logout
        clearAllStorage();
        set({ user: null, isAuthenticated: false, sessionExpiresAt: null });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      checkAuth: async () => {
        const { user: currentUser, sessionExpiresAt } = get();

        // Check if session is expired (24h)
        if (isSessionExpired(sessionExpiresAt)) {
          // Session expired - full cleanup
          clearAllStorage();
          set({ user: null, isAuthenticated: false, isLoading: false, sessionExpiresAt: null });
          return;
        }

        if (currentUser) {
          // Verify user still exists and is active
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .eq('is_active', true)
            .single();

          if (!data) {
            clearAllStorage();
            set({ user: null, isAuthenticated: false, isLoading: false, sessionExpiresAt: null });
          } else {
            // Reload permissions in case they changed
            const permissions = await get().loadUserPermissions(currentUser.id);
            set({
              user: { ...currentUser, permissions },
              isLoading: false
            });
          }
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
);
