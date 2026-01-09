import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  tableSections as initialTableSections, 
  products, 
  sampleBills,
  generateId, 
  generateBillNumber, 
  generateTokenNumber,
  type TableSection,
  type Table,
  type Product,
  type CartItem,
  type Bill,
  type PaymentDetail,
} from '@/data/mockData';

interface BillingState {
  // Table & Section Data
  tableSections: TableSection[];
  
  // Products
  products: Product[];
  
  // Current Bill State
  currentBill: Bill | null;
  selectedTable: Table | null;
  isParcelMode: boolean;
  
  // Cart
  cart: CartItem[];
  
  // Bills History
  bills: Bill[];
  
  // Actions
  setParcelMode: (mode: boolean) => void;
  selectTable: (table: Table | null) => void;
  
  // Cart Actions
  addToCart: (product: Product, portion: string, quantity: number) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  
  // KOT Actions
  markItemsSentToKitchen: () => void;
  
  // Bill Actions
  createNewBill: () => void;
  settleBill: (paymentMethod: 'cash' | 'card' | 'upi' | 'split', paymentDetails?: PaymentDetail[]) => void;
  saveAsUnsettled: () => void;
  applyDiscount: (type: 'percentage' | 'fixed', value: number, reason?: string) => void;
  removeDiscount: () => void;
  setCoverCount: (count: number) => void;
  
  // Table Actions
  updateTableStatus: (tableId: string, status: 'available' | 'occupied' | 'reserved') => void;
  openExistingBill: (billId: string) => void;
  
  // Product Actions
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Bill History Actions
  revertBill: (billId: string) => void;
  deleteBill: (billId: string) => void;
}

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
    const itemDiscount = discountAmount > 0 ? (itemTotal / subTotal) * discountAmount : 0;
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
      tableSections: initialTableSections,
      products: products,
      currentBill: null,
      selectedTable: null,
      isParcelMode: false,
      cart: [],
      bills: sampleBills,
      
      setParcelMode: (mode) => set({ 
        isParcelMode: mode, 
        selectedTable: mode ? null : get().selectedTable,
        cart: [],
        currentBill: null,
      }),
      
      selectTable: (table) => {
        if (table?.status === 'occupied' && table.currentBillId) {
          // Open existing bill
          get().openExistingBill(table.currentBillId);
        } else {
          set({ 
            selectedTable: table, 
            isParcelMode: false,
            cart: [],
            currentBill: null,
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
            gstRate: product.gstRate,
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
      
      clearCart: () => set({ cart: [], currentBill: null }),
      
      markItemsSentToKitchen: () => set({
        cart: get().cart.map(item => ({ ...item, sentToKitchen: true })),
      }),
      
      createNewBill: () => {
        const { cart, selectedTable, isParcelMode, currentBill } = get();
        if (cart.length === 0) return;
        
        const totals = calculateBillTotals(
          cart,
          currentBill?.discountType,
          currentBill?.discountValue
        );
        
        const bill: Bill = {
          id: currentBill?.id || generateId(),
          billNumber: currentBill?.billNumber || generateBillNumber(),
          type: isParcelMode ? 'parcel' : 'table',
          tableId: selectedTable?.id,
          tableNumber: selectedTable?.number,
          tokenNumber: isParcelMode ? (currentBill?.tokenNumber || generateTokenNumber()) : undefined,
          items: cart,
          ...totals,
          discountType: currentBill?.discountType,
          discountValue: currentBill?.discountValue,
          discountReason: currentBill?.discountReason,
          coverCount: currentBill?.coverCount || 1,
          customerId: currentBill?.customerId,
          status: 'active',
          createdAt: currentBill?.createdAt || new Date(),
        };
        
        set({ currentBill: bill });
        
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
          tokenNumber: get().isParcelMode ? generateTokenNumber() : undefined,
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
        
        set({ bills: newBills, cart: [], currentBill: null });
        
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
          tokenNumber: get().isParcelMode ? generateTokenNumber() : undefined,
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
        
        set({ bills: newBills, cart: [], currentBill: null, selectedTable: null });
      },
      
      applyDiscount: (type, value, reason) => {
        const { cart } = get();
        const totals = calculateBillTotals(cart, type, value);
        
        set({
          currentBill: get().currentBill ? {
            ...get().currentBill!,
            discountType: type,
            discountValue: value,
            discountReason: reason,
            ...totals,
          } : null,
        });
      },
      
      removeDiscount: () => {
        const { cart } = get();
        const totals = calculateBillTotals(cart);
        
        set({
          currentBill: get().currentBill ? {
            ...get().currentBill!,
            discountType: undefined,
            discountValue: undefined,
            discountReason: undefined,
            ...totals,
          } : null,
        });
      },
      
      setCoverCount: (count) => set({
        currentBill: get().currentBill ? {
          ...get().currentBill!,
          coverCount: count,
        } : null,
      }),
      
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
          cart: bill.items,
          selectedTable: table || null,
          isParcelMode: bill.type === 'parcel',
        });
      },
      
      addProduct: (product) => set({
        products: [...get().products, { ...product, id: generateId() }],
      }),
      
      updateProduct: (id, updates) => set({
        products: get().products.map(p => p.id === id ? { ...p, ...updates } : p),
      }),
      
      deleteProduct: (id) => set({
        products: get().products.filter(p => p.id !== id),
      }),
      
      revertBill: (billId) => {
        const bill = get().bills.find(b => b.id === billId);
        if (!bill) return;
        
        set({
          bills: get().bills.map(b => 
            b.id === billId ? { ...b, status: 'unsettled' as const, settledAt: undefined } : b
          ),
        });
      },
      
      deleteBill: (billId) => set({
        bills: get().bills.filter(b => b.id !== billId),
      }),
    }),
    {
      name: 'billing-storage',
    }
  )
);
