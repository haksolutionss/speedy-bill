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

// Table Sections with Tables - Including occupied tables with sample bills
export const tableSections: TableSection[] = [
  {
    id: 'main-hall',
    name: 'MAIN HALL',
    tables: [
      { id: 't1', number: 'T1', capacity: 4, status: 'available' },
      { id: 't2', number: 'T2', capacity: 4, status: 'occupied', currentBillId: 'bill-active-001', currentAmount: 580 },
      { id: 't3', number: 'T3', capacity: 2, status: 'available' },
      { id: 't4', number: 'T4', capacity: 6, status: 'occupied', currentBillId: 'bill-active-002', currentAmount: 1420 },
      { id: 't5', number: 'T5', capacity: 4, status: 'available' },
      { id: 't6', number: 'T6', capacity: 4, status: 'reserved' },
    ],
  },
  {
    id: 'garden',
    name: 'GARDEN',
    tables: [
      { id: 't7', number: 'T7', capacity: 4, status: 'available' },
      { id: 't8', number: 'T8', capacity: 6, status: 'occupied', currentBillId: 'bill-active-003', currentAmount: 340 },
      { id: 't9', number: 'T9', capacity: 4, status: 'available' },
      { id: 't10', number: 'T10', capacity: 8, status: 'occupied', currentBillId: 'bill-active-004', currentAmount: 2150 },
      { id: 't11', number: 'T11', capacity: 4, status: 'available' },
    ],
  },
  {
    id: 'rooms',
    name: 'PRIVATE ROOMS',
    tables: [
      { id: 'r1', number: 'R-1', capacity: 8, status: 'available' },
      { id: 'r2', number: 'R-2', capacity: 10, status: 'occupied', currentBillId: 'bill-active-005', currentAmount: 3680 },
      { id: 'r3', number: 'R-3', capacity: 12, status: 'available' },
    ],
  },
];

