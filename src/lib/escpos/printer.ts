/**
 * Thermal Printer Connection Manager
 * 
 * NOTE: Browser-based USB/Bluetooth printing has been deprecated due to 
 * security restrictions (WebUSB SecurityError, Mixed Content for network).
 * 
 * Use the Local Print Agent instead:
 * - Download from /pos-print-agent/
 * - Run: npm install && npm start
 * - Jobs are queued via Supabase and picked up by the agent
 */

import type { Printer, PrintFormat } from '@/types/settings';
import { formatToPaperWidth, type PaperWidth } from './commands';
import { generateKOTCommands, generateBillCommands, type KOTData, type BillData } from './templates';

// Printer connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * @deprecated Use printQueue.ts instead
 * Browser-based USB printing is not reliable due to WebUSB security restrictions
 */
export const connectUSBPrinter = async (): Promise<null> => {
  console.warn(
    'Browser-based USB printing is deprecated. ' +
    'Please use the Local Print Agent for reliable thermal printing.'
  );
  return null;
};

/**
 * @deprecated Use printQueue.ts instead
 * Browser-based Bluetooth printing has reliability issues
 */
export const connectBluetoothPrinter = async (): Promise<null> => {
  console.warn(
    'Browser-based Bluetooth printing is deprecated. ' +
    'Please use the Local Print Agent for reliable thermal printing.'
  );
  return null;
};

/**
 * Get previously connected USB devices
 * @deprecated No longer used
 */
export const getConnectedUSBPrinters = async (): Promise<never[]> => {
  return [];
};

/**
 * @deprecated Use printQueue.ts queueKOTPrint instead
 */
export const printKOT = async (printer: Printer, data: KOTData): Promise<boolean> => {
  console.warn('Use queueKOTPrint from printQueue.ts instead');
  return false;
};

/**
 * @deprecated Use printQueue.ts queueBillPrint instead
 */
export const printBill = async (printer: Printer, data: BillData): Promise<boolean> => {
  console.warn('Use queueBillPrint from printQueue.ts instead');
  return false;
};

/**
 * @deprecated Direct printing no longer supported
 */
export const sendToPrinter = async (printer: Printer, data: Uint8Array): Promise<boolean> => {
  console.warn('Direct browser printing is deprecated. Use the print queue instead.');
  return false;
};

/**
 * Check if a printer is connected
 * @deprecated Local Print Agent handles connections
 */
export const isPrinterConnected = (printerId: string): boolean => {
  return false;
};

/**
 * Disconnect from a printer
 * @deprecated No longer needed
 */
export const disconnectPrinter = async (printerId: string): Promise<void> => {
  // No-op
};

/**
 * Clear all cached connections
 * @deprecated No longer needed
 */
export const clearAllConnections = async (): Promise<void> => {
  // No-op
};

// Re-export types for backward compatibility
export { formatToPaperWidth };
export type { PaperWidth, KOTData, BillData };
