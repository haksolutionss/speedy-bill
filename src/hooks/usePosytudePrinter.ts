import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateKOTCommands, generateBillCommands, KOTData, BillData } from '@/lib/escpos/templates';
import { formatToPaperWidth } from '@/lib/escpos/commands';
import { toast } from 'sonner';
import type { PosytudePrinter, PrintResult, PrinterStatus } from '@/types/printer';

declare global {
  interface Window {
    electronAPI?: {
      listPrinters: () => Promise<{ success: boolean; printers: any[] }>;
      discoverPrinter: () => Promise<{ success: boolean; printer: any; printers: any[] }>;
      printToUSB: (vendorId: number, productId: number, data: Uint8Array) => Promise<PrintResult>;
      testPrinter: (vendorId: number, productId: number) => Promise<PrintResult>;
      openCashDrawer: (vendorId: number, productId: number) => Promise<PrintResult>;
      getPrinterStatus: (vendorId: number, productId: number) => Promise<PrinterStatus>;
      onPrinterDiscovered: (callback: (data: any) => void) => () => void;
      getVersion: () => Promise<string>;
      platform: string;
      isWindows: boolean;
    };
    isElectronApp?: boolean;
  }
}

/**
 * Hook for POSYTUDE YHD-8330 USB Printer
 * Handles both KOT and Bill printing
 */
export function usePosytudePrinter() {
  const [isElectron, setIsElectron] = useState(false);
  const [printer, setPrinter] = useState<PosytudePrinter | null>(null);
  const [status, setStatus] = useState<PrinterStatus>({ status: 'disconnected' });
  const [isPrinting, setIsPrinting] = useState(false);

  // Initialize and listen for printer discovery
  useEffect(() => {
    if (window.isElectronApp && window.electronAPI) {
      setIsElectron(true);

      // Listen for auto-discovery on startup
      const unsubscribe = window.electronAPI.onPrinterDiscovered((data) => {

        if (data.printer) {
          const p: PosytudePrinter = {
            vendorId: data.printer.vendorId,
            productId: data.printer.productId,
            name: data.printer.name || 'POSYTUDE YHD-8330',
            manufacturer: data.printer.manufacturer,
            status: 'connected',
            format: '80mm',
          };
          setPrinter(p);
          setStatus({ status: 'connected', message: 'Printer ready' });
        } else {
          setPrinter(null);
          setStatus({
            status: 'disconnected',
            message: 'No printer found',
            troubleshooting: [
              'Connect POSYTUDE printer via USB',
              'Ensure printer is powered ON',
              'Restart the application'
            ]
          });
        }
      });

      // Active check to ensure state is synced
      window.electronAPI.discoverPrinter().catch(e => console.error("Init check failed", e));

      return () => unsubscribe?.();
    } else {
      setIsElectron(false);
      setStatus({ status: 'unavailable', message: 'Desktop app required for printing' });
    }
  }, []);

  // Refresh printer status
  const refreshStatus = useCallback(async () => {
    if (!isElectron || !window.electronAPI || !printer) {
      return;
    }

    try {
      const result = await window.electronAPI.getPrinterStatus(
        printer.vendorId,
        printer.productId
      );
      setStatus(result);

      if (result.status === 'connected') {
        setPrinter(prev => prev ? { ...prev, status: 'connected' } : null);
      } else {
        setPrinter(prev => prev ? { ...prev, status: 'disconnected' } : null);
      }
    } catch (error) {
      setStatus({ status: 'error', message: 'Failed to check status' });
    }
  }, [isElectron, printer]);

  // Discover printer manually
  const discoverPrinter = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      return null;
    }

    try {
      const result = await window.electronAPI.discoverPrinter();

      if (result.printer) {
        const p: PosytudePrinter = {
          vendorId: result.printer.vendorId,
          productId: result.printer.productId,
          name: result.printer.name || 'POSYTUDE YHD-8330',
          manufacturer: result.printer.manufacturer,
          status: 'connected',
          format: '80mm',
        };
        setPrinter(p);
        setStatus({ status: 'connected', message: 'Printer found' });
        return p;
      } else {
        setPrinter(null);
        setStatus({
          status: 'disconnected',
          message: 'Printer not found',
          troubleshooting: ['Check USB connection', 'Power cycle the printer']
        });
        return null;
      }
    } catch (error) {
      setStatus({ status: 'error', message: 'Discovery failed' });
      return null;
    }
  }, [isElectron]);

  // Print raw ESC/POS data
  const printRaw = useCallback(async (data: Uint8Array): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return {
        success: false,
        error: 'Desktop app required for printing',
        troubleshooting: ['Run SpeedyBill POS desktop application']
      };
    }

    if (!printer) {
      return {
        success: false,
        error: 'No printer connected',
        troubleshooting: [
          'Connect POSYTUDE printer via USB',
          'Check if printer is powered ON',
          'Click refresh to detect printer'
        ]
      };
    }

    setIsPrinting(true);
    setPrinter(prev => prev ? { ...prev, status: 'printing' } : null);

    try {
      const result = await window.electronAPI.printToUSB(
        printer.vendorId,
        printer.productId,
        data
      );

      if (result.success) {
        setPrinter(prev => prev ? { ...prev, status: 'connected' } : null);
        return { success: true };
      } else {
        setPrinter(prev => prev ? { ...prev, status: 'error' } : null);
        return {
          success: false,
          error: result.error || 'Print failed',
          troubleshooting: result.troubleshooting || [
            'Check paper roll',
            'Reconnect USB cable',
            'Restart printer'
          ]
        };
      }
    } catch (error) {
      setPrinter(prev => prev ? { ...prev, status: 'error' } : null);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsPrinting(false);
    }
  }, [isElectron, printer]);

  // Print KOT
  const printKOT = useCallback(async (kotData: KOTData): Promise<PrintResult> => {
    const paperWidth = formatToPaperWidth(printer?.format || '80mm');
    const commands = generateKOTCommands(kotData, paperWidth);
    return printRaw(commands);
  }, [printer, printRaw]);

  // Print Bill
  const printBill = useCallback(async (billData: BillData): Promise<PrintResult> => {
    const paperWidth = formatToPaperWidth(printer?.format || '80mm');
    const commands = generateBillCommands(billData, paperWidth);
    return printRaw(commands);
  }, [printer, printRaw]);

  // Test print
  const testPrint = useCallback(async (): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI || !printer) {
      return { success: false, error: 'Printer not available' };
    }

    try {
      return await window.electronAPI.testPrinter(printer.vendorId, printer.productId);
    } catch (error) {
      return { success: false, error: 'Test print failed' };
    }
  }, [isElectron, printer]);

  // Open cash drawer
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !window.electronAPI || !printer) {
      return false;
    }

    try {
      const result = await window.electronAPI.openCashDrawer(
        printer.vendorId,
        printer.productId
      );
      return result.success;
    } catch (error) {
      return false;
    }
  }, [isElectron, printer]);


  return useMemo(() => ({
    isElectron,
    printer,
    status,
    isPrinting,
    isConnected: printer?.status === 'connected',
    discoverPrinter,
    refreshStatus,
    printKOT,
    printBill,
    printRaw,
    testPrint,
    openCashDrawer,
  }), [
    isElectron,
    printer,
    status,
    isPrinting,
    // Include function dependencies if they change
  ]);
}
