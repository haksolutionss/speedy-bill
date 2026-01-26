/**
 * POSYTUDE YHD-8330 USB Printer Types
 * Single printer handles both KOT and Bill printing
 */

export interface PosytudePrinter {
  vendorId: number;
  productId: number;
  name: string;
  manufacturer?: string;
  status: 'connected' | 'disconnected' | 'error' | 'printing';
  format: '80mm' | '58mm';
}

export interface PrintResult {
  success: boolean;
  error?: string;
  troubleshooting?: string[];
}

export interface PrinterStatus {
  status: 'connected' | 'disconnected' | 'error' | 'unavailable';
  message?: string;
  troubleshooting?: string[];
}

// Default POSYTUDE printer config
export const DEFAULT_POSYTUDE_PRINTER: PosytudePrinter = {
  vendorId: 0x0416,
  productId: 0, // Will be detected
  name: 'POSYTUDE YHD-8330',
  manufacturer: 'POSYTUDE',
  status: 'disconnected',
  format: '80mm',
};
