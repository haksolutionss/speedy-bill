/**
 * Custom hook for thermal printer operations
 * Provides instant printing with ESC/POS commands
 */

import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { printKOT, printBill, sendToPrinter, isPrinterConnected } from '@/lib/escpos/printer';
import { ESCPOSBuilder, formatToPaperWidth, Alignment } from '@/lib/escpos/commands';
import { generateKOTCommands, generateBillCommands, type KOTData, type BillData } from '@/lib/escpos/templates';
import { printWithBrowser } from '@/lib/printService';
import type { Printer, PrintFormat } from '@/types/settings';
import type { CartItem } from '@/store/uiStore';

export interface PrintResult {
  success: boolean;
  method: 'thermal' | 'browser';
  error?: string;
}

export function useThermalPrint() {
  const { settings, printers, getPrinterByRole } = useSettingsStore();

  // Get business info for bill
  const businessInfo = useMemo(() => ({
    name: settings.business.name || 'Restaurant',
    address: settings.business.address || '',
    phone: settings.business.phone || '',
    gstin: settings.business.gstNumber || '',
  }), [settings.business]);

  // Get currency symbol
  const currencySymbol = settings.currency.symbol;
  const gstMode = settings.tax.gstMode;

  /**
   * Print KOT instantly to thermal printer
   * Falls back to browser print if thermal fails
   */
  const printKOTInstant = useCallback(async (
    data: Omit<KOTData, 'kotNumber'> & { kotNumber?: number },
    printerRef?: React.RefObject<HTMLDivElement>
  ): Promise<PrintResult> => {
    const printer = getPrinterByRole('kitchen');
    
    // Prepare full KOT data
    const kotData: KOTData = {
      ...data,
      kotNumber: data.kotNumber || 1,
    };

    // Try thermal printing if printer is configured (USB or Bluetooth)
    if (printer) {
      if (printer.type === 'usb' || printer.type === 'bluetooth') {
        try {
          const success = await printKOT(printer, kotData);
          if (success) {
            console.log('KOT printed to thermal printer:', printer.name);
            return { success: true, method: 'thermal' };
          }
        } catch (error) {
          console.error('Thermal KOT print failed:', error);
        }
      }
      
      // For network printers or failed thermal, use browser print with correct paper size
      if (printerRef?.current) {
        printWithBrowser(printerRef.current, printer.format);
        return { success: true, method: 'browser' };
      }
    }

    // No printer configured - fallback to browser print with default size
    if (printerRef?.current) {
      printWithBrowser(printerRef.current, '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'browser', error: 'No print method available' };
  }, [getPrinterByRole]);

  /**
   * Print Bill instantly to thermal printer
   * Falls back to browser print if thermal fails
   */
  const printBillInstant = useCallback(async (
    items: CartItem[],
    billData: {
      billNumber: string;
      tableNumber?: string;
      tokenNumber?: number;
      isParcel?: boolean;
      subTotal: number;
      discountAmount: number;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      discountReason?: string;
      cgstAmount: number;
      sgstAmount: number;
      totalAmount: number;
      finalAmount: number;
      paymentMethod?: string;
      coverCount?: number;
      customerName?: string;
      loyaltyPointsUsed?: number;
      loyaltyPointsEarned?: number;
    },
    printerRef?: React.RefObject<HTMLDivElement>
  ): Promise<PrintResult> => {
    const printer = getPrinterByRole('counter');

    // Prepare full bill data
    const fullBillData: BillData = {
      ...billData,
      items,
      restaurantName: businessInfo.name,
      address: businessInfo.address,
      phone: businessInfo.phone,
      gstin: businessInfo.gstin,
      currencySymbol,
      gstMode,
    };

    // Try thermal printing if printer is configured (USB or Bluetooth)
    if (printer) {
      if (printer.type === 'usb' || printer.type === 'bluetooth') {
        try {
          const success = await printBill(printer, fullBillData);
          if (success) {
            console.log('Bill printed to thermal printer:', printer.name);
            return { success: true, method: 'thermal' };
          }
        } catch (error) {
          console.error('Thermal Bill print failed:', error);
        }
      }
      
      // For network printers or failed thermal, use browser print with correct paper size
      if (printerRef?.current) {
        printWithBrowser(printerRef.current, printer.format);
        return { success: true, method: 'browser' };
      }
    }

    // No printer configured - fallback to browser print with default size
    if (printerRef?.current) {
      printWithBrowser(printerRef.current, '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'browser', error: 'No print method available' };
  }, [getPrinterByRole, businessInfo, currencySymbol, gstMode]);

  /**
   * Test print to a specific printer
   */
  const testPrint = useCallback(async (printer: Printer): Promise<PrintResult> => {
    const paperWidth = formatToPaperWidth(printer.format);
    const builder = new ESCPOSBuilder(paperWidth);

    builder
      .align(Alignment.CENTER)
      .bold(true)
      .line('*** TEST PRINT ***')
      .bold(false)
      .newline()
      .line(businessInfo.name)
      .line(`Printer: ${printer.name}`)
      .line(`Type: ${printer.type.toUpperCase()}`)
      .line(`Format: ${printer.format}`)
      .line(`Role: ${printer.role}`)
      .dashedLine()
      .line(new Date().toLocaleString('en-IN'))
      .dashedLine()
      .line('1234567890')
      .line('ABCDEFGHIJ')
      .line('abcdefghij')
      .line('!@#$%^&*()')
      .dashedLine()
      .align(Alignment.CENTER)
      .line('Print Test Successful!')
      .feed(4)
      .partialCut();

    try {
      const success = await sendToPrinter(printer, builder.build());
      return { success, method: 'thermal' };
    } catch (error) {
      return { 
        success: false, 
        method: 'thermal', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [businessInfo.name]);

  /**
   * Check if printer is connected
   */
  const checkPrinterStatus = useCallback((printerId: string): boolean => {
    return isPrinterConnected(printerId);
  }, []);

  /**
   * Open cash drawer (if printer supports it)
   */
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    const printer = getPrinterByRole('counter');
    if (!printer) return false;

    const builder = new ESCPOSBuilder(formatToPaperWidth(printer.format));
    builder.openCashDrawer();

    try {
      return await sendToPrinter(printer, builder.build());
    } catch {
      return false;
    }
  }, [getPrinterByRole]);

  return {
    printKOTInstant,
    printBillInstant,
    testPrint,
    checkPrinterStatus,
    openCashDrawer,
    businessInfo,
    currencySymbol,
    gstMode,
    printers,
    getPrinterByRole,
  };
}
