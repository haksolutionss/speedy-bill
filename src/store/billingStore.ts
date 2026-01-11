import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbTable, BillWithItems, ProductWithPortions } from '@/types/database';

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

interface BillingState {
  // Current selection state
  selectedTable: DbTable | null;
  isParcelMode: boolean;
  currentBill: Bill | null;
  currentBillId: string | null;
  
  // Local cart state
  cart: CartItem[];
  
  // Table sections (mapped from RTK data)
  tableSections: TableSection[];
  
  // Products (mapped from RTK data)  
  products: ProductWithPortions[];
  
  // Bills history
  bills: Bill[];
  
  // Bill info
  coverCount: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  discountReason: string | null;
  
  // Token counter
  tokenCounter: number;
  
  // Actions - Selection
  setParcelMode: (mode: boolean) => void;
  selectTable: (table: DbTable | null) => void;
  
  // Actions - Table sections sync
  setTableSections: (sections: TableSection[]) => void;
  
  // Actions - Products sync
  setProducts: (products: ProductWithPortions[]) => void;
  
  // Actions - Bills sync
  setBills: (bills: Bill[]) => void;
  
  // Cart Actions
  addToCart: (product: ProductWithPortions, portion: string, quantity: number) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  loadCartFromBill: (bill: BillWithItems) => void;
  
  // KOT Actions
  markItemsSentToKitchen: () => void;
  
  // Bill Actions
  createNewBill: () => Bill | undefined;
  settleBill: (paymentMethod: 'cash' | 'card' | 'upi' | 'split', paymentDetails?: PaymentDetail[]) => void;
  saveAsUnsettled: () => void;
  applyDiscount: (type: 'percentage' | 'fixed', value: number, reason?: string) => void;
  removeDiscount: () => void;
  setCoverCount: (count: number) => void;
  
  // Table Actions
  updateTableStatus: (tableId: string, status: 'available' | 'occupied' | 'reserved') => void;
  openExistingBill: (billId: string) => void;
  
  // Product Actions
  addProduct: (product: Omit<ProductWithPortions, 'id'>) => void;
  updateProduct: (id: string, product: Partial<ProductWithPortions>) => void;
  deleteProduct: (id: string) => void;
  
  // Bill History Actions
  revertBill: (billId: string) => void;
  deleteBill: (billId: string) => void;
  
  // Token
  getNextToken: () => number;
  
