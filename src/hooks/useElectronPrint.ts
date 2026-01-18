import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { generateKOTCommands, generateBillCommands, KOTData, BillData } from '@/lib/escpos/templates';
import { formatToPaperWidth } from '@/lib/escpos/commands';
import type { Printer } from '@/types/settings';

// Type declarations for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      listPrinters: () => Promise<{ success: boolean; printers: any[]; error?: string }>;
      printToUSB: (vendorId: number, productId: number, data: Uint8Array | string, format: string) => Promise<{ success: boolean; error?: string }>;
      printToNetwork: (ip: string, port: number, data: Uint8Array | string, format: string) => Promise<{ success: boolean; error?: string }>;
      testPrinter: (type: string, config: any) => Promise<{ success: boolean; error?: string }>;
      openCashDrawer: (type: string, config: any) => Promise<{ success: boolean; error?: string }>;
      getPrinterStatus: (type: string, config: any) => Promise<{ success: boolean; status: string; error?: string }>;
      isElectron: () => Promise<boolean>;
      getVersion: () => Promise<string>;
      platform: string;
      isWindows: boolean;
      isMac: boolean;
      isLinux: boolean;
    };
    isElectronApp?: boolean;
  }
}

interface PrintResult {
  success: boolean;
  method: 'electron' | 'browser';
  error?: string;
}

interface USBPrinterInfo {
  vendorId: number;
  productId: number;
  name: string;
  manufacturer?: string;
  product?: string;
}

/**
 * Hook for printing via Electron's main process
 * This bypasses all browser security restrictions by using Node.js directly
 */
export const useElectronPrint = () => {
  const { settings } = useSettingsStore();
  const [isElectron, setIsElectron] = useState(false);
  const [usbPrinters, setUsbPrinters] = useState<USBPrinterInfo[]>([]);
  const [printerStatus, setPrinterStatus] = useState<Record<string, string>>({});

  // Check if running in Electron
  useEffect(() => {
    const checkElectron = async () => {
      if (window.isElectronApp && window.electronAPI) {
        try {
          const result = await window.electronAPI.isElectron();
          setIsElectron(result);
        } catch {
          setIsElectron(false);
        }
      }
    };
    checkElectron();
  }, []);

  // Scan for USB printers
  const scanUSBPrinters = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      return [];
    }

    try {
      const result = await window.electronAPI.listPrinters();
      if (result.success) {
        setUsbPrinters(result.printers);
        return result.printers;
      }
      return [];
    } catch (error) {
      console.error('Failed to scan USB printers:', error);
      return [];
    }
  }, [isElectron]);

  // Get printer status
  const checkPrinterStatus = useCallback(async (printer: Printer) => {
    if (!isElectron || !window.electronAPI) {
      return 'unavailable';
    }

    try {
      const config = printer.type === 'usb' 
        ? { vendorId: printer.vendorId, productId: printer.productId }
        : { ip: printer.ipAddress, port: printer.port };
      
      const result = await window.electronAPI.getPrinterStatus(printer.type, config);
      if (result.success) {
        setPrinterStatus(prev => ({ ...prev, [printer.id]: result.status }));
        return result.status;
      }
      return 'error';
    } catch (error) {
      return 'error';
    }
  }, [isElectron]);

  // Print raw ESC/POS data
  const printRaw = useCallback(async (printer: Printer, data: Uint8Array): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return { success: false, method: 'browser', error: 'Not running in Electron' };
    }

    try {
      let result;
      
      if (printer.type === 'usb') {
        if (!printer.vendorId || !printer.productId) {
          return { success: false, method: 'electron', error: 'USB printer not configured' };
        }
        result = await window.electronAPI.printToUSB(
          printer.vendorId,
          printer.productId,
          data,
          printer.format
        );
      } else if (printer.type === 'network') {
        if (!printer.ipAddress) {
          return { success: false, method: 'electron', error: 'Network printer IP not configured' };
        }
        result = await window.electronAPI.printToNetwork(
          printer.ipAddress,
          printer.port || 9100,
          data,
          printer.format
        );
      } else {
        return { success: false, method: 'electron', error: 'Unsupported printer type' };
      }

      if (result.success) {
        return { success: true, method: 'electron' };
      } else {
        return { success: false, method: 'electron', error: result.error };
      }
    } catch (error) {
      console.error('Electron print error:', error);
      return { success: false, method: 'electron', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [isElectron]);

  // Print KOT
  const printKOT = useCallback(async (kotData: KOTData): Promise<PrintResult> => {
    if (!isElectron) {
      return { success: false, method: 'browser', error: 'Not running in Electron' };
    }

    const kitchenPrinter = settings.printers?.find(p => p.role === 'kitchen' && p.isActive);
    if (!kitchenPrinter) {
      return { success: false, method: 'electron', error: 'No kitchen printer configured' };
    }

    const format = formatToPaperWidth(kitchenPrinter.format);
    const commands = generateKOTCommands(kotData, format);
    
    return printRaw(kitchenPrinter, commands);
  }, [isElectron, settings.printers, printRaw]);

  // Print Bill
  const printBill = useCallback(async (billData: BillData): Promise<PrintResult> => {
    if (!isElectron) {
      return { success: false, method: 'browser', error: 'Not running in Electron' };
    }

    const counterPrinter = settings.printers?.find(p => p.role === 'counter' && p.isActive);
    if (!counterPrinter) {
      return { success: false, method: 'electron', error: 'No counter printer configured' };
    }

    const format = formatToPaperWidth(counterPrinter.format);
    const commands = generateBillCommands(billData, format);
    
    return printRaw(counterPrinter, commands);
  }, [isElectron, settings.printers, printRaw]);

  // Test printer
  const testPrinter = useCallback(async (printer: Printer): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return { success: false, method: 'browser', error: 'Not running in Electron' };
    }

    try {
      const config = printer.type === 'usb'
        ? { vendorId: printer.vendorId, productId: printer.productId }
        : { ip: printer.ipAddress, port: printer.port };
      
      const result = await window.electronAPI.testPrinter(printer.type, config);
      
      if (result.success) {
        return { success: true, method: 'electron' };
      } else {
        return { success: false, method: 'electron', error: result.error };
      }
    } catch (error) {
      return { success: false, method: 'electron', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [isElectron]);

  // Open cash drawer
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !window.electronAPI) {
      return false;
    }

    const counterPrinter = settings.printers?.find(p => p.role === 'counter' && p.isActive);
    if (!counterPrinter) {
      return false;
    }

    try {
      const config = counterPrinter.type === 'usb'
        ? { vendorId: counterPrinter.vendorId, productId: counterPrinter.productId }
        : { ip: counterPrinter.ipAddress, port: counterPrinter.port };
      
      const result = await window.electronAPI.openCashDrawer(counterPrinter.type, config);
      return result.success;
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      return false;
    }
  }, [isElectron, settings.printers]);

  return {
    isElectron,
    usbPrinters,
    printerStatus,
    scanUSBPrinters,
    checkPrinterStatus,
    printRaw,
    printKOT,
    printBill,
    testPrinter,
    openCashDrawer,
    platform: window.electronAPI?.platform || 'browser',
  };
};
