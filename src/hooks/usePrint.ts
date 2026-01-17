import { useRef, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { printWithBrowser } from '@/lib/printService';
import type { PrintFormat } from '@/types/settings';

export function usePrint() {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, getPrinterByRole } = useSettingsStore();

  const print = useCallback((role: 'kitchen' | 'counter' | 'bar' = 'counter') => {
    if (!printRef.current) return;

    const printer = getPrinterByRole(role);
    const format: PrintFormat = printer?.format || '76mm';

    printWithBrowser(printRef.current, format);
  }, [getPrinterByRole]);

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
    getBusinessInfo,
    getTaxSettings,
    formatCurrency,
    currencySymbol: settings.currency.symbol,
    gstMode: settings.tax.gstMode,
  };
}
