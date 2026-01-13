// Mock Data for Restaurant Billing PWA

export interface TableSection {
  id: string;
  name: string;
  tables: Table[];
}

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  currentBillId?: string;
  currentAmount?: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  portions: ProductPortion[];
  gstRate: number;
  description?: string;
  isActive: boolean;
}

export interface ProductPortion {
  size: 'full' | 'half' | 'quarter' | 'single';
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  portion: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  notes?: string;
  sentToKitchen: boolean;
}

export interface Bill {
  id: string;
  billNumber: string;
  type: 'table' | 'parcel';
  tableId?: string;
  tableNumber?: string;
  tokenNumber?: number;
  items: CartItem[];
  subTotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountReason?: string;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  finalAmount: number;
  coverCount?: number;
  customerId?: string;
  status: 'active' | 'settled' | 'unsettled';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'split';
  paymentDetails?: PaymentDetail[];
  createdAt: Date;
  settledAt?: Date;
}

export interface PaymentDetail {
  method: 'cash' | 'card' | 'upi';
  amount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
}


// GST Rates available
export const gstRates = [0, 5, 12, 18, 28];

// Helper function to generate unique IDs
export const generateId = () => Math.random().toString(36).substring(2, 11);

// Helper function to generate bill number
let billCounter = 9;
export const generateBillNumber = () => {
  billCounter++;
  return `BILL-${billCounter.toString().padStart(4, '0')}`;
};

// Helper function to generate parcel token
let tokenCounter = 2;
export const generateTokenNumber = () => {
  tokenCounter++;
  return tokenCounter;
};
