/**
 * Thermal Printer Connection Manager
 * Supports USB (WebUSB), Bluetooth (Web Bluetooth), and Network printers
 */

import type { Printer, PrintFormat } from '@/types/settings';
import { formatToPaperWidth, type PaperWidth } from './commands';
import { generateKOTCommands, generateBillCommands, type KOTData, type BillData } from './templates';

// Type declarations for Web APIs
declare global {
  interface Navigator {
    usb?: {
      requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<USBPrinterDevice>;
      getDevices(): Promise<USBPrinterDevice[]>;
    };
  }
}

// Bluetooth types for Web Bluetooth API
interface BluetoothCharacteristic {
  writeValue(data: BufferSource): Promise<void>;
}

interface USBPrinterDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(config: number): Promise<void>;
  claimInterface(iface: number): Promise<void>;
  releaseInterface(iface: number): Promise<void>;
  transferOut(endpoint: number, data: ArrayBuffer): Promise<any>;
  configuration: {
    interfaces: Array<{
      alternate: {
        endpoints: Array<{
          endpointNumber: number;
          direction: 'in' | 'out';
        }>;
      };
    }>;
  } | null;
}

// Printer connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Cached connections
const connectionCache = new Map<string, {
  type: 'usb' | 'bluetooth' | 'network';
  device?: USBPrinterDevice;
  characteristic?: BluetoothCharacteristic;
  status: ConnectionStatus;
  lastUsed: number;
}>();

// USB Vendor IDs for common thermal printers
const THERMAL_PRINTER_VENDORS = [
  0x0416, // Winbond
  0x04b8, // Epson
  0x0519, // Star Micronics
  0x0dd4, // Custom Engineering
  0x1504, // SNBC
  0x0fe6, // Kontron
  0x28e9, // Gprinter
  0x0483, // STMicroelectronics
  0x1fc9, // NXP
  0x0525, // PLX Technology
  0x067b, // Prolific
  0x1a86, // QinHeng (CH340)
  0x10c4, // Silicon Labs
];

/**
 * Connect to USB Thermal Printer via WebUSB
 * Returns the USB device if successful
 */
export const connectUSBPrinter = async (printer?: Printer): Promise<USBPrinterDevice | null> => {
  if (!navigator.usb) {
    console.warn('WebUSB API not supported in this browser');
    return null;
  }

  try {
    // Request device from user
    const device = await navigator.usb.requestDevice({
      filters: THERMAL_PRINTER_VENDORS.map(vendorId => ({ vendorId }))
    });

    // Open and configure device
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Cache connection if printer config provided
    if (printer) {
      connectionCache.set(printer.id, { 
        type: 'usb', 
        device, 
        status: 'connected', 
        lastUsed: Date.now() 
      });
    }

    console.log('USB Printer connected:', device.productName);
    return device;
  } catch (error) {
    console.error('USB Printer connection error:', error);
    return null;
  }
};

/**
 * Get previously connected USB devices
 */
export const getConnectedUSBPrinters = async (): Promise<USBPrinterDevice[]> => {
  if (!navigator.usb) return [];
  try {
    return await navigator.usb.getDevices();
  } catch {
    return [];
  }
};

/**
 * Connect to Bluetooth Thermal Printer via Web Bluetooth
 */
export const connectBluetoothPrinter = async (printer?: Printer): Promise<BluetoothCharacteristic | null> => {
  if (!('bluetooth' in navigator)) {
    console.warn('Web Bluetooth not supported in this browser');
    return null;
  }

  try {
    // Common printer service UUIDs
    const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
    const PRINTER_CHAR = '00002af1-0000-1000-8000-00805f9b34fb';

    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: [PRINTER_SERVICE] },
        { namePrefix: 'Printer' },
        { namePrefix: 'POS' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'BT' },
      ],
      optionalServices: [PRINTER_SERVICE],
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Failed to connect to GATT server');

    const service = await server.getPrimaryService(PRINTER_SERVICE);
    const characteristic = await service.getCharacteristic(PRINTER_CHAR);

    if (printer) {
      connectionCache.set(printer.id, { 
        type: 'bluetooth', 
        device, 
        characteristic, 
        status: 'connected', 
        lastUsed: Date.now() 
      });
    }

    console.log('Bluetooth Printer connected:', device.name);
    return characteristic;
  } catch (error) {
    console.error('Bluetooth Printer connection error:', error);
    return null;
  }
};

