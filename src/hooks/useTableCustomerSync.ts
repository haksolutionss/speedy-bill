 import { useEffect, useRef, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useUIStore } from '@/store/uiStore';
 import type { DbTable } from '@/types/database';
 
 interface TableCustomerData {
   customerId: string | null;
   customerName: string | null;
   customerPhone: string | null;
   customerLoyaltyPoints: number;
   loyaltyPointsToUse: number;
 }
 
 // In-memory storage for table-customer mappings (cleared on bill settlement)
 const tableCustomerMap = new Map<string, TableCustomerData>();
 
 /**
  * Hook to manage customer/loyalty persistence per table
  * - Stores customer assignment per table ID
  * - Clears when bill is settled
  * - Persists across table switches
  */
 export function useTableCustomerSync() {
   const { selectedTable } = useUIStore();
   
   // Get customer data for current table
   const getTableCustomer = useCallback((tableId: string): TableCustomerData | null => {
     return tableCustomerMap.get(tableId) || null;
   }, []);
   
   // Set customer data for a table
   const setTableCustomer = useCallback((tableId: string, data: TableCustomerData) => {
     tableCustomerMap.set(tableId, data);
   }, []);
   
   // Clear customer data for a table (call on bill settlement)
   const clearTableCustomer = useCallback((tableId: string) => {
     tableCustomerMap.delete(tableId);
   }, []);
   
   // Get current table's customer
   const currentTableCustomer = selectedTable?.id 
     ? getTableCustomer(selectedTable.id) 
     : null;
   
   return {
     getTableCustomer,
     setTableCustomer,
     clearTableCustomer,
     currentTableCustomer,
     tableCustomerMap, // For debugging
   };
 }
 
 // Export for use in other modules
 export { tableCustomerMap };