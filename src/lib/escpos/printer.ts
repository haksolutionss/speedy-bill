/**
 * Thermal Printer Connection Manager
 * Supports Network, USB (WebUSB), and Bluetooth (Web Bluetooth)
 */

import type { Printer, PrintFormat } from '@/types/settings';
import { formatToPaperWidth, type PaperWidth } from './commands';
import { generateKOTCommands, generateBillCommands, type KOTData, type BillData } from './templates';

// Type declarations for Web APIs
declare global {
  interface Navigator {
    usb?: {
      requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<any>;
    };
  }
}

// Printer connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Cached connections
const connectionCache = new Map<string, {
  type: 'usb' | 'bluetooth' | 'network';
  device?: any;
  characteristic?: any;
  status: ConnectionStatus;
  lastUsed: number;
}>();

// USB Vendor IDs for common thermal printers
const THERMAL_PRINTER_VENDORS = [
  0x0416, 0x04b8, 0x0519, 0x0dd4, 0x1504, 0x0fe6, 0x28e9, 0x0483, 0x1fc9,
];

/**
 * Connect to USB Thermal Printer
 */
export const connectUSBPrinter = async (printer?: Printer): Promise<any> => {
  if (!navigator.usb) {
    console.warn('WebUSB API not supported');
    return null;
  }

  try {
    const device = await navigator.usb.requestDevice({
      filters: THERMAL_PRINTER_VENDORS.map(vendorId => ({ vendorId }))
    });

    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    await device.claimInterface(0);

    if (printer) {
      connectionCache.set(printer.id, { type: 'usb', device, status: 'connected', lastUsed: Date.now() });
    }
    return device;
  } catch (error) {
    console.error('USB Printer error:', error);
    return null;
  }
};

/**
 * Connect to Bluetooth Thermal Printer
 */
export const connectBluetoothPrinter = async (printer?: Printer): Promise<any> => {
  if (!('bluetooth' in navigator)) {
    console.warn('Web Bluetooth not supported');
    return null;
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { namePrefix: 'Printer' }, { namePrefix: 'POS' }, { namePrefix: 'Thermal' },
      ],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    });

    const server = await device.gatt?.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    if (printer) {
      connectionCache.set(printer.id, { type: 'bluetooth', device, characteristic, status: 'connected', lastUsed: Date.now() });
    }
    return characteristic;
  } catch (error) {
    console.error('Bluetooth error:', error);
    return null;
  }
};

const sendToUSBPrinter = async (device: any, data: Uint8Array): Promise<boolean> => {
  try {
    const endpoint = device.configuration?.interfaces[0]?.alternate.endpoints.find((ep: any) => ep.direction === 'out');
    if (!endpoint) return false;
    for (let i = 0; i < data.length; i += 64) {
      await device.transferOut(endpoint.endpointNumber, data.slice(i, i + 64));
    }
    return true;
  } catch { return false; }
};

const sendToBluetoothPrinter = async (characteristic: any, data: Uint8Array): Promise<boolean> => {
  try {
    for (let i = 0; i < data.length; i += 20) {
      await characteristic.writeValue(data.slice(i, i + 20));
      await new Promise(r => setTimeout(r, 10));
    }
    return true;
  } catch { return false; }
};

export const printKOT = async (printer: Printer, data: KOTData): Promise<boolean> => {
  const commands = generateKOTCommands(data, formatToPaperWidth(printer.format));
  return sendToPrinter(printer, commands);
};

export const printBill = async (printer: Printer, data: BillData): Promise<boolean> => {
  const commands = generateBillCommands(data, formatToPaperWidth(printer.format));
  return sendToPrinter(printer, commands);
};

export const sendToPrinter = async (printer: Printer, data: Uint8Array): Promise<boolean> => {
  const cached = connectionCache.get(printer.id);
  
  if (cached?.status === 'connected') {
    cached.lastUsed = Date.now();
    if (cached.type === 'usb' && cached.device) return sendToUSBPrinter(cached.device, data);
    if (cached.type === 'bluetooth' && cached.characteristic) return sendToBluetoothPrinter(cached.characteristic, data);
  }

  if (printer.type === 'usb') {
    const device = await connectUSBPrinter(printer);
    if (device) return sendToUSBPrinter(device, data);
  }
  
  if (printer.type === 'bluetooth') {
    const char = await connectBluetoothPrinter(printer);
    if (char) return sendToBluetoothPrinter(char, data);
  }

  console.warn('Printer not available, use browser fallback');
  return false;
};

export const isPrinterConnected = (printerId: string): boolean => {
  return connectionCache.get(printerId)?.status === 'connected';
};

export const disconnectPrinter = async (printerId: string): Promise<void> => {
  const cached = connectionCache.get(printerId);
  if (!cached) return;
  try {
    if (cached.device?.close) await cached.device.close();
    if (cached.device?.gatt?.disconnect) cached.device.gatt.disconnect();
  } catch {}
  connectionCache.delete(printerId);
};
