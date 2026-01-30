import { useRef, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { printWithBrowser } from '@/lib/printService';
import type { KOTData, BillData } from '@/lib/escpos/templates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Unified Print Hook
 * Uses POSYTUDE USB printer in Electron, falls back to browser print dialog
 */
export function usePrint() {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();
  const posytude = usePosytudePrinter();

  // Print KOT
  const printKOT = useCallback(async (kotData: KOTData): Promise<{ success: boolean; method: string; error?: string }> => {
    console.log('🍽️ KOT Print Request');

    // Use POSYTUDE printer in Electron
    if (posytude.isElectron && posytude.isConnected) {
      console.log('Using POSYTUDE USB printer for KOT');
      const result = await posytude.printKOT(kotData);
      return {
        success: result.success,
        method: 'usb',
        error: result.error
      };
    }

    // Need to Add KOT adding functionaltiy from mobile to print
    // try {
    //   const { error } = await supabase.from('print_jobs').insert([{
    //     bill_id: kotData.billId,
    //     job_type: 'bill',
    //     payload: kotData as unknown as import('@/integrations/supabase/types').Json,
    //     requested_from: 'pwa',
    //   }]);

    //   if (error) throw error;

    //   toast.success('Bill sent to counter printer');
    //   return { success: true, method: 'queue' };

    // } catch (err: any) {
    //   console.error('Print queue failed', err);
    //   toast.error('Failed to send print job');
    //   return {
    //     success: false,
    //     method: 'queue',
    //     error: err.message ?? 'Print job failed',
    //   };
    // }

    // Fallback to browser print
    console.log('Falling back to browser print for KOT');
    if (printRef.current) {
      printWithBrowser(printRef.current, '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'none', error: 'No print method available' };
  }, [posytude]);

  // Print Bill
  const printBill = useCallback(async (billData: BillData) => {
    console.log('🧾 Bill Print Request');

    console.log("billData", billData)
    // 🖨️ Electron → direct USB print
    if (posytude.isElectron && posytude.isConnected) {
      const result = await posytude.printBill(billData);
      return {
        success: result.success,
        method: 'usb',
        error: result.error,
      };
    }

    // 📱 PWA → queue print job
    try {
      console.log("billData", billData)
      const { error } = await supabase.from('print_jobs').insert([{
        bill_id: billData.billId,
        job_type: 'bill',
        payload: billData as unknown as import('@/integrations/supabase/types').Json,
        requested_from: 'pwa',
      }]);

      if (error) throw error;

      toast.success('Bill sent to counter printer');
      return { success: true, method: 'queue' };

    } catch (err: any) {
      console.error('Print queue failed', err);
      toast.error('Failed to send print job');
      return {
        success: false,
        method: 'queue',
        error: err.message ?? 'Print job failed',
      };
    }
  }, [posytude]);

  // Generic print function
  const print = useCallback(async (
    role: 'kitchen' | 'counter' = 'counter',
    data?: { type: 'kot' | 'bill'; payload: KOTData | BillData }
  ): Promise<{ success: boolean; method: string; error?: string }> => {
    if (data?.type === 'kot') {
      return printKOT(data.payload as KOTData);
    } else if (data?.type === 'bill') {
      return printBill(data.payload as BillData);
    }

    // Test print
    if (posytude.isElectron && posytude.isConnected) {
      const result = await posytude.testPrint();
      return { success: result.success, method: 'usb', error: result.error };
    }

    return { success: false, method: 'none', error: 'No data to print' };
  }, [printKOT, printBill, posytude]);

  // Open cash drawer
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (posytude.isElectron && posytude.isConnected) {
      return posytude.openCashDrawer();
    }
    console.warn('Cash drawer only works with USB printer');
    return false;
  }, [posytude]);

  // Business info helper
  const getBusinessInfo = useCallback(() => ({
    name: settings.business.name || 'Restaurant',
    address: settings.business.address || '',
    phone: settings.business.phone || '',
    gstNumber: settings.business.gstNumber || '',
  }), [settings.business]);

  // Tax settings helper
  const getTaxSettings = useCallback(() => ({
    type: settings.tax.type,
    gstMode: settings.tax.gstMode,
    defaultRate: settings.tax.defaultRate,
  }), [settings.tax]);

  // Currency formatter
  const formatCurrency = useCallback((amount: number): string => {
    const { symbol, useCommas, decimalPlaces } = settings.currency;
    let formatted = amount.toFixed(decimalPlaces);

    if (useCommas) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    return `${symbol}${formatted}`;
  }, [settings.currency]);

  return {
    // Refs
    printRef,

    // Print functions
    print,
    printKOT,
    printBill,
    printKOTDirect: printKOT,
    printBillDirect: printBill,
    openCashDrawer,

    // Helpers
    getBusinessInfo,
    getTaxSettings,
    formatCurrency,
    currencySymbol: settings.currency.symbol,
    gstMode: settings.tax.gstMode,

    // Status
    isElectron: posytude.isElectron,
    isPrinterConnected: posytude.isConnected,
    printerStatus: posytude.status,
  };
}
