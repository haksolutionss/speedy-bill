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
export type PrintFormat = 'a4' | 'a5' | '80mm' | '76mm' | '58mm';
export type PrinterType = 'network' | 'bluetooth' | 'usb' | 'system';

export interface Printer {
  id: string;
  name: string;
  ipAddress?: string | null;
  port?: number;
  type: PrinterType;
  role: PrinterRole;
  format: PrintFormat;
  isActive: boolean;
  isDefault: boolean;
  // USB printer identifiers (for Electron)
  vendorId?: number;
  productId?: number;
  // System printer name (for Windows print spooler)
  systemName?: string;
}

export type SyncMode = 'realtime' | 'polling';

export interface SyncSettings {
  mode: SyncMode;
  pollingInterval: number; // in seconds
  isPremium: boolean;
}

// Loyalty Points Configuration
export interface LoyaltySettings {
  enabled: boolean;
  pointsPerAmount: number; // e.g., 1 point per ₹100
  amountForPoints: number; // e.g., ₹100 = 1 point
  redemptionValue: number; // e.g., 1 point = ₹1
  minRedemptionPoints: number; // Minimum points required to redeem
}

// Billing Defaults
export type PaymentMethod = 'cash' | 'card' | 'upi';

export interface BillingDefaults {
  defaultPaymentMethod: PaymentMethod;
  autoSettleOnPrint: boolean;
  printCustomerCopy: boolean;
  showLoyaltyInBill: boolean;
}

export interface AppSettings {
  business: BusinessInfo;
  tax: TaxSettings;
  theme: ThemeSettings;
  currency: CurrencySettings;
  sync: SyncSettings;
  loyalty: LoyaltySettings;
  billing: BillingDefaults;
  printers?: Printer[];
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
  loyalty: {
    enabled: true,
    pointsPerAmount: 1,
    amountForPoints: 100, // ₹100 = 1 point
    redemptionValue: 1, // 1 point = ₹1
    minRedemptionPoints: 10,
  },
  billing: {
    defaultPaymentMethod: 'cash',
    autoSettleOnPrint: false,
    printCustomerCopy: true,
    showLoyaltyInBill: true,
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
  permissions?: StaffPermissions;
}

// Staff Permissions - module-level access control
export interface StaffPermissions {
  canAccessBilling: boolean;
  canAccessProducts: boolean;
  canAccessTables: boolean;
  canAccessReports: boolean;
  canAccessHistory: boolean;
  canAccessSettings: boolean;
  canAccessCustomers: boolean;
  canAccessStaff: boolean;
}

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  canAccessBilling: true,
  canAccessProducts: false,
  canAccessTables: false,
  canAccessReports: false,
  canAccessHistory: false,
  canAccessSettings: false,
  canAccessCustomers: false,
  canAccessStaff: false,
};

export const ADMIN_PERMISSIONS: StaffPermissions = {
  canAccessBilling: true,
  canAccessProducts: true,
  canAccessTables: true,
  canAccessReports: true,
  canAccessHistory: true,
  canAccessSettings: true,
  canAccessCustomers: true,
  canAccessStaff: true,
};

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

export const MODULE_OPTIONS = [
  { key: 'canAccessBilling', label: 'Billing', description: 'Access to billing and POS' },
  { key: 'canAccessProducts', label: 'Products', description: 'Manage products and categories' },
  { key: 'canAccessTables', label: 'Tables', description: 'Manage tables and sections' },
  { key: 'canAccessReports', label: 'Reports', description: 'View sales and analytics' },
  { key: 'canAccessHistory', label: 'History', description: 'View bill history' },
  { key: 'canAccessSettings', label: 'Settings', description: 'System configuration' },
  { key: 'canAccessCustomers', label: 'Customers', description: 'Manage customers and loyalty' },
  { key: 'canAccessStaff', label: 'Staff', description: 'Manage staff and permissions' },
] as const;
