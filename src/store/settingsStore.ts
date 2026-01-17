import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { AppSettings, Printer, LoyaltySettings, BillingDefaults } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Json } from '@/integrations/supabase/types';

interface SettingsState {
  settings: AppSettings;
  printers: Printer[];
  isLoading: boolean;
  isSyncing: boolean;
  
  // Settings actions
  updateSettings: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  loadSettings: () => Promise<void>;
  syncToSupabase: () => Promise<void>;
  resetSettings: () => void;
  
  // Loyalty helpers
  calculateLoyaltyPoints: (amount: number) => number;
  calculateRedemptionValue: (points: number) => number;
  
  // Printer actions
  loadPrinters: () => Promise<void>;
  addPrinter: (printer: Omit<Printer, 'id'>) => Promise<void>;
  updatePrinter: (id: string, updates: Partial<Printer>) => Promise<void>;
  deletePrinter: (id: string) => Promise<void>;
  setDefaultPrinter: (id: string, role: Printer['role']) => Promise<void>;
  getPrinterByRole: (role: Printer['role']) => Printer | undefined;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      printers: [],
      isLoading: true,
      isSyncing: false,

      updateSettings: async (key, value) => {
        const newSettings = { ...get().settings, [key]: value };
        set({ settings: newSettings });
        
        // Sync to Supabase in background
        get().syncToSupabase();
      },

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          // Load each setting key from Supabase
          const settingKeys = ['business', 'tax', 'theme', 'currency', 'sync', 'loyalty', 'billing', 'onboardingComplete'];
          const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', settingKeys);

          if (error) throw error;

          if (data && data.length > 0) {
            const loadedSettings = { ...get().settings };
            data.forEach((row) => {
              if (row.key === 'onboardingComplete') {
                loadedSettings.onboardingComplete = row.value as unknown as boolean;
              } else {
                (loadedSettings as any)[row.key] = row.value;
              }
            });
            set({ settings: loadedSettings });
          }
        } catch (err) {
          console.error('Failed to load settings:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      syncToSupabase: async () => {
        const { settings, isSyncing } = get();
        if (isSyncing) return;

        set({ isSyncing: true });
        try {
          const settingsToSync = [
            { key: 'business', value: settings.business },
            { key: 'tax', value: settings.tax },
            { key: 'theme', value: settings.theme },
            { key: 'currency', value: settings.currency },
            { key: 'sync', value: settings.sync },
            { key: 'loyalty', value: settings.loyalty },
            { key: 'billing', value: settings.billing },
            { key: 'onboardingComplete', value: settings.onboardingComplete },
          ];

          for (const setting of settingsToSync) {
            // Check if setting exists
            const { data: existing } = await supabase
              .from('settings')
              .select('id')
              .eq('key', setting.key)
              .single();

            if (existing) {
              await supabase
                .from('settings')
                .update({ value: JSON.parse(JSON.stringify(setting.value)) as Json })
                .eq('key', setting.key);
            } else {
              await supabase
                .from('settings')
                .insert([{ key: setting.key, value: JSON.parse(JSON.stringify(setting.value)) as Json }]);
            }
          }
        } catch (err) {
          console.error('Failed to sync settings:', err);
        } finally {
          set({ isSyncing: false });
        }
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },

      // Loyalty helpers
      calculateLoyaltyPoints: (amount: number): number => {
        const { loyalty } = get().settings;
        if (!loyalty.enabled || loyalty.amountForPoints <= 0) return 0;
        return Math.floor(amount / loyalty.amountForPoints) * loyalty.pointsPerAmount;
      },

      calculateRedemptionValue: (points: number): number => {
        const { loyalty } = get().settings;
        if (!loyalty.enabled || points < loyalty.minRedemptionPoints) return 0;
        return points * loyalty.redemptionValue;
      },

      loadPrinters: async () => {
        try {
          const { data, error } = await supabase
            .from('printers')
            .select('*')
            .order('created_at', { ascending: true });

          if (error) throw error;

          const printers: Printer[] = (data || []).map((p) => ({
            id: p.id,
            name: p.name,
            ipAddress: p.ip_address,
            port: p.port || 9100,
            type: p.type as Printer['type'],
            role: p.role as Printer['role'],
            format: p.format as Printer['format'],
            isActive: p.is_active,
            isDefault: p.is_default,
          }));

          set({ printers });
        } catch (err) {
          console.error('Failed to load printers:', err);
        }
      },

      addPrinter: async (printer) => {
        try {
          const { data, error } = await supabase
            .from('printers')
            .insert({
              name: printer.name,
              ip_address: printer.ipAddress,
              port: printer.port,
              type: printer.type,
              role: printer.role,
              format: printer.format,
              is_active: printer.isActive,
              is_default: printer.isDefault,
            })
            .select()
            .single();

          if (error) throw error;

          const newPrinter: Printer = {
            id: data.id,
            name: data.name,
            ipAddress: data.ip_address,
            port: data.port || 9100,
            type: data.type as Printer['type'],
            role: data.role as Printer['role'],
            format: data.format as Printer['format'],
            isActive: data.is_active,
            isDefault: data.is_default,
          };

          set({ printers: [...get().printers, newPrinter] });
        } catch (err) {
          console.error('Failed to add printer:', err);
          throw err;
        }
      },

      updatePrinter: async (id, updates) => {
        try {
          const dbUpdates: Record<string, unknown> = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.ipAddress !== undefined) dbUpdates.ip_address = updates.ipAddress;
          if (updates.port !== undefined) dbUpdates.port = updates.port;
          if (updates.type !== undefined) dbUpdates.type = updates.type;
          if (updates.role !== undefined) dbUpdates.role = updates.role;
          if (updates.format !== undefined) dbUpdates.format = updates.format;
          if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
          if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

          const { error } = await supabase
            .from('printers')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;

          set({
            printers: get().printers.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          });
        } catch (err) {
          console.error('Failed to update printer:', err);
          throw err;
        }
      },

      deletePrinter: async (id) => {
        try {
          const { error } = await supabase
            .from('printers')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set({ printers: get().printers.filter((p) => p.id !== id) });
        } catch (err) {
          console.error('Failed to delete printer:', err);
          throw err;
        }
      },

      setDefaultPrinter: async (id, role) => {
        try {
          // Unset previous default for this role
          await supabase
            .from('printers')
            .update({ is_default: false })
            .eq('role', role);

          // Set new default
          await supabase
            .from('printers')
            .update({ is_default: true })
            .eq('id', id);

          set({
            printers: get().printers.map((p) => ({
              ...p,
              isDefault: p.id === id ? true : p.role === role ? false : p.isDefault,
            })),
          });
        } catch (err) {
          console.error('Failed to set default printer:', err);
          throw err;
        }
      },

      getPrinterByRole: (role) => {
        const { printers } = get();
        return printers.find((p) => p.role === role && p.isDefault && p.isActive) ||
               printers.find((p) => p.role === role && p.isActive);
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings, printers: state.printers }),
    }
  )
);