  // Reset
  resetBillingState: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const generateBillNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BILL-${year}${month}${day}-${random}`;
};

const calculateBillTotals = (items: CartItem[], discountType?: 'percentage' | 'fixed', discountValue?: number) => {
  const subTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage' 
      ? (subTotal * discountValue / 100) 
      : discountValue;
  }
  
  const afterDiscount = subTotal - discountAmount;
  
  // Calculate GST by rate
  const gstByRate: Record<number, number> = {};
  items.forEach(item => {
    const itemTotal = item.unitPrice * item.quantity;
    const itemDiscount = discountAmount > 0 && subTotal > 0 ? (itemTotal / subTotal) * discountAmount : 0;
    const taxableAmount = itemTotal - itemDiscount;
    const gst = taxableAmount * (item.gstRate / 100);
    gstByRate[item.gstRate] = (gstByRate[item.gstRate] || 0) + gst;
  });
  
  const totalGst = Object.values(gstByRate).reduce((sum, gst) => sum + gst, 0);
  const cgstAmount = totalGst / 2;
  const sgstAmount = totalGst / 2;
  
  const totalAmount = afterDiscount + totalGst;
  const finalAmount = Math.round(totalAmount);
  
  return { subTotal, discountAmount, cgstAmount, sgstAmount, totalAmount, finalAmount };
};

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      tableSections: [],
      products: [],
      currentBill: null,
      currentBillId: null,
      selectedTable: null,
      isParcelMode: false,
      cart: [],
      bills: [],
      coverCount: 1,
      discountType: null,
      discountValue: null,
      discountReason: null,
      tokenCounter: 1,
      
      setTableSections: (sections) => set({ tableSections: sections }),
      
      setProducts: (products) => set({ products }),
      
      setBills: (bills) => set({ bills }),
      
      setParcelMode: (mode) => set({ 
        isParcelMode: mode, 
        selectedTable: mode ? null : get().selectedTable,
        cart: [],
        currentBill: null,
        currentBillId: null,
        coverCount: 1,
        discountType: null,
        discountValue: null,
        discountReason: null,
      }),
      
      selectTable: (table) => {
        if (table?.status === 'occupied' && table.current_bill_id) {
          get().openExistingBill(table.current_bill_id);
          set({ selectedTable: table });
        } else {
          set({ 
            selectedTable: table, 
            isParcelMode: false,
            cart: [],
            currentBill: null,
            currentBillId: table?.current_bill_id || null,
            coverCount: 1,
            discountType: null,
            discountValue: null,
            discountReason: null,
          });
        }
      },
      
      addToCart: (product, portion, quantity) => {
        const portionData = product.portions.find(p => p.size === portion);
        if (!portionData) return;
        
        const existingItem = get().cart.find(
          item => item.productId === product.id && item.portion === portion && !item.sentToKitchen
        );
        
        if (existingItem) {
          set({
            cart: get().cart.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const newItem: CartItem = {
            id: generateId(),
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            portion,
            quantity,
            unitPrice: portionData.price,
            gstRate: product.gst_rate,
            sentToKitchen: false,
          };
          set({ cart: [...get().cart, newItem] });
        }
      },
      
      updateCartItemQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }
        set({
          cart: get().cart.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        });
      },
      
      removeFromCart: (itemId) => set({
        cart: get().cart.filter(item => item.id !== itemId),
      }),
      
      updateCartItemNotes: (itemId, notes) => set({
        cart: get().cart.map(item =>
          item.id === itemId ? { ...item, notes } : item
        ),
      }),
      
      clearCart: () => set({ cart: [], currentBill: null, currentBillId: null }),
      
      loadCartFromBill: (bill) => {
        const cartItems: CartItem[] = bill.items.map((item) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productCode: item.product_code,
          portion: item.portion,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          gstRate: Number(item.gst_rate),
          notes: item.notes || undefined,
          sentToKitchen: item.sent_to_kitchen,
        }));
        
        set({
          cart: cartItems,
          currentBillId: bill.id,
          coverCount: bill.cover_count || 1,
          discountType: bill.discount_type as 'percentage' | 'fixed' | null,
          discountValue: bill.discount_value ? Number(bill.discount_value) : null,
          discountReason: bill.discount_reason,
        });
      },
      
      markItemsSentToKitchen: () => set({
        cart: get().cart.map(item => ({ ...item, sentToKitchen: true })),
      }),
      
      createNewBill: () => {
        const { cart, selectedTable, isParcelMode, currentBill, discountType, discountValue, discountReason, coverCount, tokenCounter } = get();
        if (cart.length === 0) return;
        
        const totals = calculateBillTotals(
          cart,
          discountType || undefined,
          discountValue || undefined
        );
        
        const bill: Bill = {
          id: currentBill?.id || generateId(),
          billNumber: currentBill?.billNumber || generateBillNumber(),
          type: isParcelMode ? 'parcel' : 'table',
          tableId: selectedTable?.id,
          tableNumber: selectedTable?.number,
          tokenNumber: isParcelMode ? (currentBill?.tokenNumber || tokenCounter) : undefined,
          items: cart,
          ...totals,
          discountType: discountType || undefined,
          discountValue: discountValue || undefined,
          discountReason: discountReason || undefined,
          coverCount: coverCount || 1,
          customerId: currentBill?.customerId,
          status: 'active',
          createdAt: currentBill?.createdAt || new Date(),
        };
        
        if (isParcelMode && !currentBill?.tokenNumber) {
          set({ tokenCounter: tokenCounter + 1 });
        }
        
        set({ currentBill: bill, currentBillId: bill.id });
        
        // Update table status if table billing
        if (selectedTable) {
          get().updateTableStatus(selectedTable.id, 'occupied');
          set({
            tableSections: get().tableSections.map(section => ({
              ...section,
              tables: section.tables.map(table =>
                table.id === selectedTable.id
                  ? { ...table, currentBillId: bill.id, currentAmount: bill.finalAmount }
                  : table
              ),
            })),
          });
        }
        
        return bill;
      },
      
      settleBill: (paymentMethod, paymentDetails) => {
        const { currentBill, selectedTable, cart, bills } = get();
        if (!currentBill && cart.length === 0) return;
        
        const totals = calculateBillTotals(cart);
        const bill: Bill = currentBill ? {
          ...currentBill,
          items: cart,
          ...totals,
          status: 'settled',
          paymentMethod,
          paymentDetails,
          settledAt: new Date(),
        } : {
          id: generateId(),
          billNumber: generateBillNumber(),
          type: get().isParcelMode ? 'parcel' : 'table',
          tableId: selectedTable?.id,
          tableNumber: selectedTable?.number,
          tokenNumber: get().isParcelMode ? get().tokenCounter : undefined,
          items: cart,
          ...totals,
          discountType: undefined,
          discountValue: undefined,
          discountReason: undefined,
          status: 'settled',
          paymentMethod,
          paymentDetails,
          createdAt: new Date(),
          settledAt: new Date(),
        };
        
        // Update bills history
        const existingIndex = bills.findIndex(b => b.id === bill.id);
        const newBills = existingIndex >= 0 
          ? bills.map(b => b.id === bill.id ? bill : b)
          : [...bills, bill];
        
        set({ bills: newBills, cart: [], currentBill: null, currentBillId: null });
        
        // Free up table
        if (selectedTable) {
          set({
            tableSections: get().tableSections.map(section => ({
              ...section,
              tables: section.tables.map(table =>
                table.id === selectedTable.id
                  ? { ...table, status: 'available' as const, currentBillId: undefined, currentAmount: undefined }
                  : table
              ),
            })),
            selectedTable: null,
          });
        }
      },
      
      saveAsUnsettled: () => {
        const { cart, selectedTable, currentBill, bills } = get();
        if (cart.length === 0) return;
        
        const totals = calculateBillTotals(cart);
        const bill: Bill = currentBill ? {
          ...currentBill,
          items: cart,
          ...totals,
          status: 'unsettled',
        } : {
          id: generateId(),
          billNumber: generateBillNumber(),
          type: get().isParcelMode ? 'parcel' : 'table',
          tableId: selectedTable?.id,
          tableNumber: selectedTable?.number,
          tokenNumber: get().isParcelMode ? get().tokenCounter : undefined,
          items: cart,
          ...totals,
          discountType: undefined,
          discountValue: undefined,
          discountReason: undefined,
          status: 'unsettled',
          createdAt: new Date(),
        };
        
        const existingIndex = bills.findIndex(b => b.id === bill.id);
        const newBills = existingIndex >= 0 
          ? bills.map(b => b.id === bill.id ? bill : b)
          : [...bills, bill];
        
        set({ bills: newBills, cart: [], currentBill: null, currentBillId: null, selectedTable: null });
      },
      
      applyDiscount: (type, value, reason) => {
        set({
          discountType: type,
          discountValue: value,
          discountReason: reason || null,
        });
        
        // Recalculate current bill if exists
        const { cart, currentBill } = get();
        if (currentBill) {
          const totals = calculateBillTotals(cart, type, value);
          set({
            currentBill: {
              ...currentBill,
              discountType: type,
              discountValue: value,
              discountReason: reason,
              ...totals,
            },
          });
        }
      },
      
      removeDiscount: () => {
        set({
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
        
        // Recalculate current bill if exists
        const { cart, currentBill } = get();
        if (currentBill) {
          const totals = calculateBillTotals(cart);
          set({
            currentBill: {
              ...currentBill,
              discountType: undefined,
              discountValue: undefined,
              discountReason: undefined,
              ...totals,
            },
          });
        }
      },
      
      setCoverCount: (count) => {
        set({ coverCount: count });
        if (get().currentBill) {
          set({
            currentBill: {
              ...get().currentBill!,
              coverCount: count,
            },
          });
        }
      },
      
      updateTableStatus: (tableId, status) => set({
        tableSections: get().tableSections.map(section => ({
          ...section,
          tables: section.tables.map(table =>
            table.id === tableId ? { ...table, status } : table
          ),
        })),
      }),
      
      openExistingBill: (billId) => {
        const bill = get().bills.find(b => b.id === billId);
        if (!bill) return;
        
        const table = get().tableSections
          .flatMap(s => s.tables)
          .find(t => t.id === bill.tableId);
        
        set({
          currentBill: bill,
          currentBillId: bill.id,
          cart: bill.items,
          selectedTable: table ? {
            id: table.id,
            number: table.number,
            capacity: table.capacity,
            status: table.status,
            current_bill_id: table.currentBillId || null,
            current_amount: table.currentAmount || null,
            section_id: '',
            display_order: 0,
            is_active: true,
            created_at: '',
            updated_at: '',
          } : null,
          isParcelMode: bill.type === 'parcel',
          discountType: bill.discountType || null,
          discountValue: bill.discountValue || null,
          discountReason: bill.discountReason || null,
          coverCount: bill.coverCount || 1,
        });
      },
      
      addProduct: (product) => set({
        products: [...get().products, { ...product, id: generateId() } as ProductWithPortions],
      }),
      
      updateProduct: (id, updates) => set({
        products: get().products.map(p => p.id === id ? { ...p, ...updates } : p),
      }),
      
      deleteProduct: (id) => set({
        products: get().products.filter(p => p.id !== id),
      }),
      
      revertBill: (billId) => {
        set({
          bills: get().bills.map(b => 
            b.id === billId ? { ...b, status: 'unsettled' as const, settledAt: undefined } : b
          ),
        });
      },
      
      deleteBill: (billId) => set({
        bills: get().bills.filter(b => b.id !== billId),
      }),
      
      getNextToken: () => {
        const token = get().tokenCounter;
        set({ tokenCounter: token + 1 });
        return token;
      },
      
      resetBillingState: () => {
        set({
          selectedTable: null,
          isParcelMode: false,
          currentBill: null,
          currentBillId: null,
          cart: [],
          coverCount: 1,
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
      },
    }),
    {
      name: 'billing-storage',
      partialize: (state) => ({
        tokenCounter: state.tokenCounter,
        bills: state.bills,
      }),
    }
  )
);
