/**
 * usePrintQueue Hook
 * 
 * React hook for printing KOTs and Bills via the cloud print queue.
 * Works with the Local Print Agent running on the POS machine.
 */

import { useCallback, useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { 
  queueKOTPrint, 
  queueBillPrint, 
  queueTestPrint,
  checkLocalAgent,
  getLocalAgentStatus,
  type KOTPrintData,
  type BillPrintData 
} from '@/lib/printQueue';
import { printWithBrowser } from '@/lib/printService';
import { toast } from 'sonner';

interface PrintResult {
  success: boolean;
  method: 'queue' | 'browser' | 'failed';
  jobId?: string;
  error?: string;
}

interface AgentStatus {
  available: boolean;
  agentId?: string;
  printers?: string[];
}

export function usePrintQueue() {
  const { settings, getPrinterByRole } = useSettingsStore();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ available: false });
  const [isChecking, setIsChecking] = useState(false);

  // Check agent status on mount and periodically
  useEffect(() => {
    const checkAgent = async () => {
      const status = await getLocalAgentStatus();
      setAgentStatus(status);
    };

    checkAgent();
    const interval = setInterval(checkAgent, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Print KOT - tries queue first, falls back to browser
   */
  const printKOT = useCallback(async (
    data: KOTPrintData,
    printerRole: 'kitchen' | 'bar' = 'kitchen',
    fallbackElement?: HTMLElement
  ): Promise<PrintResult> => {
    // Try cloud queue first
    const result = await queueKOTPrint(data, printerRole);
    
    if (result.success) {
      return { success: true, method: 'queue', jobId: result.job_id };
    }

    // Fallback to browser print if queue fails
    if (fallbackElement) {
      const printer = getPrinterByRole(printerRole);
      printWithBrowser(fallbackElement, printer?.format || '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'failed', error: result.error };
  }, [getPrinterByRole]);

  /**
   * Print Bill - tries queue first, falls back to browser
   */
  const printBill = useCallback(async (
    data: BillPrintData,
    fallbackElement?: HTMLElement
  ): Promise<PrintResult> => {
    // Enrich with business info from settings
    const enrichedData: BillPrintData = {
      ...data,
      businessName: data.businessName || settings.business.name,
      businessAddress: data.businessAddress || settings.business.address,
      businessPhone: data.businessPhone || settings.business.phone,
      gstNumber: data.gstNumber || settings.business.gstNumber,
      currency: data.currency || settings.currency.symbol,
    };

    // Try cloud queue first
    const result = await queueBillPrint(enrichedData, 'counter');
    
    if (result.success) {
      return { success: true, method: 'queue', jobId: result.job_id };
    }

    // Fallback to browser print if queue fails
    if (fallbackElement) {
      const printer = getPrinterByRole('counter');
      printWithBrowser(fallbackElement, printer?.format || '80mm');
      return { success: true, method: 'browser' };
    }

    return { success: false, method: 'failed', error: result.error };
  }, [settings, getPrinterByRole]);

  /**
   * Test print to a specific printer role
   */
  const testPrint = useCallback(async (
    printerRole: 'counter' | 'kitchen' | 'bar' = 'counter'
  ): Promise<PrintResult> => {
    const result = await queueTestPrint(printerRole);
    
    if (result.success) {
      return { success: true, method: 'queue', jobId: result.job_id };
    }

    return { success: false, method: 'failed', error: result.error };
  }, []);

  /**
   * Manually refresh agent status
   */
  const refreshAgentStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await getLocalAgentStatus();
      setAgentStatus(status);
      return status;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    printKOT,
    printBill,
    testPrint,
    agentStatus,
    isAgentAvailable: agentStatus.available,
    refreshAgentStatus,
    isChecking,
  };
}
