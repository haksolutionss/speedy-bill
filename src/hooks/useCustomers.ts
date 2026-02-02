import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
}

interface UseCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCustomers: Customer[];
  addCustomer: (data: { name: string; phone: string; email: string; points: number }) => Promise<boolean>;
  updateCustomer: (id: string, data: { name: string; email: string; points: number }) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<void>;
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const addCustomer = useCallback(async (data: { name: string; phone: string; email: string; points: number }): Promise<boolean> => {
    if (!data.name.trim() || !data.phone.trim()) {
      toast.error('Name and phone are required');
      return false;
    }

    if (!/^\d{10}$/.test(data.phone.replace(/\D/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .insert({
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email.trim() || null,
          loyalty_points: data.points,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this phone number already exists');
        } else {
          throw error;
        }
        return false;
      }

      await loadCustomers();
      return true;
    } catch (err) {
      console.error('Failed to add customer:', err);
      toast.error('Failed to add customer');
      return false;
    }
  }, [loadCustomers]);

  const updateCustomer = useCallback(async (id: string, data: { name: string; email: string; points: number }): Promise<boolean> => {
    if (!data.name.trim()) {
      toast.error('Name is required');
      return false;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: data.name.trim(),
          email: data.email.trim() || null,
          loyalty_points: data.points,
        })
        .eq('id', id);

      if (error) throw error;

      await loadCustomers();
      return true;
    } catch (err) {
      console.error('Failed to update customer:', err);
      toast.error('Failed to update customer');
      return false;
    }
  }, [loadCustomers]);

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      toast.error('Failed to delete customer');
    }
  }, [loadCustomers]);

  return {
    customers,
    isLoading,
    searchQuery,
    setSearchQuery,
    filteredCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
