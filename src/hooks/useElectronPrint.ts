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

interface DiscoveredPrinters {
  usb: any[];
  network: any[];
  system: any[];
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
 * Includes auto-discovery of USB and network printers
 */
export const useElectronPrint = () => {
  const { settings } = useSettingsStore();
  const { autoAddPrinters } = usePrinterAutoAdd();
  const [isElectron, setIsElectron] = useState(false);
  const [usbPrinters, setUsbPrinters] = useState<USBPrinterInfo[]>([]);
  const [networkPrinters, setNetworkPrinters] = useState<any[]>([]);
  const [systemPrinters, setSystemPrinters] = useState<any[]>([]);
  const [printerStatus, setPrinterStatus] = useState<Record<string, string>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Check if running in Electron and listen for auto-discovery
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const checkElectron = async () => {
      if (window.isElectronApp && window.electronAPI) {
        try {
          const result = await window.electronAPI.isElectron();
          setIsElectron(result);
          
          if (result) {
            // Listen for auto-discovered printers on startup
            unsubscribe = window.electronAPI.onPrintersDiscovered(async (data: DiscoveredPrinters) => {
              console.log('Printers auto-discovered:', data);
              setUsbPrinters(data.usb || []);
              setNetworkPrinters(data.network || []);
              setSystemPrinters(data.system || []);
              
              const total = (data.usb?.length || 0) + (data.network?.length || 0) + (data.system?.length || 0);
              if (total > 0) {
                toast.success(`Found ${total} printer(s)`, {
                  description: `USB: ${data.usb?.length || 0}, Network: ${data.network?.length || 0}, System: ${data.system?.length || 0}`
                });
                
                // Auto-add discovered printers with smart role assignment
                await autoAddPrinters({
                  usb: data.usb?.map(p => ({ ...p, type: 'usb' as const })),
                  network: data.network?.map(p => ({ ...p, type: 'network' as const })),
                  system: data.system?.map(p => ({ ...p, type: 'system' as const })),
                });
              }
            });
          }
        } catch {
          setIsElectron(false);
        }
      }
    };
    
    checkElectron();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Manual discovery trigger
  const discoverPrinters = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return null;
    
    setIsDiscovering(true);
    try {
      const result = await window.electronAPI.discoverPrinters();
      setUsbPrinters(result.usb || []);
      setNetworkPrinters(result.network || []);
      setSystemPrinters(result.system || []);
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

  // Get printer status with diagnostics
  const checkPrinterStatus = useCallback(async (printer: Printer): Promise<{
    status: string;
    message?: string;
    troubleshooting?: string[];
  }> => {
    if (!isElectron || !window.electronAPI) {
      return { status: 'unavailable', message: 'Not running in desktop app' };
    }

    try {
      let config: any;
      
      if (printer.type === 'usb') {
        config = { vendorId: printer.vendorId, productId: printer.productId };
      } else if (printer.type === 'network') {
        config = { ip: printer.ipAddress, port: printer.port };
      } else if (printer.type === 'system') {
        config = { systemName: printer.systemName || printer.name };
      } else {
        return { status: 'error', message: 'Unknown printer type' };
      }
      
      const result = await window.electronAPI.getPrinterStatus(printer.type, config);
      
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
        troubleshooting: result.troubleshooting 
      };
    } catch (error) {
      setPrinterStatus(prev => ({ ...prev, [printer.id]: 'error' }));
      return { status: 'error', message: 'Failed to check printer status' };
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
          return { 
            success: false, 
            method: 'electron', 
            error: 'USB printer not properly configured. Please reconfigure with vendor and product IDs.' 
          };
        }
        result = await window.electronAPI.printToUSB(
          printer.vendorId,
          printer.productId,
          data,
          printer.format
        );
      } else if (printer.type === 'network') {
        if (!printer.ipAddress) {
          return { 
            success: false, 
            method: 'electron', 
            error: 'Network printer IP address not configured. Go to Settings > Printers to add the IP.' 
          };
        }
        result = await window.electronAPI.printToNetwork(
          printer.ipAddress,
          printer.port || 9100,
          data,
          printer.format
        );
      } else if (printer.type === 'system') {
        const printerName = printer.systemName || printer.name;
        if (!printerName) {
          return { 
            success: false, 
            method: 'electron', 
            error: 'System printer name not configured.' 
          };
        }
        result = await window.electronAPI.printToSystem(printerName, data);
      } else {
        return { 
          success: false, 
          method: 'electron', 
          error: `Unsupported printer type: ${printer.type}. Supported types: USB, Network, System.` 
        };
      }

      if (result.success) {
        return { success: true, method: 'electron' };
      } else {
        // Provide actionable error message
        let errorMsg = result.error || 'Print failed';
        
        if (errorMsg.includes('timeout')) {
          errorMsg = 'Printer connection timed out. Check if the printer is powered on and connected.';
        } else if (errorMsg.includes('ECONNREFUSED')) {
          errorMsg = 'Printer refused connection. Verify the IP address and port are correct.';
        } else if (errorMsg.includes('not found')) {
          errorMsg = 'Printer not found. Ensure it\'s connected and try rediscovering printers.';
        }
        
        return { success: false, method: 'electron', error: errorMsg };
      }
    } catch (error) {
      console.error('Electron print error:', error);
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

  // Test printer
  const testPrinter = useCallback(async (printer: Printer): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return { success: false, method: 'browser', error: 'Not running in Electron' };
    }

    try {
      let config: any;
      
      if (printer.type === 'usb') {
        config = { vendorId: printer.vendorId, productId: printer.productId };
      } else if (printer.type === 'network') {
        config = { ip: printer.ipAddress, port: printer.port };
      } else if (printer.type === 'system') {
        config = { systemName: printer.systemName || printer.name, printerName: printer.name };
      } else {
        return { success: false, method: 'electron', error: 'Unknown printer type' };
      }
      
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
      let config: any;
      
      if (counterPrinter.type === 'usb') {
        config = { vendorId: counterPrinter.vendorId, productId: counterPrinter.productId };
      } else if (counterPrinter.type === 'network') {
        config = { ip: counterPrinter.ipAddress, port: counterPrinter.port };
      } else if (counterPrinter.type === 'system') {
        config = { systemName: counterPrinter.systemName || counterPrinter.name };
      } else {
        return false;
      }
      
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
    networkPrinters,
    systemPrinters,
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
