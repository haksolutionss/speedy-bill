import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { generateKOTCommands, generateBillCommands, KOTData, BillData } from '@/lib/escpos/templates';
import { formatToPaperWidth } from '@/lib/escpos/commands';
import { usePrinterAutoAdd } from './usePrinterAutoAdd';
import type { Printer } from '@/types/settings';
import { toast } from 'sonner';

// Type declarations for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      listPrinters: () => Promise<{ success: boolean; printers: any[]; error?: string }>;
      discoverPrinters: () => Promise<{ usb: any[]; network: any[]; system: any[] }>;
      scanNetworkPrinters: () => Promise<{ success: boolean; printers: any[]; error?: string }>;
      fullNetworkScan: () => Promise<{ success: boolean; printers: any[]; error?: string }>;
      printToUSB: (vendorId: number, productId: number, data: Uint8Array | string, format: string) => Promise<{ success: boolean; error?: string }>;
      printToNetwork: (ip: string, port: number, data: Uint8Array | string, format: string) => Promise<{ success: boolean; error?: string }>;
      printToSystem: (printerName: string, data: Uint8Array | string) => Promise<{ success: boolean; error?: string }>;
      testPrinter: (type: string, config: any) => Promise<{ success: boolean; error?: string }>;
      openCashDrawer: (type: string, config: any) => Promise<{ success: boolean; error?: string }>;
      getPrinterStatus: (type: string, config: any) => Promise<{
        success: boolean;
        status: string;
        error?: string;
        message?: string;
        troubleshooting?: string[];
      }>;
      isElectron: () => Promise<boolean>;
      getVersion: () => Promise<string>;
      onPrintersDiscovered: (callback: (data: any) => void) => () => void;
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

// USB ONLY - Simplified for posytude printer
interface DiscoveredPrinters {
  usb: any[];
  network: any[]; // Not used
  system: any[];  // Not used
}

interface USBPrinterInfo {
  vendorId: number;
  productId: number;
  name: string;
  manufacturer?: string;
  product?: string;
  status?: string;
}

/**
 * Hook for printing via Electron's main process
 * SIMPLIFIED: USB printers only (no network/system printers)
 */
