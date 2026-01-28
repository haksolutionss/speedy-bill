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
  // Track printed quantity for incremental KOT printing
  printedQuantity: number;
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
  
  // Get items that need to be printed on KOT (only new/added quantities)
  getKOTItems: () => CartItem[];
}

const generateId = () => crypto.randomUUID();

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
        set({
          selectedTable: table,
          isParcelMode: false,
          cart: [],
          currentBillId: null,
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
        // portion is the size name (string)
        const portionData = product.portions.find((p) => p.size === portion);
        if (!portionData) return;

        // Find existing item that hasn't been sent to kitchen yet
        const existingPendingItem = get().cart.find(
          (item) => item.productId === product.id && item.portion === portion && !item.sentToKitchen
        );

        if (existingPendingItem) {
          // Add to existing pending item
          set({
            cart: get().cart.map((item) =>
              item.id === existingPendingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          // Check if there's a sent item we should add to instead
          const existingSentItem = get().cart.find(
            (item) => item.productId === product.id && item.portion === portion && item.sentToKitchen
          );

          if (existingSentItem) {
            // Add quantity to sent item - the difference will be printed in next KOT
            set({
              cart: get().cart.map((item) =>
                item.id === existingSentItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            });
          } else {
            // Create new item
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
              printedQuantity: 0,
            };
            set({ cart: [...get().cart, newItem] });
          }
        }
      },

      updateCartItem: (itemId, updates) => {
        const item = get().cart.find((i) => i.id === itemId);
        
        // Prevent updates to printed items (except quantity increase)
        if (item?.sentToKitchen) {
          // Only allow quantity increase for printed items
          if (updates.quantity !== undefined && updates.quantity > item.quantity) {
            set({
              cart: get().cart.map((i) =>
                i.id === itemId ? { ...i, quantity: updates.quantity! } : i
              ),
            });
          }
          // Ignore other updates for printed items
          return;
        }

        set({
          cart: get().cart.map((i) =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        });
      },

      removeFromCart: (itemId) => {
        const item = get().cart.find((i) => i.id === itemId);
        
        // Prevent removal of printed items
        if (item?.sentToKitchen) {
          return;
        }

        set({ cart: get().cart.filter((i) => i.id !== itemId) });
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
          // If sent to kitchen, all quantity was printed
          printedQuantity: item.sent_to_kitchen ? item.quantity : 0,
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
          cart: get().cart.map((item) => ({ 
            ...item, 
            sentToKitchen: true,
            // Update printed quantity to current quantity
            printedQuantity: item.quantity,
          })),
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

      // Get items for KOT - only new items or increased quantities
      getKOTItems: () => {
        const cart = get().cart;
        const kotItems: CartItem[] = [];

        for (const item of cart) {
          if (!item.sentToKitchen) {
            // New item, not yet sent to kitchen
            kotItems.push(item);
          } else if (item.quantity > item.printedQuantity) {
            // Existing item with increased quantity - only print the difference
            kotItems.push({
              ...item,
              quantity: item.quantity - item.printedQuantity,
            });
          }
        }

        return kotItems;
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