/**
 * Send data to USB printer in chunks
 */
const sendToUSBPrinter = async (device: USBPrinterDevice, data: Uint8Array): Promise<boolean> => {
  try {
    const endpoint = device.configuration?.interfaces[0]?.alternate.endpoints.find(
      (ep) => ep.direction === 'out'
    );
    
    if (!endpoint) {
      console.error('No OUT endpoint found on USB device');
      return false;
    }

    // Send in chunks of 64 bytes (USB packet size)
    const CHUNK_SIZE = 64;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, data.length));
      await device.transferOut(endpoint.endpointNumber, chunk.buffer);
    }
    
    return true;
  } catch (error) {
    console.error('USB print error:', error);
    return false;
  }
};

/**
 * Send data to Bluetooth printer in chunks
 */
const sendToBluetoothPrinter = async (characteristic: BluetoothCharacteristic, data: Uint8Array): Promise<boolean> => {
  try {
    // Send in chunks of 20 bytes (BLE MTU)
    const CHUNK_SIZE = 20;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, data.length));
      await characteristic.writeValue(chunk);
      // Small delay between chunks for BLE
      await new Promise(r => setTimeout(r, 10));
    }
    return true;
  } catch (error) {
    console.error('Bluetooth print error:', error);
    return false;
  }
};

/**
 * Print KOT to thermal printer
 */
export const printKOT = async (printer: Printer, data: KOTData): Promise<boolean> => {
  const paperWidth = formatToPaperWidth(printer.format);
  const commands = generateKOTCommands(data, paperWidth);
  return sendToPrinter(printer, commands);
};

/**
 * Print Bill to thermal printer
 */
export const printBill = async (printer: Printer, data: BillData): Promise<boolean> => {
  const paperWidth = formatToPaperWidth(printer.format);
  const commands = generateBillCommands(data, paperWidth);
  return sendToPrinter(printer, commands);
};

/**
 * Main function to send data to any type of printer
 */
export const sendToPrinter = async (printer: Printer, data: Uint8Array): Promise<boolean> => {
  // Check cache first
  const cached = connectionCache.get(printer.id);
  
  if (cached?.status === 'connected') {
    cached.lastUsed = Date.now();
    
    if (cached.type === 'usb' && cached.device) {
      const success = await sendToUSBPrinter(cached.device, data);
      if (success) return true;
      // Connection might be stale, remove from cache
      connectionCache.delete(printer.id);
    }
    
    if (cached.type === 'bluetooth' && cached.characteristic) {
      const success = await sendToBluetoothPrinter(cached.characteristic, data);
      if (success) return true;
      connectionCache.delete(printer.id);
    }
  }

  // Try to establish new connection based on printer type
  if (printer.type === 'usb') {
    console.log('Attempting USB connection for:', printer.name);
    const device = await connectUSBPrinter(printer);
    if (device) {
      return sendToUSBPrinter(device, data);
    }
  }
  
  if (printer.type === 'bluetooth') {
    console.log('Attempting Bluetooth connection for:', printer.name);
    const characteristic = await connectBluetoothPrinter(printer);
    if (characteristic) {
      return sendToBluetoothPrinter(characteristic, data);
    }
  }

  // Network printers can't be accessed directly from browser
  // They require a local print server or use browser print
  if (printer.type === 'network') {
    console.warn('Network printers require browser print fallback');
    return false;
  }

  console.warn('Printer not available:', printer.name);
  return false;
};

/**
 * Check if a printer is connected
 */
export const isPrinterConnected = (printerId: string): boolean => {
  const cached = connectionCache.get(printerId);
  return cached?.status === 'connected';
};

/**
 * Disconnect from a printer
 */
export const disconnectPrinter = async (printerId: string): Promise<void> => {
  const cached = connectionCache.get(printerId);
  if (!cached) return;

  try {
    if (cached.type === 'usb' && cached.device) {
      await cached.device.releaseInterface(0);
      await cached.device.close();
    }
    if (cached.type === 'bluetooth' && cached.device) {
      (cached.device as any).gatt?.disconnect();
    }
  } catch (error) {
    console.error('Error disconnecting printer:', error);
  }

  connectionCache.delete(printerId);
};

/**
 * Clear all cached connections
 */
export const clearAllConnections = async (): Promise<void> => {
  for (const [printerId] of connectionCache) {
    await disconnectPrinter(printerId);
  }
};