export const useElectronPrint = () => {
  const { settings } = useSettingsStore();
  const { autoAddPrinters } = usePrinterAutoAdd();
  const [isElectron, setIsElectron] = useState(false);
  const [usbPrinters, setUsbPrinters] = useState<USBPrinterInfo[]>([]);
  const [printerStatus, setPrinterStatus] = useState<Record<string, string>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);

  console.log('Electron flags:', {
    isElectronApp: window.isElectronApp,
    electronAPI: !!window.electronAPI,
  });

  // Check if running in Electron and listen for auto-discovery
  useEffect(() => {
    if (window.isElectronApp && window.electronAPI) {
      console.log('Running inside Electron - USB printer mode');
      setIsElectron(true);

      const unsubscribe = window.electronAPI.onPrintersDiscovered(async (data) => {
        console.log('USB Printers discovered:', data.usb);

        setUsbPrinters(data.usb || []);

        const total = data.usb?.length || 0;

        if (total > 0) {
          toast.success(`Found ${total} USB printer(s)`, {
            description: data.usb.map((p: USBPrinterInfo) => p.name).join(', ')
          });

          // Auto-add USB printers only
          await autoAddPrinters({
            usb: data.usb?.map((p: USBPrinterInfo) => ({ ...p, type: 'usb' as const })),
            network: [],
            system: [],
          });
        } else {
          toast.warning('No USB printers found', {
            description: 'Please connect a USB thermal printer and restart the app'
          });
        }
      });

      return () => unsubscribe?.();
    } else {
      console.log('Running in Browser mode');
      setIsElectron(false);
    }
  }, []);

  // Manual discovery trigger (USB only)
  const discoverPrinters = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return null;

    setIsDiscovering(true);
    try {
      const result = await window.electronAPI.discoverPrinters();
      setUsbPrinters(result.usb || []);
      return result;
    } finally {
      setIsDiscovering(false);
    }
  }, [isElectron]);

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

  // Get printer status with diagnostics (USB only)
  const checkPrinterStatus = useCallback(async (printer: Printer): Promise<{
    status: string;
    message?: string;
    troubleshooting?: string[];
  }> => {
    if (!isElectron || !window.electronAPI) {
      return { status: 'unavailable', message: 'Not running in desktop app' };
    }

    // Only support USB printers
    if (printer.type !== 'usb') {
      return { 
        status: 'unsupported', 
        message: 'Only USB printers are supported. Please configure a USB printer.',
        troubleshooting: ['Go to Settings > Printers', 'Add a USB thermal printer']
      };
    }

    try {
      const config = { vendorId: printer.vendorId, productId: printer.productId };
      const result = await window.electronAPI.getPrinterStatus('usb', config);

      if (result.success) {
        setPrinterStatus(prev => ({ ...prev, [printer.id]: result.status }));
        return {
          status: result.status,
          message: result.message,
          troubleshooting: result.troubleshooting
        };
      }

      setPrinterStatus(prev => ({ ...prev, [printer.id]: 'error' }));
      return {
        status: 'error',
        message: result.error,
        troubleshooting: [
          'Check USB cable connection',
          'Ensure printer is powered on',
          'Try unplugging and reconnecting the USB',
          'Restart the application'
        ]
      };
    } catch (error) {
      setPrinterStatus(prev => ({ ...prev, [printer.id]: 'error' }));
      return { status: 'error', message: 'Failed to check printer status' };
    }
  }, [isElectron]);

  // Print raw ESC/POS data (USB only)
  const printRaw = useCallback(async (printer: Printer, data: Uint8Array): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return { success: false, method: 'browser', error: 'Not running in Electron. Please use the desktop app for direct USB printing.' };
    }

    // Only USB printing is supported
    if (printer?.type !== 'usb') {
      return {
        success: false,
        method: 'electron',
        error: `Only USB printers are supported. Current printer type: ${printer?.type || 'none'}. Please configure a USB printer in Settings.`
      };
    }

    if (!printer.vendorId || !printer.productId) {
      return {
        success: false,
        method: 'electron',
        error: `USB printer "${printer.name}" is missing vendor/product IDs. Please remove and re-add the printer, or check that it's properly connected.`
      };
    }

    try {
      console.log(`Printing to USB: VID=${printer.vendorId.toString(16)} PID=${printer.productId.toString(16)}`);
      
      const result = await window.electronAPI.printToUSB(
        printer.vendorId,
        printer.productId,
        data,
        printer.format
      );

      if (result.success) {
        return { success: true, method: 'electron' };
      } else {
        let errorMsg = result.error || 'Print failed';
        let troubleshooting = '';

        if (errorMsg.includes('not found')) {
          troubleshooting = ' Make sure the printer is connected and powered on.';
        } else if (errorMsg.includes('interface')) {
          troubleshooting = ' Try unplugging the printer, wait 5 seconds, then plug it back in.';
        } else if (errorMsg.includes('endpoint')) {
          troubleshooting = ' The printer may need a driver update or restart.';
        }

        return { success: false, method: 'electron', error: errorMsg + troubleshooting };
      }
    } catch (error) {
      console.error('Electron USB print error:', error);
      return {
        success: false,
        method: 'electron',
        error: error instanceof Error ? error.message : 'Unknown printing error occurred'
      };
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

  // Test printer (USB only)
  const testPrinter = useCallback(async (printer: Printer): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return { success: false, method: 'browser', error: 'Not running in Electron' };
    }

    if (printer.type !== 'usb') {
      return { success: false, method: 'electron', error: 'Only USB printers are supported' };
    }

    try {
      const config = { vendorId: printer.vendorId, productId: printer.productId };
      const result = await window.electronAPI.testPrinter('usb', config);

      if (result.success) {
        return { success: true, method: 'electron' };
      } else {
        return { success: false, method: 'electron', error: result.error };
      }
    } catch (error) {
      return { success: false, method: 'electron', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [isElectron]);

  // Open cash drawer (USB only)
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !window.electronAPI) {
      return false;
    }

    const counterPrinter = settings.printers?.find(p => p.role === 'counter' && p.isActive && p.type === 'usb');
    if (!counterPrinter) {
      console.warn('No USB counter printer configured for cash drawer');
      return false;
    }

    try {
      const config = { vendorId: counterPrinter.vendorId, productId: counterPrinter.productId };
      const result = await window.electronAPI.openCashDrawer('usb', config);
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
    isDiscovering,
    scanUSBPrinters,
    discoverPrinters,
    checkPrinterStatus,
    printRaw,
    printKOT,
    printBill,
    testPrinter,
    openCashDrawer,
    platform: window.electronAPI?.platform || 'browser',
  };
};
