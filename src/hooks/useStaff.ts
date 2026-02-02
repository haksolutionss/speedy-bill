import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StaffPermissions } from '@/types/settings';
import { DEFAULT_STAFF_PERMISSIONS } from '@/types/settings';

interface StaffMember {
  id: string;
  mobile: string;
  name: string | null;
  role: 'admin' | 'manager' | 'staff';
  isActive: boolean;
  createdAt: string;
  permissions: StaffPermissions;
}

interface UseStaffReturn {
  staff: StaffMember[];
  isLoading: boolean;
  loadStaff: () => Promise<void>;
  addStaff: (mobile: string, pin: string, name: string, role: 'manager' | 'staff', permissions: StaffPermissions) => Promise<boolean>;
  updateStaff: (id: string, name: string, role: 'manager' | 'staff', permissions: StaffPermissions) => Promise<boolean>;
  toggleActive: (member: StaffMember) => Promise<void>;
}

export function useStaff(): UseStaffReturn {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hashPin = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const staffWithPermissions: StaffMember[] = await Promise.all(
        (users || []).map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          const { data: permData } = await supabase
            .from('staff_permissions')
            .select('*')
            .eq('user_id', user.id)
            .single();

          const role = (roleData?.role || user.role) as 'admin' | 'manager' | 'staff';

          const permissions: StaffPermissions = role === 'admin'
            ? {
              canAccessBilling: true,
              canAccessProducts: true,
              canAccessTables: true,
              canAccessReports: true,
              canAccessHistory: true,
              canAccessSettings: true,
              canAccessCustomers: true,
              canAccessStaff: true,
            }
            : permData
              ? {
                canAccessBilling: permData.can_access_billing,
                canAccessProducts: permData.can_access_products,
                canAccessTables: permData.can_access_tables,
                canAccessReports: permData.can_access_reports,
                canAccessHistory: permData.can_access_history,
                canAccessSettings: permData.can_access_settings,
                canAccessCustomers: permData.can_access_customers,
                canAccessStaff: permData.can_access_staff,
              }
              : DEFAULT_STAFF_PERMISSIONS;

          return {
            id: user.id,
            mobile: user.mobile,
            name: user.name,
            role,
            isActive: user.is_active,
            createdAt: user.created_at,
            permissions,
          };
        })
      );

      setStaff(staffWithPermissions);
    } catch (err) {
      console.error('Failed to load staff:', err);
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addStaff = useCallback(async (
    mobile: string,
    pin: string,
    name: string,
    role: 'manager' | 'staff',
    permissions: StaffPermissions
  ): Promise<boolean> => {
    try {
      const pinHash = hashPin(pin);
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          mobile,
          pin_hash: pinHash,
          name: name || null,
          role,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Mobile number already registered');
        } else {
          throw error;
        }
        return false;
      }

      await supabase
        .from('user_roles')
        .insert({ user_id: newUser.id, role });

      await supabase
        .from('staff_permissions')
        .insert({
          user_id: newUser.id,
          can_access_billing: permissions.canAccessBilling,
          can_access_products: permissions.canAccessProducts,
          can_access_tables: permissions.canAccessTables,
          can_access_reports: permissions.canAccessReports,
          can_access_history: permissions.canAccessHistory,
          can_access_settings: permissions.canAccessSettings,
          can_access_customers: permissions.canAccessCustomers,
          can_access_staff: permissions.canAccessStaff,
        });

      await loadStaff();
      return true;
    } catch (err) {
      console.error('Failed to add staff:', err);
      toast.error('Failed to add staff member');
      return false;
    }
  }, [loadStaff]);

  const updateStaff = useCallback(async (
    id: string,
    name: string,
    role: 'manager' | 'staff',
    permissions: StaffPermissions
  ): Promise<boolean> => {
    try {
      await supabase
        .from('users')
        .update({ name: name || null, role })
        .eq('id', id);

      await supabase
        .from('user_roles')
        .upsert({ user_id: id, role });

      await supabase
        .from('staff_permissions')
        .upsert({
          user_id: id,
          can_access_billing: permissions.canAccessBilling,
          can_access_products: permissions.canAccessProducts,
          can_access_tables: permissions.canAccessTables,
          can_access_reports: permissions.canAccessReports,
          can_access_history: permissions.canAccessHistory,
          can_access_settings: permissions.canAccessSettings,
          can_access_customers: permissions.canAccessCustomers,
          can_access_staff: permissions.canAccessStaff,
        });

      await loadStaff();
      return true;
    } catch (err) {
      console.error('Failed to update staff:', err);
      toast.error('Failed to update staff member');
      return false;
    }
  }, [loadStaff]);

  const toggleActive = useCallback(async (member: StaffMember) => {
    try {
      await supabase
        .from('users')
        .update({ is_active: !member.isActive })
        .eq('id', member.id);

      await loadStaff();
    } catch (err) {
      console.error('Failed to toggle staff status:', err);
      toast.error('Failed to update staff status');
    }
  }, [loadStaff]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return {
    staff,
    isLoading,
    loadStaff,
    addStaff,
    updateStaff,
    toggleActive,
  };
}
