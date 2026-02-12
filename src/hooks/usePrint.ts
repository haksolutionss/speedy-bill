import { useRef, useCallback, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { printWithBrowser } from '@/lib/printService';
import type { KOTData, BillData } from '@/lib/escpos/templates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { shouldShowDevPrintPreview } from '@/lib/devMode';

/**
 * Unified Print Hook
 * Uses POSYTUDE USB printer in Electron, falls back to browser print dialog
 */
export function usePrint() {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();
  const posytude = usePosytudePrinter();

  // State for development print preview
  const [showDevPreview, setShowDevPreview] = useState(false);
  const [pendingBillData, setPendingBillData] = useState<BillData | null>(null);

  // Print KOT
  const printKOT = useCallback(async (kotData: KOTData & { billId?: string }): Promise<{ success: boolean; method: string; error?: string }> => {

    // Use POSYTUDE printer in Electron
    if (posytude.isElectron && posytude.isConnected) {
      const result = await posytude.printKOT(kotData);
      return {
        success: result.success,
        method: 'usb',
        error: result.error
      };
    }

    // PWA → queue KOT print job (requires billId)
    if (kotData.billId) {
      try {
        // Dedup: check if a pending KOT job for this bill exists within last 30s
        const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
        const { data: existing } = await supabase
          .from('print_jobs')
          .select('id')
          .eq('bill_id', kotData.billId)
          .eq('job_type', 'kot')
          .eq('status', 'pending')
          .gte('created_at', thirtySecsAgo)
          .limit(1);

        if (existing && existing.length > 0) {
          console.warn('[Print] Duplicate KOT job skipped for bill', kotData.billId);
          return { success: true, method: 'queue' };
        }

        const { error } = await supabase.from('print_jobs').insert([{
          bill_id: kotData.billId,
          job_type: 'kot',
          status: 'pending',
          payload: kotData as unknown as import('@/integrations/supabase/types').Json,
          requested_from: 'pwa',
        }]);

        if (error) throw error;

        toast.success('KOT sent to kitchen printer');
        return { success: true, method: 'queue' };

      } catch (err: any) {
        console.error('KOT print queue failed', err);
        toast.error('Failed to send KOT to printer');
        return {
          success: false,
          method: 'queue',
          error: err.message ?? 'KOT print job failed',
        };
      }
    }

    // Fallback to browser print
    if (printRef.current) {
      printWithBrowser(printRef.current, '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'none', error: 'No print method available' };
  }, [posytude]);

  // Internal print bill function (actual printing)
  const executePrintBill = useCallback(async (billData: BillData) => {
    // 🖨️ Electron → direct USB print
    if (posytude.isElectron && posytude.isConnected) {
      console.log("Data", billData)
      const result = await posytude.printBill(billData);
      return {
        success: result.success,
        method: 'usb',
        error: result.error,
      };
    }

    // 📱 PWA → queue print job
    try {
      // Dedup: check if a pending bill job for this bill exists within last 30s
      const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
      const { data: existing } = await supabase
        .from('print_jobs')
        .select('id')
        .eq('bill_id', billData.billId)
        .eq('job_type', 'bill')
        .eq('status', 'pending')
        .gte('created_at', thirtySecsAgo)
        .limit(1);

      if (existing && existing.length > 0) {
        console.warn('[Print] Duplicate bill job skipped for bill', billData.billId);
        return { success: true, method: 'queue' };
      }

      const { error } = await supabase.from('print_jobs').insert([{
        bill_id: billData.billId,
        job_type: 'bill',
        status: "pending",
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

  // Print Bill - with optional dev preview
  const printBill = useCallback(async (billData: BillData) => {
    // Direct print
    return executePrintBill(billData);
  }, [executePrintBill]);

  // Confirm print from dev preview
  const confirmDevPrint = useCallback(async () => {
    if (pendingBillData) {
      await executePrintBill(pendingBillData);
      setPendingBillData(null);
      setShowDevPreview(false);
    }
  }, [pendingBillData, executePrintBill]);

  // Close dev preview without printing
  const closeDevPreview = useCallback(() => {
    setPendingBillData(null);
    setShowDevPreview(false);
  }, []);

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
    fssaiNumber: settings.business.fssaiNumber || '',
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

    // Dev preview controls
    showDevPreview,
    pendingBillData,
    confirmDevPrint,
    closeDevPreview,

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
