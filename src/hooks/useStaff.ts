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
  error: string | null;
  loadStaff: () => Promise<void>;
  refetch: () => Promise<void>;
  addStaff: (mobile: string, pin: string, name: string, role: 'manager' | 'staff', permissions: StaffPermissions) => Promise<boolean>;
  updateStaff: (id: string, name: string, role: 'manager' | 'staff', permissions: StaffPermissions) => Promise<boolean>;
  toggleActive: (member: StaffMember) => Promise<void>;
}

export function useStaff(): UseStaffReturn {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

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
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Failed to load staff:', err);
      setError(errorMessage);
      toast.error('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await loadStaff();
  }, [loadStaff]);

  const addStaff = useCallback(async (
    mobile: string,
    pin: string,
    name: string,
    role: 'manager' | 'staff',
    permissions: StaffPermissions
  ): Promise<boolean> => {
    try {
      const pinHash = hashPin(pin);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          mobile,
          pin_hash: pinHash,
          name: name || null,
          role,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('Mobile number already registered');
        } else {
          throw insertError;
        }
        return false;
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUser.id, role });

      if (roleError) throw roleError;

      const { error: permError } = await supabase
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

      if (permError) throw permError;

      toast.success('Staff member added successfully');
      await loadStaff();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add staff member';
      console.error('Failed to add staff:', err);
      toast.error(errorMessage);
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
      const { error: userError } = await supabase
        .from('users')
        .update({ name: name || null, role })
        .eq('id', id);

      if (userError) throw userError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: id, role });

      if (roleError) throw roleError;

      const { error: permError } = await supabase
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

      if (permError) throw permError;

      toast.success('Staff member updated successfully');
      await loadStaff();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update staff member';
      console.error('Failed to update staff:', err);
      toast.error(errorMessage);
      return false;
    }
  }, [loadStaff]);

  const toggleActive = useCallback(async (member: StaffMember) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: !member.isActive })
        .eq('id', member.id);

      if (updateError) throw updateError;

      toast.success(`Staff member ${!member.isActive ? 'activated' : 'deactivated'} successfully`);
      await loadStaff();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update staff status';
      console.error('Failed to toggle staff status:', err);
      toast.error(errorMessage);
    }
  }, [loadStaff]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return {
    staff,
    isLoading,
    error,
    loadStaff,
    refetch,
    addStaff,
    updateStaff,
    toggleActive,
  };
}