// Settings & Configuration Types

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  logoUrl: string | null;
}

export type TaxType = 'gst' | 'other' | 'none';
export type GstMode = 'cgst_sgst' | 'igst';
export type TaxRate = 5 | 12 | 18 | 28;

export interface TaxSettings {
  type: TaxType;
  gstMode: GstMode;
  defaultRate: TaxRate;
  enabledRates: TaxRate[];
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface CurrencySettings {
  currency: Currency;
  symbol: string;
  useCommas: boolean;
  decimalPlaces: number;
}

export type PrinterRole = 'kitchen' | 'counter' | 'bar';
export type PrintFormat = 'a4' | 'a5' | '76mm' | '58mm';
export type PrinterType = 'network' | 'bluetooth' | 'usb';

export interface Printer {
  id: string;
  name: string;
  ipAddress: string | null;
  port: number;
  type: PrinterType;
  role: PrinterRole;
  format: PrintFormat;
  isActive: boolean;
  isDefault: boolean;
}

export type SyncMode = 'realtime' | 'polling';

export interface SyncSettings {
  mode: SyncMode;
  pollingInterval: number; // in seconds
  isPremium: boolean;
}

export interface AppSettings {
  business: BusinessInfo;
  tax: TaxSettings;
  theme: ThemeSettings;
  currency: CurrencySettings;
  sync: SyncSettings;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  business: {
    name: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    logoUrl: null,
  },
  tax: {
    type: 'gst',
    gstMode: 'cgst_sgst',
    defaultRate: 5,
    enabledRates: [5, 12, 18, 28],
  },
  theme: {
    mode: 'light',
    primaryColor: '172 65% 35%',
    accentColor: '188 70% 45%',
    fontFamily: 'bricola',
  },
  currency: {
    currency: 'INR',
    symbol: '₹',
    useCommas: true,
    decimalPlaces: 2,
  },
  sync: {
    mode: 'polling',
    pollingInterval: 20,
    isPremium: false,
  },
  onboardingComplete: false,
};

export interface User {
  id: string;
  mobile: string;
  name: string | null;
  role: 'admin' | 'staff' | 'manager';
  isActive: boolean;
  createdAt: string;
}

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
];

export const FONT_OPTIONS = [
  { value: 'bricola', label: 'Bricola (Default)' },
  { value: 'system-ui', label: 'System' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
];
