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
  const { settings, printers: allPrinters, getPrinterByRole } = useSettingsStore();
  const electronPrint = useElectronPrint();

  // For testing: Add vendor and product IDs to the printer object
  const printersWithUSBIds = allPrinters.filter(printer => {
    if (printer.type == 'system' && printer.name.includes('Generic / Text Only')) {
      return {
        ...printer,
        vendorId: 0o416,
        productId: 5011
      };
    }
  });

  console.log(
    "printersWithUSBIds", printersWithUSBIds
  )

  const printers = printersWithUSBIds[0];

  // Unified print function - uses Electron when available, fallback to browser
  const print = useCallback(async (
    role: 'kitchen' | 'counter' | 'bar' = 'counter',
    data?: { type: 'kot' | 'bill'; payload: KOTData | BillData }
  ): Promise<{ success: boolean; method: string; error?: string }> => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🖨️  PRINT REQUEST INITIATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Print Details:');
    console.log('   - Role:', role);
    console.log('   - Data Type:', data?.type || 'test print');
    console.log('   - Has Payload:', !!data?.payload);

    const printer = getPrinterByRole(role);
    console.log('\n🔍 Printer Lookup:');
    console.log('   - Printer Found:', !!printer);
    if (printer) {
      console.log('   - Printer Name:', printer.name);
      console.log('   - Printer Format:', printer.format);
      console.log('   - Printer Role:', printer.role);
    } else {
      console.warn('   ⚠️  No printer configured for role:', role);
    }

    const format: PrintFormat = printer?.format || '80mm';
    console.log('   - Using Format:', format);

    console.log('\n🖥️  Environment Check:');
    console.log('   - Is Electron:', electronPrint.isElectron);
    console.log('   - Has Printer Config:', !!printer);
    console.log('   - Can Use Direct Print:', electronPrint.isElectron && !!printer);

    // If running in Electron with configured printers, use direct ESC/POS printing
    if (electronPrint.isElectron && printer) {
      console.log('\n✅ ELECTRON DIRECT PRINT PATH SELECTED');

      try {
        if (data?.type === 'kot') {
          console.log('\n📝 Generating KOT Commands...');
          const paperWidth = formatToPaperWidth(format);
          console.log('   - Paper Width:', paperWidth);

          const commands = generateKOTCommands(data.payload as KOTData, paperWidth);
          console.log('   - Commands Generated:', commands.length, 'bytes');
          console.log('   - First 50 bytes:', commands.slice(0, 50));

          console.log('\n🚀 Sending to Printer via Electron...', printer);
          const result = await electronPrint.printRaw(printer, commands);
          console.log('   - Print Result:', result);
          console.log('   - Success:', result.success);
          if (result.error) {
            console.error('   - Error:', result.error);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return { success: result.success, method: 'electron', error: result.error };

        } else if (data?.type === 'bill') {
          console.log('\n🧾 Generating Bill Commands...');
          const paperWidth = formatToPaperWidth(format);
          console.log('   - Paper Width:', paperWidth);

          const commands = generateBillCommands(data.payload as BillData, paperWidth);
          console.log('   - Commands Generated:', commands.length, 'bytes');
          console.log('   - First 50 bytes:', commands.slice(0, 50));

          console.log('\n🚀 Sending to Printer via Electron...');
          const result = await electronPrint.printRaw(printer, commands);
          console.log('   - Print Result:', result);
          console.log('   - Success:', result.success);
          if (result.error) {
            console.error('   - Error:', result.error);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return { success: result.success, method: 'electron', error: result.error };
        }

        // Test print without data
        console.log('\n🧪 Running Test Print...');
        if (printer) {
          const result = await electronPrint.testPrinter(printer);
          console.log('   - Test Result:', result);
          console.log('   - Success:', result.success);
          if (result.error) {
            console.error('   - Error:', result.error);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return { success: result.success, method: 'electron', error: result.error };
        }
      } catch (error) {
        console.error('\n❌ ELECTRON PRINT FAILED:');
        console.error('   - Error:', error);
        console.error('   - Error Message:', error instanceof Error ? error.message : String(error));
        console.error('   - Stack:', error instanceof Error ? error.stack : 'N/A');
        console.log('   - Falling back to browser print...');
      }
    } else {
      console.log('\n⚠️  ELECTRON DIRECT PRINT NOT AVAILABLE:');
      if (!electronPrint.isElectron) {
        console.log('   - Reason: Not running in Electron environment');
      }
      if (!printer) {
        console.log('   - Reason: No printer configured for role:', role);
      }
    }

    // Fallback to browser printing (shows print dialog)
    console.log('\n🌐 BROWSER PRINT FALLBACK');
    console.log('   - Has Print Ref:', !!printRef.current);

    if (printRef.current) {
      console.log('   - Calling browser print dialog...');
      console.log('   - Format:', format);
      printWithBrowser(printRef.current, format);
      console.log('   ✅ Browser print dialog triggered');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, method: 'browser' };
    }

    console.error('\n❌ NO PRINT METHOD AVAILABLE');
    console.error('   - No Electron printer');
    console.error('   - No browser print ref');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { success: false, method: 'none', error: 'No print method available' };
  }, [getPrinterByRole, electronPrint]);

  // Direct KOT print - silent in Electron
  const printKOTDirect = useCallback(async (kotData: KOTData): Promise<{ success: boolean; method: string; error?: string }> => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🍽️  KOT DIRECT PRINT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // const kitchenPrinter = getPrinterByRole('kitchen');
    // console.log('🔍 Kitchen Printer Lookup:');
    // console.log('   - Found:', !!kitchenPrinter);
    // if (kitchenPrinter) {
    //   console.log('   - Name:', kitchenPrinter.name);
    //   console.log('   - Format:', kitchenPrinter.format);
    // }

    console.log('🖥️  Environment:', electronPrint.isElectron ? 'Electron' : 'Browser');

    if (electronPrint.isElectron) {
      console.log('\n📝 Generating KOT Commands...');
      const paperWidth = formatToPaperWidth('80mm');
      console.log('   - Paper Width:', paperWidth);
      console.log('   - KOT Data:', kotData);

      const commands = generateKOTCommands(kotData, paperWidth);
      console.log('   - Commands Size:', commands.length, 'bytes');

      console.log('\n🚀 Sending to Kitchen Printer...');
      const result = await electronPrint.printRaw(printers, commands);
      console.log('   - Result:', result);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: result.success, method: 'electron', error: result.error };
    }

    // Fallback to browser
    console.log('\n🌐 Falling back to browser print...');
    if (printRef.current) {
      printWithBrowser(printRef.current, '80mm');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, method: 'browser' };
    }

    console.error('❌ No kitchen printer configured');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { success: false, method: 'none', error: 'No kitchen printer configured' };
  }, [electronPrint, getPrinterByRole]);

  // Direct Bill print - silent in Electron
  const printBillDirect = useCallback(async (billData: BillData): Promise<{ success: boolean; method: string; error?: string }> => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧾 BILL DIRECT PRINT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const counterPrinter = getPrinterByRole('counter');
    console.log('🔍 Counter Printer Lookup:');
    console.log('   - Found:', !!counterPrinter);
    if (counterPrinter) {
      console.log('   - Name:', counterPrinter.name);
      console.log('   - Format:', counterPrinter.format);
    }

    console.log('🖥️  Environment:', electronPrint.isElectron ? 'Electron' : 'Browser');

    if (electronPrint.isElectron && counterPrinter) {
      console.log('\n🧾 Generating Bill Commands...');
      const paperWidth = formatToPaperWidth(counterPrinter.format);
      console.log('   - Paper Width:', paperWidth);
      console.log('   - Bill Data:', billData);

      const commands = generateBillCommands(billData, paperWidth);
      console.log('   - Commands Size:', commands.length, 'bytes');

      console.log('\n🚀 Sending to Counter Printer...');
      const result = await electronPrint.printRaw(counterPrinter, commands);
      console.log('   - Result:', result);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: result.success, method: 'electron', error: result.error };
    }

    // Fallback to browser
    console.log('\n🌐 Falling back to browser print...');
    if (printRef.current) {
      printWithBrowser(printRef.current, counterPrinter?.format || '80mm');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, method: 'browser' };
    }

    console.error('❌ No counter printer configured');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { success: false, method: 'none', error: 'No counter printer configured' };
  }, [electronPrint, getPrinterByRole]);

  // Open cash drawer (Electron only)
  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 OPEN CASH DRAWER REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🖥️  Is Electron:', electronPrint.isElectron);

    if (electronPrint.isElectron) {
      console.log('🚀 Sending open drawer command...');
      const result = await electronPrint.openCashDrawer();
      console.log('   - Result:', result);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return result;
    }

    console.warn('⚠️  Cash drawer only works in Electron');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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