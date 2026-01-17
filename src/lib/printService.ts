import { useSettingsStore } from '@/store/settingsStore';
import type { Printer, PrintFormat } from '@/types/settings';

export interface PrintJob {
  type: 'kot' | 'bill';
  content: HTMLElement;
  copies?: number;
}

// Get print format CSS for different paper sizes
const getPrintFormatCSS = (format: PrintFormat): string => {
  switch (format) {
    case '58mm':
      return `
        @page { size: 58mm auto; margin: 0; }
        .print-content { width: 58mm; font-size: 10px; }
      `;
    case '76mm':
      return `
        @page { size: 76mm auto; margin: 0; }
        .print-content { width: 76mm; font-size: 11px; }
      `;
    case 'a5':
      return `
        @page { size: A5; margin: 10mm; }
        .print-content { width: 100%; font-size: 12px; }
      `;
    case 'a4':
      return `
        @page { size: A4; margin: 15mm; }
        .print-content { width: 100%; font-size: 12px; }
      `;
    default:
      return `
        @page { size: 80mm auto; margin: 0; }
        .print-content { width: 80mm; font-size: 11px; }
      `;
  }
};

// Print using browser's print dialog
export const printWithBrowser = (content: HTMLElement, format: PrintFormat = '76mm'): void => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  const formatCSS = getPrintFormatCSS(format);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          ${formatCSS}
          body {
            margin: 0;
            padding: 0;
            font-family: 'Courier New', monospace;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="print-content">${content.innerHTML}</div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

// Network printer discovery using WebSocket/HTTP probing
export const discoverNetworkPrinters = async (): Promise<Array<{ ip: string; name: string; port: number }>> => {
  const discoveredPrinters: Array<{ ip: string; name: string; port: number }> = [];
  
  // Common printer ports
  const printerPorts = [9100, 515, 631];
  
  // Get local network range (common ranges)
  const networkRanges = [
    '192.168.1',
    '192.168.0',
    '10.0.0',
  ];

  // Probe for printers using fetch with timeout
  const probeAddress = async (ip: string, port: number): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 500);
      
      // Try HTTP probe for web-enabled printers
      const response = await fetch(`http://${ip}:${port === 631 ? 631 : 80}/`, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => null);
      
      clearTimeout(timeout);
      return response !== null;
    } catch {
      return false;
    }
  };

  // Limited scan for performance
  for (const range of networkRanges) {
    const promises: Promise<void>[] = [];
    
    for (let i = 1; i <= 50; i++) {
      const ip = `${range}.${i}`;
      
      promises.push(
        (async () => {
          for (const port of printerPorts) {
            const found = await probeAddress(ip, port);
            if (found) {
              discoveredPrinters.push({
                ip,
                name: `Printer at ${ip}`,
                port,
              });
              break;
            }
          }
        })()
      );
    }
    
    await Promise.all(promises);
  }

  return discoveredPrinters;
};

// Bluetooth printer discovery (Web Bluetooth API)
export const discoverBluetoothPrinters = async (): Promise<Array<{ id: string; name: string }>> => {
  if (!('bluetooth' in navigator)) {
    console.warn('Web Bluetooth API not supported');
    return [];
  }

  try {
    // Request Bluetooth device with printer service
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common printer service
        { namePrefix: 'Printer' },
        { namePrefix: 'POS' },
        { namePrefix: 'Star' },
        { namePrefix: 'Epson' },
        { namePrefix: 'Thermal' },
      ],
      optionalServices: ['battery_service'],
    });

    if (device) {
      return [{
        id: device.id,
        name: device.name || 'Bluetooth Printer',
      }];
    }
  } catch (error) {
    console.error('Bluetooth discovery error:', error);
  }

  return [];
};

// Print to network printer via raw socket (requires backend support)
export const printToNetworkPrinter = async (
  printer: Printer,
  content: string
): Promise<boolean> => {
  // For direct network printing, we'd need a backend proxy
  // since browsers can't open raw TCP sockets
  // This is a placeholder that uses browser print as fallback
  console.warn('Direct network printing requires backend support. Using browser print.');
  return false;
};

// Print to Bluetooth printer
export const printToBluetoothPrinter = async (
  deviceId: string,
  content: string
): Promise<boolean> => {
  if (!('bluetooth' in navigator)) {
    console.warn('Web Bluetooth API not supported');
    return false;
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ name: deviceId }],
    });

    const server = await device.gatt?.connect();
    if (!server) return false;

    // Get printer service
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    // Send content as bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    await characteristic.writeValue(data);

    await server.disconnect();
    return true;
  } catch (error) {
    console.error('Bluetooth print error:', error);
    return false;
  }
};

// Main print function that respects settings
export const print = async (
  job: PrintJob,
  printerRole?: 'kitchen' | 'counter' | 'bar'
): Promise<void> => {
  const { printers, getPrinterByRole, settings } = useSettingsStore.getState();
  
  // Determine which printer to use
  const role = printerRole || (job.type === 'kot' ? 'kitchen' : 'counter');
  const printer = getPrinterByRole(role);
  
  if (!printer) {
    // Fallback to browser print with default format
    printWithBrowser(job.content, '76mm');
    return;
  }

  const format = printer.format;
  
  if (printer.type === 'bluetooth' && printer.ipAddress) {
    // Try Bluetooth printing
    const success = await printToBluetoothPrinter(printer.ipAddress, job.content.innerHTML);
    if (!success) {
      printWithBrowser(job.content, format);
    }
  } else if (printer.type === 'network' && printer.ipAddress) {
    // Try network printing (currently falls back to browser)
    const success = await printToNetworkPrinter(printer, job.content.innerHTML);
    if (!success) {
      printWithBrowser(job.content, format);
    }
  } else {
    // Default to browser print
    printWithBrowser(job.content, format);
  }
};

// Format currency based on settings
export const formatCurrency = (amount: number): string => {
  const { settings } = useSettingsStore.getState();
  const { symbol, useCommas, decimalPlaces } = settings.currency;
  
  let formatted = amount.toFixed(decimalPlaces);
  
  if (useCommas) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }
  
  return `${symbol}${formatted}`;
};
