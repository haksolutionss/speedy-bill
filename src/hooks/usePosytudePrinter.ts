import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateKOTCommands, generateBillCommands, type KOTData, type BillData } from '@/lib/escpos/templates';
import { generateBillHTML } from '@/lib/escpos/billHtmlTemplate';
import { formatToPaperWidth } from '@/lib/escpos/commands';
import type { PosytudePrinter, PrintResult, PrinterStatus } from '@/types/printer';

declare global {
  interface Window {
    electronAPI?: {
      listPrinters: () => Promise<{ success: boolean; printers: any[] }>;
      discoverPrinter: () => Promise<{ success: boolean; printer: any; printers: any[] }>;
      printToUSB: (vendorId: number, productId: number, data: Uint8Array) => Promise<PrintResult>;
      printHtmlBill: (htmlContent: string, paperWidth: string) => Promise<PrintResult>;
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
 * 
 * Bill printing uses TWO-LEVEL strategy:
 *   1. PRIMARY — HTML → Electron webContents.print() (pixel-perfect borders)
 *   2. FALLBACK — ASCII-safe text ESC/POS via USB (if HTML print fails)
 * 
 * KOT printing remains text-based ESC/POS (no borders needed).
 */
export function usePosytudePrinter() {
  const [isElectron, setIsElectron] = useState(false);
  const [printer, setPrinter] = useState<PosytudePrinter | null>(null);
  const [status, setStatus] = useState<PrinterStatus>({ status: 'disconnected' });
  const [isPrinting, setIsPrinting] = useState(false);

  // ── Initialise & listen for printer discovery ──
  useEffect(() => {
    if (window.isElectronApp && window.electronAPI) {
      setIsElectron(true);

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
            troubleshooting: ['Connect POSYTUDE printer via USB', 'Ensure printer is powered ON', 'Restart the application'],
          });
        }
      });

      window.electronAPI.discoverPrinter().catch(e => console.error('Init check failed', e));

      return () => unsubscribe?.();
    } else {
      setIsElectron(false);
      setStatus({ status: 'unavailable', message: 'Desktop app required for printing' });
    }
  }, []);

  // ── Refresh printer status ──
  const refreshStatus = useCallback(async () => {
    if (!isElectron || !window.electronAPI || !printer) return;
    try {
      const result = await window.electronAPI.getPrinterStatus(printer.vendorId, printer.productId);
      setStatus(result);
      setPrinter(prev => prev ? { ...prev, status: result.status === 'connected' ? 'connected' : 'disconnected' } : null);
    } catch {
      setStatus({ status: 'error', message: 'Failed to check status' });
    }
  }, [isElectron, printer]);

  // ── Discover printer manually ──
  const discoverPrinter = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return null;
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
      }
      setPrinter(null);
      setStatus({ status: 'disconnected', message: 'Printer not found', troubleshooting: ['Check USB connection', 'Power cycle the printer'] });
      return null;
    } catch {
      setStatus({ status: 'error', message: 'Discovery failed' });
      return null;
    }
  }, [isElectron]);

  // ── Send raw bytes to printer (USB) ──
  const printRaw = useCallback(async (data: Uint8Array): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI) {
      return { success: false, error: 'Desktop app required for printing', troubleshooting: ['Run SpeedyBill POS desktop application'] };
    }
    if (!printer) {
      return { success: false, error: 'No printer connected', troubleshooting: ['Connect POSYTUDE printer via USB', 'Check if printer is powered ON', 'Click refresh to detect printer'] };
    }

    setIsPrinting(true);
    setPrinter(prev => prev ? { ...prev, status: 'printing' } : null);

    try {
      const result = await window.electronAPI.printToUSB(printer.vendorId, printer.productId, data);
      setPrinter(prev => prev ? { ...prev, status: result.success ? 'connected' : 'error' } : null);
      return result.success
        ? { success: true }
        : { success: false, error: result.error || 'Print failed', troubleshooting: result.troubleshooting || ['Check paper roll', 'Reconnect USB cable', 'Restart printer'] };
    } catch (error) {
      setPrinter(prev => prev ? { ...prev, status: 'error' } : null);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsPrinting(false);
    }
  }, [isElectron, printer]);

  // ── KOT: always text-based ESC/POS ──
  const printKOT = useCallback(async (kotData: KOTData): Promise<PrintResult> => {
    console.log("kotData", kotData)
    const paperWidth = formatToPaperWidth(printer?.format || '80mm');
    const commands = generateKOTCommands(kotData, paperWidth);
    return printRaw(commands);
  }, [printer, printRaw]);

  // ── BILL: HTML primary → text fallback ──
  const printBill = useCallback(async (billData: BillData): Promise<PrintResult> => {
    const paperWidth = formatToPaperWidth(printer?.format || '80mm');
    console.log("billData", billData)
    // Level 2: ASCII-safe text ESC/POS via USB
    try {
      console.log('Printing Bill');
      const commands = generateBillCommands(billData, paperWidth);
      return printRaw(commands);
    } catch (err) {
      console.error('[Print] Text fallback also failed:', err);
      return { success: false, error: 'Both HTML and text printing failed' };
    }
  }, [isElectron, printer, printRaw]);

  // ── Test print ──
  const testPrint = useCallback(async (): Promise<PrintResult> => {
    if (!isElectron || !window.electronAPI || !printer) {
      return { success: false, error: 'Printer not available' };
    }
    try {
      return await window.electronAPI.testPrinter(printer.vendorId, printer.productId);
    } catch {
      return { success: false, error: 'Test print failed' };
    }
  }, [isElectron, printer]);

  // ── Open cash drawer ──
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !window.electronAPI || !printer) return false;
    try {
      const result = await window.electronAPI.openCashDrawer(printer.vendorId, printer.productId);
      return result.success;
    } catch {
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
  }), [isElectron, printer, status, isPrinting, discoverPrinter, refreshStatus, printKOT, printBill, printRaw, testPrint, openCashDrawer]);
}
