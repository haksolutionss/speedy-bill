 import { useEffect, useRef, useCallback, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import type { ProductWithPortions, TableSectionWithTables } from '@/types/database';
 
 // Storage keys
 const STORAGE_KEYS = {
   PRODUCTS: 'pos_cached_products',
   SECTIONS: 'pos_cached_sections',
   PENDING_BILLS: 'pos_pending_bills',
   PENDING_KOTS: 'pos_pending_kots',
   LAST_SYNC: 'pos_last_sync',
 } as const;
 
 interface PendingBill {
   id: string;
   data: Record<string, unknown>;
   items: Record<string, unknown>[];
   createdAt: string;
 }
 
 interface PendingKOT {
   id: string;
   billId: string;
   itemIds: string[];
   createdAt: string;
 }
 
 /**
  * Hook for offline support and data caching
  * - Caches products, tables, and sections in localStorage
  * - Queues bills and KOTs when offline
  * - Syncs pending data when connection is restored
  */
 export function useOfflineSync() {
   const [isOnline, setIsOnline] = useState(navigator.onLine);
   const [isSyncing, setIsSyncing] = useState(false);
   const [pendingCount, setPendingCount] = useState(0);
   const syncInProgressRef = useRef(false);
 
   // Monitor online/offline status
   useEffect(() => {
     const handleOnline = () => {
       console.log('[OfflineSync] Connection restored');
       setIsOnline(true);
       // Trigger sync when back online
       syncPendingData();
     };
 
     const handleOffline = () => {
       console.log('[OfflineSync] Connection lost');
       setIsOnline(false);
     };
 
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);
 
     return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
     };
   }, []);
 
   // Update pending count
   useEffect(() => {
     const updatePendingCount = () => {
       const bills = getPendingBills();
       const kots = getPendingKOTs();
       setPendingCount(bills.length + kots.length);
     };
 
     updatePendingCount();
     // Check every 5 seconds
     const interval = setInterval(updatePendingCount, 5000);
     return () => clearInterval(interval);
   }, []);
 
   // Cache products to localStorage
   const cacheProducts = useCallback((products: ProductWithPortions[]) => {
     try {
       localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
       localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
       console.log('[OfflineSync] Cached', products.length, 'products');
     } catch (error) {
       console.error('[OfflineSync] Failed to cache products:', error);
     }
   }, []);
 
   // Cache sections to localStorage
   const cacheSections = useCallback((sections: TableSectionWithTables[]) => {
     try {
       localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
       console.log('[OfflineSync] Cached', sections.length, 'sections');
     } catch (error) {
       console.error('[OfflineSync] Failed to cache sections:', error);
     }
   }, []);
 
   // Get cached products
   const getCachedProducts = useCallback((): ProductWithPortions[] | null => {
     try {
       const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
       return cached ? JSON.parse(cached) : null;
     } catch {
       return null;
     }
   }, []);
 
   // Get cached sections
   const getCachedSections = useCallback((): TableSectionWithTables[] | null => {
     try {
       const cached = localStorage.getItem(STORAGE_KEYS.SECTIONS);
       return cached ? JSON.parse(cached) : null;
     } catch {
       return null;
     }
   }, []);
 
   // Queue a bill for later sync
   const queueBill = useCallback((bill: PendingBill) => {
     try {
       const pending = getPendingBills();
       // Check for duplicates
       if (!pending.find(b => b.id === bill.id)) {
         pending.push(bill);
         localStorage.setItem(STORAGE_KEYS.PENDING_BILLS, JSON.stringify(pending));
         console.log('[OfflineSync] Queued bill:', bill.id);
       }
     } catch (error) {
       console.error('[OfflineSync] Failed to queue bill:', error);
     }
   }, []);
 
   // Queue a KOT for later sync
   const queueKOT = useCallback((kot: PendingKOT) => {
     try {
       const pending = getPendingKOTs();
       // Check for duplicates
       if (!pending.find(k => k.id === kot.id)) {
         pending.push(kot);
         localStorage.setItem(STORAGE_KEYS.PENDING_KOTS, JSON.stringify(pending));
         console.log('[OfflineSync] Queued KOT:', kot.id);
       }
     } catch (error) {
       console.error('[OfflineSync] Failed to queue KOT:', error);
     }
   }, []);
 
   // Get pending bills
   const getPendingBills = useCallback((): PendingBill[] => {
     try {
       const pending = localStorage.getItem(STORAGE_KEYS.PENDING_BILLS);
       return pending ? JSON.parse(pending) : [];
     } catch {
       return [];
     }
   }, []);
 
   // Get pending KOTs
   const getPendingKOTs = useCallback((): PendingKOT[] => {
     try {
       const pending = localStorage.getItem(STORAGE_KEYS.PENDING_KOTS);
       return pending ? JSON.parse(pending) : [];
     } catch {
       return [];
     }
   }, []);
 
   // Sync pending data to Supabase
   const syncPendingData = useCallback(async () => {
     if (syncInProgressRef.current || !navigator.onLine) return;
 
     syncInProgressRef.current = true;
     setIsSyncing(true);
 
     try {
       // Sync pending bills
       const pendingBills = getPendingBills();
       const syncedBillIds: string[] = [];
 
       for (const bill of pendingBills) {
         try {
           // Generate bill number
           const { data: billNumberData } = await supabase.rpc('generate_bill_number');
           
           const billWithNumber = { ...bill.data, bill_number: billNumberData };
           const { data: newBill, error: billError } = await supabase
             .from('bills')
             .insert([billWithNumber] as any)
             .select()
             .single();
 
           if (billError) {
             console.error('[OfflineSync] Failed to sync bill:', bill.id, billError);
             continue;
           }
 
           // Insert items
           if (bill.items.length > 0) {
             const itemsWithBillId = bill.items.map(item => ({ ...item, bill_id: newBill.id }));
             await supabase.from('bill_items').insert(itemsWithBillId as any);
           }
 
           syncedBillIds.push(bill.id);
           console.log('[OfflineSync] Synced bill:', bill.id, '→', newBill.id);
         } catch (error) {
           console.error('[OfflineSync] Bill sync error:', error);
         }
       }
 
       // Remove synced bills from queue
       if (syncedBillIds.length > 0) {
         const remainingBills = pendingBills.filter(b => !syncedBillIds.includes(b.id));
         localStorage.setItem(STORAGE_KEYS.PENDING_BILLS, JSON.stringify(remainingBills));
       }
 
       // Sync pending KOTs
       const pendingKOTs = getPendingKOTs();
       const syncedKOTIds: string[] = [];
 
       for (const kot of pendingKOTs) {
         try {
           const { error } = await supabase
             .from('bill_items')
             .update({
               sent_to_kitchen: true,
               kot_printed_at: new Date().toISOString(),
             })
             .eq('bill_id', kot.billId)
             .in('id', kot.itemIds);
 
           if (error) {
             console.error('[OfflineSync] Failed to sync KOT:', kot.id, error);
             continue;
           }
 
           syncedKOTIds.push(kot.id);
           console.log('[OfflineSync] Synced KOT:', kot.id);
         } catch (error) {
           console.error('[OfflineSync] KOT sync error:', error);
         }
       }
 
       // Remove synced KOTs from queue
       if (syncedKOTIds.length > 0) {
         const remainingKOTs = pendingKOTs.filter(k => !syncedKOTIds.includes(k.id));
         localStorage.setItem(STORAGE_KEYS.PENDING_KOTS, JSON.stringify(remainingKOTs));
       }
 
       console.log('[OfflineSync] Sync complete:', syncedBillIds.length, 'bills,', syncedKOTIds.length, 'KOTs');
     } catch (error) {
       console.error('[OfflineSync] Sync failed:', error);
     } finally {
       syncInProgressRef.current = false;
       setIsSyncing(false);
     }
   }, [getPendingBills, getPendingKOTs]);
 
   // Get last sync time
   const getLastSyncTime = useCallback((): Date | null => {
     try {
       const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
       return lastSync ? new Date(lastSync) : null;
     } catch {
       return null;
     }
   }, []);
 
   // Clear all cached data
   const clearCache = useCallback(() => {
     localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
     localStorage.removeItem(STORAGE_KEYS.SECTIONS);
     localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
     console.log('[OfflineSync] Cache cleared');
   }, []);
 
   return {
     isOnline,
     isSyncing,
     pendingCount,
     cacheProducts,
     cacheSections,
     getCachedProducts,
     getCachedSections,
     queueBill,
     queueKOT,
     getPendingBills,
     getPendingKOTs,
     syncPendingData,
     getLastSyncTime,
     clearCache,
   };
 }