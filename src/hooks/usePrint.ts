import { useRef, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useElectronPrint } from '@/hooks/useElectronPrint';
import { printWithBrowser } from '@/lib/printService';
import { generateKOTCommands, generateBillCommands, KOTData, BillData } from '@/lib/escpos/templates';
import { formatToPaperWidth } from '@/lib/escpos/commands';
import type { PrintFormat } from '@/types/settings';
import type { CartItem } from '@/store/uiStore';

export function usePrint() {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, printers, getPrinterByRole } = useSettingsStore();
  const electronPrint = useElectronPrint();

  // Unified print function - uses Electron when available, fallback to browser
  const print = useCallback(async (
    role: 'kitchen' | 'counter' | 'bar' = 'counter',
    data?: { type: 'kot' | 'bill'; payload: KOTData | BillData }
  ): Promise<{ success: boolean; method: string; error?: string }> => {
    const printer = getPrinterByRole(role);
    const format: PrintFormat = printer?.format || '80mm';

    // If running in Electron with configured printers, use direct ESC/POS printing
    if (electronPrint.isElectron && printer) {
      try {
        if (data?.type === 'kot') {
          const paperWidth = formatToPaperWidth(format);
          const commands = generateKOTCommands(data.payload as KOTData, paperWidth);
          const result = await electronPrint.printRaw(printer, commands);
          return { success: result.success, method: 'electron', error: result.error };
        } else if (data?.type === 'bill') {
          const paperWidth = formatToPaperWidth(format);
          const commands = generateBillCommands(data.payload as BillData, paperWidth);
          const result = await electronPrint.printRaw(printer, commands);
          return { success: result.success, method: 'electron', error: result.error };
        }
        
        // Test print without data
        if (printer) {
          const result = await electronPrint.testPrinter(printer);
          return { success: result.success, method: 'electron', error: result.error };
        }
      } catch (error) {
        console.error('Electron print failed, falling back to browser:', error);
      }
    }

    // Fallback to browser printing (shows print dialog)
    if (printRef.current) {
      printWithBrowser(printRef.current, format);
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'none', error: 'No print method available' };
  }, [getPrinterByRole, electronPrint]);

  // Direct KOT print - silent in Electron
  const printKOTDirect = useCallback(async (kotData: KOTData): Promise<{ success: boolean; method: string; error?: string }> => {
    const kitchenPrinter = getPrinterByRole('kitchen');
    
    if (electronPrint.isElectron && kitchenPrinter) {
      const paperWidth = formatToPaperWidth(kitchenPrinter.format);
      const commands = generateKOTCommands(kotData, paperWidth);
      const result = await electronPrint.printRaw(kitchenPrinter, commands);
      return { success: result.success, method: 'electron', error: result.error };
    }

    // Fallback to browser
    if (printRef.current) {
      printWithBrowser(printRef.current, kitchenPrinter?.format || '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'none', error: 'No kitchen printer configured' };
  }, [electronPrint, getPrinterByRole]);

  // Direct Bill print - silent in Electron
  const printBillDirect = useCallback(async (billData: BillData): Promise<{ success: boolean; method: string; error?: string }> => {
    const counterPrinter = getPrinterByRole('counter');
    
    if (electronPrint.isElectron && counterPrinter) {
      const paperWidth = formatToPaperWidth(counterPrinter.format);
      const commands = generateBillCommands(billData, paperWidth);
      const result = await electronPrint.printRaw(counterPrinter, commands);
      return { success: result.success, method: 'electron', error: result.error };
    }

    // Fallback to browser
    if (printRef.current) {
      printWithBrowser(printRef.current, counterPrinter?.format || '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'none', error: 'No counter printer configured' };
  }, [electronPrint, getPrinterByRole]);

  // Open cash drawer (Electron only)
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (electronPrint.isElectron) {
      return electronPrint.openCashDrawer();
    }
    return false;
  }, [electronPrint]);

  const getBusinessInfo = useCallback(() => ({
    name: settings.business.name || 'Restaurant',
    address: settings.business.address || '',
    phone: settings.business.phone || '',
    gstNumber: settings.business.gstNumber || '',
  }), [settings.business]);

  const getTaxSettings = useCallback(() => ({
    type: settings.tax.type,
    gstMode: settings.tax.gstMode,
    defaultRate: settings.tax.defaultRate,
  }), [settings.tax]);

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
    printRef,
    print,
    printKOTDirect,
    printBillDirect,
    openCashDrawer,
    getBusinessInfo,
    getTaxSettings,
    formatCurrency,
    currencySymbol: settings.currency.symbol,
    gstMode: settings.tax.gstMode,
    isElectron: electronPrint.isElectron,
    printers,
  };
}
