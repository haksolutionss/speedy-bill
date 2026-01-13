import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DbTable, DbBillItem, BillWithItems, ProductWithPortions } from '@/types/database';

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

interface UIState {
  // Current selection state
  selectedTable: DbTable | null;
  isParcelMode: boolean;
  currentBillId: string | null;
  
  // Local cart state (for optimistic updates)
  cart: CartItem[];
  
  // Bill info
  coverCount: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  discountReason: string | null;
  
  // Token counter for parcel orders (local)
  tokenCounter: number;
  
  // Actions
  setSelectedTable: (table: DbTable | null) => void;
  setParcelMode: (mode: boolean) => void;
  setCurrentBillId: (billId: string | null) => void;
  setCart: (cart: CartItem[]) => void;
  
  // Cart actions
  addToCart: (product: ProductWithPortions, portion: string, quantity: number) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  loadCartFromBill: (bill: BillWithItems) => void;
  markItemsSentToKitchen: () => void;
  
  // Discount actions
  setDiscount: (type: 'percentage' | 'fixed' | null, value: number | null, reason?: string | null) => void;
  setCoverCount: (count: number) => void;
  
  // Token
  getNextToken: () => number;
  
  // Reset
  resetBillingState: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      selectedTable: null,
      isParcelMode: false,
      currentBillId: null,
      cart: [],
      coverCount: 1,
      discountType: null,
      discountValue: null,
      discountReason: null,
      tokenCounter: 1,
      
      setSelectedTable: (table) => {
        // Always clear cart first - useCartSync will load the correct data
        // This prevents stale cart data from showing briefly
        set({
          selectedTable: table,
          isParcelMode: false,
          cart: [], // Always clear - useCartSync handles loading
          currentBillId: null, // Clear - useCartSync sets this if there's an active bill
          coverCount: 1,
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
      },
      
      setParcelMode: (mode) => {
        set({
          isParcelMode: mode,
          selectedTable: null,
          cart: [],
          currentBillId: null,
          coverCount: 1,
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
      },
      
      setCurrentBillId: (billId) => set({ currentBillId: billId }),
      
      setCart: (cart) => set({ cart }),
      
      addToCart: (product, portion, quantity) => {
        const portionData = product.portions.find((p) => p.size === portion);
        if (!portionData) return;
        
        const existingItem = get().cart.find(
          (item) => item.productId === product.id && item.portion === portion && !item.sentToKitchen
        );
        
        if (existingItem) {
          set({
            cart: get().cart.map((item) =>
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
      
      updateCartItem: (itemId, updates) => {
        set({
          cart: get().cart.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        });
      },
      
      removeFromCart: (itemId) => {
        set({ cart: get().cart.filter((item) => item.id !== itemId) });
      },
      
      clearCart: () => set({ cart: [] }),
      
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
      
      markItemsSentToKitchen: () => {
        set({
          cart: get().cart.map((item) => ({ ...item, sentToKitchen: true })),
        });
      },
      
      setDiscount: (type, value, reason = null) => {
        set({
          discountType: type,
          discountValue: value,
          discountReason: reason,
        });
      },
      
      setCoverCount: (count) => set({ coverCount: count }),
      
      getNextToken: () => {
        const token = get().tokenCounter;
        set({ tokenCounter: token + 1 });
        return token;
      },
      
      resetBillingState: () => {
        set({
          selectedTable: null,
          isParcelMode: false,
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
      name: 'billing-ui-storage',
      partialize: (state) => ({
        tokenCounter: state.tokenCounter,
      }),
    }
  )
);

// Utility functions for bill calculations
export const calculateBillTotals = (
  items: CartItem[],
  discountType?: 'percentage' | 'fixed' | null,
  discountValue?: number | null
) => {
  const subTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  
  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage' 
      ? (subTotal * discountValue) / 100 
      : discountValue;
  }
  
  const afterDiscount = subTotal - discountAmount;
  
  // Calculate GST by rate
  const gstByRate: Record<number, number> = {};
  items.forEach((item) => {
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