// Products by Category
export const products: Product[] = [
  // Starters
  { id: 'p101', code: '101', name: 'Paneer Tikka', category: 'Starters', portions: [{ size: 'full', price: 180 }, { size: 'half', price: 100 }], gstRate: 5, isActive: true },
  { id: 'p102', code: '102', name: 'Chicken Tikka', category: 'Starters', portions: [{ size: 'full', price: 220 }, { size: 'half', price: 120 }], gstRate: 5, isActive: true },
  { id: 'p103', code: '103', name: 'Veg Spring Roll', category: 'Starters', portions: [{ size: 'single', price: 140 }], gstRate: 5, isActive: true },
  { id: 'p104', code: '104', name: 'Fish Tikka', category: 'Starters', portions: [{ size: 'single', price: 250 }], gstRate: 5, isActive: true },
  { id: 'p105', code: '105', name: 'Mushroom Tikka', category: 'Starters', portions: [{ size: 'full', price: 160 }, { size: 'half', price: 90 }], gstRate: 5, isActive: true },
  
  // Main Course
  { id: 'p201', code: '201', name: 'Paneer Butter Masala', category: 'Main Course', portions: [{ size: 'full', price: 240 }, { size: 'half', price: 130 }], gstRate: 5, isActive: true },
  { id: 'p202', code: '202', name: 'Chicken Curry', category: 'Main Course', portions: [{ size: 'full', price: 260 }, { size: 'half', price: 140 }], gstRate: 5, isActive: true },
  { id: 'p203', code: '203', name: 'Dal Makhani', category: 'Main Course', portions: [{ size: 'full', price: 180 }, { size: 'half', price: 100 }], gstRate: 5, isActive: true },
  { id: 'p204', code: '204', name: 'Fish Curry', category: 'Main Course', portions: [{ size: 'single', price: 280 }], gstRate: 5, isActive: true },
  { id: 'p205', code: '205', name: 'Mutton Rogan Josh', category: 'Main Course', portions: [{ size: 'single', price: 320 }], gstRate: 5, isActive: true },
  { id: 'p206', code: '206', name: 'Veg Kolhapuri', category: 'Main Course', portions: [{ size: 'single', price: 200 }], gstRate: 5, isActive: true },
  { id: 'p207', code: '207', name: 'Egg Curry', category: 'Main Course', portions: [{ size: 'single', price: 160 }], gstRate: 5, isActive: true },
  { id: 'p208', code: '208', name: 'Mix Veg', category: 'Main Course', portions: [{ size: 'single', price: 180 }], gstRate: 5, isActive: true },
  
  // Breads
  { id: 'p301', code: '301', name: 'Roti', category: 'Breads', portions: [{ size: 'single', price: 15 }], gstRate: 5, isActive: true },
  { id: 'p302', code: '302', name: 'Butter Naan', category: 'Breads', portions: [{ size: 'single', price: 40 }], gstRate: 5, isActive: true },
  { id: 'p303', code: '303', name: 'Garlic Naan', category: 'Breads', portions: [{ size: 'single', price: 50 }], gstRate: 5, isActive: true },
  { id: 'p304', code: '304', name: 'Paratha', category: 'Breads', portions: [{ size: 'single', price: 35 }], gstRate: 5, isActive: true },
  { id: 'p305', code: '305', name: 'Kulcha', category: 'Breads', portions: [{ size: 'single', price: 45 }], gstRate: 5, isActive: true },
  
  // Rice
  { id: 'p401', code: '401', name: 'Plain Rice', category: 'Rice', portions: [{ size: 'single', price: 120 }], gstRate: 5, isActive: true },
  { id: 'p402', code: '402', name: 'Jeera Rice', category: 'Rice', portions: [{ size: 'single', price: 140 }], gstRate: 5, isActive: true },
  { id: 'p403', code: '403', name: 'Veg Biryani', category: 'Rice', portions: [{ size: 'single', price: 180 }], gstRate: 5, isActive: true },
  
  // Beverages
  { id: 'p501', code: '501', name: 'Masala Chai', category: 'Beverages', portions: [{ size: 'single', price: 30 }], gstRate: 5, isActive: true },
  { id: 'p502', code: '502', name: 'Coffee', category: 'Beverages', portions: [{ size: 'single', price: 40 }], gstRate: 5, isActive: true },
  { id: 'p503', code: '503', name: 'Fresh Lime Soda', category: 'Beverages', portions: [{ size: 'single', price: 50 }], gstRate: 5, isActive: true },
  { id: 'p504', code: '504', name: 'Lassi', category: 'Beverages', portions: [{ size: 'single', price: 60 }], gstRate: 5, isActive: true },
  { id: 'p505', code: '505', name: 'Soft Drink', category: 'Beverages', portions: [{ size: 'single', price: 40 }], gstRate: 12, isActive: true },
  
  // Desserts
  { id: 'p601', code: '601', name: 'Gulab Jamun', category: 'Desserts', portions: [{ size: 'single', price: 80 }], gstRate: 5, isActive: true },
  { id: 'p602', code: '602', name: 'Ice Cream', category: 'Desserts', portions: [{ size: 'single', price: 90 }], gstRate: 5, isActive: true },
  { id: 'p603', code: '603', name: 'Ras Malai', category: 'Desserts', portions: [{ size: 'single', price: 100 }], gstRate: 5, isActive: true },
  { id: 'p604', code: '604', name: 'Kheer', category: 'Desserts', portions: [{ size: 'single', price: 70 }], gstRate: 5, isActive: true },
];

