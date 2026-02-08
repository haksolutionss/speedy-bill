/**
 * Print Queue Service
 * 
 * Submits print jobs to the Supabase edge function queue.
 * Jobs are picked up by the Local Print Agent running on the POS machine.
 */

import { supabase } from '@/integrations/supabase/client';

export interface KOTPrintData {
  kotNumber: string;
  tableNumber?: string;
  tokenNumber?: number;
  items: Array<{
    name: string;
    quantity: number;
    portion?: string;
    notes?: string;
  }>;
}

export interface BillPrintData {
  billNumber: string;
  tableNumber?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  fssaiNumber?: string;
  gstNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    portion?: string;
  }>;
  subTotal: number;
  cgstAmount?: number;
  sgstAmount?: number;
  discountAmount?: number;
  finalAmount: number;
  paymentMethod?: string;
  currency?: string;
}

interface PrintJobResponse {
  success: boolean;
  job_id?: string;
  error?: string;
}

interface PrintJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

/**
 * Submit a KOT print job to the queue
 */
export const queueKOTPrint = async (
  data: KOTPrintData,
  printerRole: 'kitchen' | 'bar' = 'kitchen'
): Promise<PrintJobResponse> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('print-queue/submit', {
      body: {
        job_type: 'kot',
        printer_role: printerRole,
        payload: data,
      },
    });

    if (error) {
      console.error('Failed to queue KOT print:', error);
      return { success: false, error: error.message };
    }

    return { success: true, job_id: response?.job_id };
  } catch (error) {
    console.error('Print queue error:', error);
    return { success: false, error: 'Failed to connect to print service' };
  }
};

/**
 * Submit a Bill print job to the queue
 */
export const queueBillPrint = async (
  data: BillPrintData,
  printerRole: 'counter' = 'counter'
): Promise<PrintJobResponse> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('print-queue/submit', {
      body: {
        job_type: 'bill',
        printer_role: printerRole,
        payload: data,
      },
    });

    if (error) {
      console.error('Failed to queue bill print:', error);
      return { success: false, error: error.message };
    }

    return { success: true, job_id: response?.job_id };
  } catch (error) {
    console.error('Print queue error:', error);
    return { success: false, error: 'Failed to connect to print service' };
  }
};

/**
 * Submit a test print job
 */
export const queueTestPrint = async (
  printerRole: 'counter' | 'kitchen' | 'bar' = 'counter'
): Promise<PrintJobResponse> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('print-queue/submit', {
      body: {
        job_type: 'test',
        printer_role: printerRole,
        payload: { timestamp: new Date().toISOString() },
      },
    });

    if (error) {
      console.error('Failed to queue test print:', error);
      return { success: false, error: error.message };
    }

    return { success: true, job_id: response?.job_id };
  } catch (error) {
    console.error('Print queue error:', error);
    return { success: false, error: 'Failed to connect to print service' };
  }
};

/**
 * Check the status of a print job
 */
export const getPrintJobStatus = async (jobId: string): Promise<PrintJobStatus | null> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('print-queue/status', {
      body: { job_id: jobId },
      method: 'GET',
    });

    if (error) {
      console.error('Failed to get job status:', error);
      return null;
    }

    return response?.job || null;
  } catch (error) {
    console.error('Print queue error:', error);
    return null;
  }
};

/**
 * Check if Local Print Agent is available
 */
export const checkLocalAgent = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('http://localhost:8765/health', {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get Local Print Agent status
 */
export const getLocalAgentStatus = async (): Promise<{
  available: boolean;
  agentId?: string;
  printers?: string[];
}> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('http://localhost:8765/health', {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        agentId: data.agent_id,
        printers: data.printers,
      };
    }

    return { available: false };
  } catch {
    return { available: false };
  }
};
