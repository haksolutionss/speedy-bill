import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';
import type { PrinterRole, PrintFormat } from '@/types/settings';

interface DiscoveredPrinter {
  name: string;
  type: 'usb' | 'network' | 'system';
  vendorId?: number;
  productId?: number;
  ip?: string;
  port?: number;
  manufacturer?: string;
}

// Naming patterns for role assignment
const KITCHEN_PATTERNS = [
  /kitchen/i,
  /kot/i,
  /cook/i,
  /chef/i,
  /food/i,
  /back/i,
  /prep/i,
];

const BAR_PATTERNS = [
  /bar/i,
  /drink/i,
  /beverage/i,
  /cocktail/i,
];

const COUNTER_PATTERNS = [
  /counter/i,
  /receipt/i,
  /bill/i,
  /cashier/i,
  /front/i,
  /pos/i,
  /main/i,
];

// Known thermal printer vendor IDs
const THERMAL_PRINTER_VENDORS: Record<number, string> = {
  0x0416: 'Winbond',
  0x0483: 'STMicroelectronics',
  0x0525: 'PLX Technology',
  0x04B8: 'Epson',
  0x0519: 'Star Micronics',
  0x067B: 'Prolific',
  0x0DD4: 'Custom Engineering',
  0x0FE6: 'ICS',
  0x154F: 'SNBC',
  0x1504: 'SNBC',
  0x1A86: 'QinHeng',
  0x1CB0: 'GP Printer',
  0x1FC9: 'NXP',
  0x20D1: 'Xprinter',
  0x28E9: 'GD32',
  0x416D: 'MUNBYN',
  0x4B43: 'XP-80C',
};

/**
 * Hook for auto-adding discovered printers with smart role assignment
 */
export function usePrinterAutoAdd() {
  const { printers, addPrinter, loadPrinters } = useSettingsStore();

  /**
   * Determine printer role based on name patterns
   */
  const detectRole = useCallback((name: string): PrinterRole => {
    const nameLower = name.toLowerCase();
    
    // Check kitchen patterns first
    if (KITCHEN_PATTERNS.some(pattern => pattern.test(nameLower))) {
      return 'kitchen';
    }
    
    // Check bar patterns
    if (BAR_PATTERNS.some(pattern => pattern.test(nameLower))) {
      return 'bar';
    }
    
    // Check counter patterns or default to counter
    return 'counter';
  }, []);

  /**
   * Determine paper format based on printer info
   */
  const detectFormat = useCallback((printer: DiscoveredPrinter): PrintFormat => {
    const name = printer.name.toLowerCase();
    
    // Check for format hints in name
    if (name.includes('58mm') || name.includes('58 mm')) return '58mm';
    if (name.includes('76mm') || name.includes('76 mm')) return '76mm';
    if (name.includes('80mm') || name.includes('80 mm')) return '80mm';
    
    // Default to 80mm for thermal printers
    return '80mm';
  }, []);

  /**
   * Check if printer is already configured
   */
  const isPrinterConfigured = useCallback((printer: DiscoveredPrinter): boolean => {
    return printers.some(existing => {
      // Check USB match
      if (printer.type === 'usb' && existing.type === 'usb') {
        return existing.vendorId === printer.vendorId && 
               existing.productId === printer.productId;
      }
      
      // Check network match
      if (printer.type === 'network' && existing.type === 'network') {
        return existing.ipAddress === printer.ip;
      }
      
      // Check name match
      return existing.name.toLowerCase() === printer.name.toLowerCase();
    });
  }, [printers]);

  /**
   * Check if this is a known thermal printer (USB)
   */
  const isThermalPrinter = useCallback((vendorId?: number): boolean => {
    if (!vendorId) return true; // Assume thermal for network printers
    return vendorId in THERMAL_PRINTER_VENDORS;
  }, []);

  /**
   * Auto-add a single discovered printer
   */
  const autoAddPrinter = useCallback(async (
    printer: DiscoveredPrinter,
    options?: { skipConfirmation?: boolean }
  ): Promise<boolean> => {
    // Skip if already configured
    if (isPrinterConfigured(printer)) {
      console.log(`Printer ${printer.name} already configured, skipping`);
      return false;
    }

    // Skip if not a thermal printer (for USB)
    if (printer.type === 'usb' && !isThermalPrinter(printer.vendorId)) {
      console.log(`Printer ${printer.name} not a thermal printer, skipping`);
      return false;
    }

    const role = detectRole(printer.name);
    const format = detectFormat(printer);

    // Check if we already have a default for this role
    const existingDefault = printers.find(p => p.role === role && p.isDefault);

    try {
      await addPrinter({
        name: printer.name,
        type: printer.type === 'system' ? 'network' : printer.type,
        vendorId: printer.vendorId,
        productId: printer.productId,
        ipAddress: printer.ip,
        port: printer.port || 9100,
        role,
        format,
        isActive: true,
        isDefault: !existingDefault, // Make default if no existing default for this role
      });

      return true;
    } catch (error) {
      console.error(`Failed to add printer ${printer.name}:`, error);
      return false;
    }
  }, [printers, isPrinterConfigured, isThermalPrinter, detectRole, detectFormat, addPrinter]);

  /**
   * Auto-add multiple discovered printers
   */
  const autoAddPrinters = useCallback(async (
    discoveredPrinters: {
      usb?: DiscoveredPrinter[];
      network?: DiscoveredPrinter[];
      system?: DiscoveredPrinter[];
    }
  ): Promise<{ added: number; skipped: number }> => {
    const allPrinters: DiscoveredPrinter[] = [
      ...(discoveredPrinters.usb || []).map(p => ({ ...p, type: 'usb' as const })),
      ...(discoveredPrinters.network || []).map(p => ({ ...p, type: 'network' as const })),
      ...(discoveredPrinters.system || []).map(p => ({ ...p, type: 'system' as const })),
    ];

    let added = 0;
    let skipped = 0;

    for (const printer of allPrinters) {
      const wasAdded = await autoAddPrinter(printer);
      if (wasAdded) {
        added++;
      } else {
        skipped++;
      }
    }

    if (added > 0) {
      toast.success(`Auto-configured ${added} printer(s)`, {
        description: `Roles assigned based on printer names`
      });
      await loadPrinters();
    }

    return { added, skipped };
  }, [autoAddPrinter, loadPrinters]);

  return {
    autoAddPrinter,
    autoAddPrinters,
    detectRole,
    detectFormat,
    isPrinterConfigured,
    isThermalPrinter,
  };
}