// Sample Customers
export const customers: Customer[] = [
  { id: 'c1', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@email.com', loyaltyPoints: 250 },
  { id: 'c2', name: 'Priya Patel', phone: '9876543211', email: 'priya@email.com', loyaltyPoints: 180 },
  { id: 'c3', name: 'Amit Kumar', phone: '9876543212', loyaltyPoints: 450 },
  { id: 'c4', name: 'Sneha Reddy', phone: '9876543213', email: 'sneha@email.com', loyaltyPoints: 120 },
  { id: 'c5', name: 'Vikram Singh', phone: '9876543214', loyaltyPoints: 320 },
];

// Active Bills for Occupied Tables (includes both KOT sent and pending items)
export const activeBills: Bill[] = [
  // T2 - Bill with all items sent to kitchen
  {
    id: 'bill-active-001',
    billNumber: 'BILL-0005',
    type: 'table',
    tableId: 't2',
    tableNumber: 'T2',
    items: [
      { id: 'ai1', productId: 'p101', productName: 'Paneer Tikka', productCode: '101', portion: 'full', quantity: 1, unitPrice: 180, gstRate: 5, sentToKitchen: true },
      { id: 'ai2', productId: 'p302', productName: 'Butter Naan', productCode: '302', portion: 'single', quantity: 4, unitPrice: 40, gstRate: 5, sentToKitchen: true },
      { id: 'ai3', productId: 'p203', productName: 'Dal Makhani', productCode: '203', portion: 'half', quantity: 1, unitPrice: 100, gstRate: 5, sentToKitchen: true },
      { id: 'ai4', productId: 'p501', productName: 'Masala Chai', productCode: '501', portion: 'single', quantity: 2, unitPrice: 30, gstRate: 5, sentToKitchen: true },
    ],
    subTotal: 500,
    discountAmount: 0,
    cgstAmount: 12.5,
    sgstAmount: 12.5,
    totalAmount: 525,
    finalAmount: 580,
    coverCount: 2,
    status: 'active',
    createdAt: new Date(),
  },
  // T4 - Bill with mixed KOT status (some sent, some pending)
  {
    id: 'bill-active-002',
    billNumber: 'BILL-0006',
    type: 'table',
    tableId: 't4',
    tableNumber: 'T4',
    items: [
      { id: 'ai5', productId: 'p102', productName: 'Chicken Tikka', productCode: '102', portion: 'full', quantity: 2, unitPrice: 220, gstRate: 5, sentToKitchen: true },
      { id: 'ai6', productId: 'p202', productName: 'Chicken Curry', productCode: '202', portion: 'full', quantity: 1, unitPrice: 260, gstRate: 5, sentToKitchen: true },
      { id: 'ai7', productId: 'p303', productName: 'Garlic Naan', productCode: '303', portion: 'single', quantity: 6, unitPrice: 50, gstRate: 5, sentToKitchen: true },
      // Pending items - not yet sent to kitchen
      { id: 'ai8', productId: 'p602', productName: 'Ice Cream', productCode: '602', portion: 'single', quantity: 4, unitPrice: 90, gstRate: 5, sentToKitchen: false },
      { id: 'ai9', productId: 'p503', productName: 'Fresh Lime Soda', productCode: '503', portion: 'single', quantity: 2, unitPrice: 50, gstRate: 5, sentToKitchen: false },
    ],
    subTotal: 1360,
    discountAmount: 0,
    cgstAmount: 34,
    sgstAmount: 34,
    totalAmount: 1428,
    finalAmount: 1420,
    coverCount: 4,
    status: 'active',
    createdAt: new Date(),
  },
  // T8 - Small order, all sent
  {
    id: 'bill-active-003',
    billNumber: 'BILL-0007',
    type: 'table',
    tableId: 't8',
    tableNumber: 'T8',
    items: [
      { id: 'ai10', productId: 'p501', productName: 'Masala Chai', productCode: '501', portion: 'single', quantity: 4, unitPrice: 30, gstRate: 5, sentToKitchen: true },
      { id: 'ai11', productId: 'p103', productName: 'Veg Spring Roll', productCode: '103', portion: 'single', quantity: 2, unitPrice: 140, gstRate: 5, sentToKitchen: true },
    ],
    subTotal: 400,
    discountAmount: 0,
    cgstAmount: 10,
    sgstAmount: 10,
    totalAmount: 420,
    finalAmount: 340,
    coverCount: 4,
    status: 'active',
    createdAt: new Date(),
  },
  // T10 - Large order with pending items
  {
    id: 'bill-active-004',
    billNumber: 'BILL-0008',
    type: 'table',
    tableId: 't10',
    tableNumber: 'T10',
    items: [
      { id: 'ai12', productId: 'p101', productName: 'Paneer Tikka', productCode: '101', portion: 'full', quantity: 2, unitPrice: 180, gstRate: 5, sentToKitchen: true },
      { id: 'ai13', productId: 'p105', productName: 'Mushroom Tikka', productCode: '105', portion: 'full', quantity: 1, unitPrice: 160, gstRate: 5, sentToKitchen: true },
      { id: 'ai14', productId: 'p201', productName: 'Paneer Butter Masala', productCode: '201', portion: 'full', quantity: 2, unitPrice: 240, gstRate: 5, sentToKitchen: true },
      { id: 'ai15', productId: 'p203', productName: 'Dal Makhani', productCode: '203', portion: 'full', quantity: 1, unitPrice: 180, gstRate: 5, sentToKitchen: true },
      { id: 'ai16', productId: 'p302', productName: 'Butter Naan', productCode: '302', portion: 'single', quantity: 8, unitPrice: 40, gstRate: 5, sentToKitchen: true },
      { id: 'ai17', productId: 'p401', productName: 'Plain Rice', productCode: '401', portion: 'single', quantity: 2, unitPrice: 120, gstRate: 5, sentToKitchen: true },
      // Pending items
      { id: 'ai18', productId: 'p601', productName: 'Gulab Jamun', productCode: '601', portion: 'single', quantity: 4, unitPrice: 80, gstRate: 5, sentToKitchen: false },
      { id: 'ai19', productId: 'p504', productName: 'Lassi', productCode: '504', portion: 'single', quantity: 4, unitPrice: 60, gstRate: 5, sentToKitchen: false },
    ],
    subTotal: 2060,
    discountAmount: 0,
    cgstAmount: 51.5,
    sgstAmount: 51.5,
    totalAmount: 2163,
    finalAmount: 2150,
    coverCount: 6,
    status: 'active',
    createdAt: new Date(),
  },
  // R-2 - Private room order, all sent
  {
    id: 'bill-active-005',
    billNumber: 'BILL-0009',
    type: 'table',
    tableId: 'r2',
    tableNumber: 'R-2',
    items: [
      { id: 'ai20', productId: 'p102', productName: 'Chicken Tikka', productCode: '102', portion: 'full', quantity: 3, unitPrice: 220, gstRate: 5, sentToKitchen: true },
      { id: 'ai21', productId: 'p104', productName: 'Fish Tikka', productCode: '104', portion: 'single', quantity: 2, unitPrice: 250, gstRate: 5, sentToKitchen: true },
      { id: 'ai22', productId: 'p202', productName: 'Chicken Curry', productCode: '202', portion: 'full', quantity: 2, unitPrice: 260, gstRate: 5, sentToKitchen: true },
      { id: 'ai23', productId: 'p205', productName: 'Mutton Rogan Josh', productCode: '205', portion: 'single', quantity: 2, unitPrice: 320, gstRate: 5, sentToKitchen: true },
      { id: 'ai24', productId: 'p403', productName: 'Veg Biryani', productCode: '403', portion: 'single', quantity: 3, unitPrice: 180, gstRate: 5, sentToKitchen: true },
      { id: 'ai25', productId: 'p303', productName: 'Garlic Naan', productCode: '303', portion: 'single', quantity: 10, unitPrice: 50, gstRate: 5, sentToKitchen: true },
      { id: 'ai26', productId: 'p505', productName: 'Soft Drink', productCode: '505', portion: 'single', quantity: 6, unitPrice: 40, gstRate: 12, sentToKitchen: true },
    ],
    subTotal: 3540,
    discountAmount: 0,
    cgstAmount: 88.5,
    sgstAmount: 88.5,
    totalAmount: 3717,
    finalAmount: 3680,
    coverCount: 8,
    status: 'active',
    createdAt: new Date(),
  },
];

// Sample Historical Bills (settled)
export const sampleBills: Bill[] = [
  ...activeBills,
  {
    id: 'bill-h001',
    billNumber: 'BILL-0001',
    type: 'table',
    tableId: 't3',
    tableNumber: 'T3',
    items: [
      { id: 'i1', productId: 'p101', productName: 'Paneer Tikka', productCode: '101', portion: 'full', quantity: 1, unitPrice: 180, gstRate: 5, sentToKitchen: true },
      { id: 'i2', productId: 'p302', productName: 'Butter Naan', productCode: '302', portion: 'single', quantity: 4, unitPrice: 40, gstRate: 5, sentToKitchen: true },
    ],
    subTotal: 340,
    discountAmount: 0,
    cgstAmount: 8.5,
    sgstAmount: 8.5,
    totalAmount: 357,
    finalAmount: 357,
    coverCount: 2,
    status: 'settled',
    paymentMethod: 'cash',
    createdAt: new Date('2024-01-08T12:30:00'),
    settledAt: new Date('2024-01-08T13:15:00'),
  },
  {
    id: 'bill-h002',
    billNumber: 'BILL-0002',
    type: 'parcel',
    tokenNumber: 1,
    items: [
      { id: 'i3', productId: 'p201', productName: 'Paneer Butter Masala', productCode: '201', portion: 'full', quantity: 2, unitPrice: 240, gstRate: 5, sentToKitchen: true },
      { id: 'i4', productId: 'p403', productName: 'Veg Biryani', productCode: '403', portion: 'single', quantity: 2, unitPrice: 180, gstRate: 5, sentToKitchen: true },
    ],
    subTotal: 840,
    discountAmount: 0,
    cgstAmount: 21,
    sgstAmount: 21,
    totalAmount: 882,
    finalAmount: 882,
    status: 'settled',
    paymentMethod: 'upi',
    createdAt: new Date('2024-01-08T18:45:00'),
    settledAt: new Date('2024-01-08T19:00:00'),
  },
  {
    id: 'bill-h003',
    billNumber: 'BILL-0003',
    type: 'table',
    tableId: 't5',
    tableNumber: 'T5',
    items: [
      { id: 'i5', productId: 'p102', productName: 'Chicken Tikka', productCode: '102', portion: 'full', quantity: 2, unitPrice: 220, gstRate: 5, sentToKitchen: true },
      { id: 'i6', productId: 'p202', productName: 'Chicken Curry', productCode: '202', portion: 'full', quantity: 1, unitPrice: 260, gstRate: 5, sentToKitchen: true },
      { id: 'i7', productId: 'p303', productName: 'Garlic Naan', productCode: '303', portion: 'single', quantity: 6, unitPrice: 50, gstRate: 5, sentToKitchen: true },
    ],
    subTotal: 1000,
    discountType: 'percentage',
    discountValue: 10,
    discountReason: 'Regular customer',
    discountAmount: 100,
    cgstAmount: 22.5,
    sgstAmount: 22.5,
    totalAmount: 945,
    finalAmount: 945,
    coverCount: 4,
    customerId: 'c1',
    status: 'settled',
    paymentMethod: 'card',
    createdAt: new Date('2024-01-07T20:00:00'),
    settledAt: new Date('2024-01-07T21:30:00'),
  },
];

// Categories for filtering
export const categories = ['Starters', 'Main Course', 'Breads', 'Rice', 'Beverages', 'Desserts'];

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
