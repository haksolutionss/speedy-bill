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
  printedQuantity: number;
  isCustomPrice?: boolean;
}

// Re-export calculateBillTotals from centralized location for backward compatibility
export { calculateBillTotals } from '@/lib/billCalculations';

interface UIState {
  selectedTable: DbTable | null;
  isParcelMode: boolean;
  currentBillId: string | null;
  currentBillNumber: string;
  incrementBillNumber: () => string;
  cart: CartItem[];

  coverCount: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  discountReason: string | null;

  tokenCounter: number;

  // Actions
  setSelectedTable: (table: DbTable | null) => void;
  setParcelMode: (mode: boolean) => void;
  setCurrentBillId: (billId: string | null) => void;
  setCurrentBillNumber: (billNumber: string) => void;
  setCart: (cart: CartItem[]) => void;

  addToCart: (product: ProductWithPortions, portion: string, quantity: number, overridePrice?: number, isCustomPrice?: boolean) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  loadCartFromBill: (bill: BillWithItems) => void;
  markItemsSentToKitchen: () => void;

  setDiscount: (type: 'percentage' | 'fixed' | null, value: number | null, reason?: string | null) => void;
  setCoverCount: (count: number) => void;

  getNextToken: () => number;

  resetBillingState: () => void;

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

      getNextToken: () => {
        const token = get().tokenCounter;
        set({ tokenCounter: token + 1 });
        return token;
      },

      currentBillNumber: 'BILL-0000',

      incrementBillNumber: () => {
        const current = get().currentBillNumber;
        const num = parseInt(current.split('-')[1]) + 1;
        const next = `BILL-${num.toString().padStart(4, '0')}`;
        set({ currentBillNumber: next });
        return next;
      },

      setSelectedTable: (table) => {
        const prevTable = get().selectedTable;
        const isParcel = table?.number?.startsWith('P') ?? false;

        set({
          selectedTable: table,
          isParcelMode: isParcel,
          cart: prevTable?.id !== table?.id ? [] : get().cart,
          currentBillId: prevTable?.id !== table?.id ? null : get().currentBillId,
          coverCount: 1,
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
      },

      setParcelMode: (mode) => {
        const prevMode = get().isParcelMode;

        set({
          isParcelMode: mode,
          selectedTable: null,
          cart: prevMode !== mode ? [] : get().cart,
          currentBillId: prevMode !== mode ? null : get().currentBillId,
          coverCount: 1,
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
      },

      setCurrentBillId: (billId) => set({ currentBillId: billId }),
      setCurrentBillNumber: (billNumber) => set({ currentBillNumber: billNumber }),

      setCart: (cart) => set({ cart }),

      addToCart: (product, portion, quantity, overridePrice, isCustomPrice = false) => {
        const portionData = product.portions.find((p) => p.size === portion);
        if (!portionData) return;

        const unitPrice = overridePrice ?? portionData.price;

        if (isCustomPrice) {
          const newItem: CartItem = {
            id: generateId(),
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            portion,
            quantity,
            unitPrice,
            gstRate: product.gst_rate,
            sentToKitchen: false,
            printedQuantity: 0,
            isCustomPrice: true,
          };
          set({ cart: [...get().cart, newItem] });
          return;
        }

        const existingPendingItem = get().cart.find(
          (item) => item.productId === product.id && item.portion === portion && !item.sentToKitchen && !item.isCustomPrice
        );

        if (existingPendingItem) {
          set({
            cart: get().cart.map((item) =>
              item.id === existingPendingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const existingSentItem = get().cart.find(
            (item) => item.productId === product.id && item.portion === portion && item.sentToKitchen && !item.isCustomPrice
          );

          if (existingSentItem) {
            set({
              cart: get().cart.map((item) =>
                item.id === existingSentItem.id
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
              unitPrice,
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

        if (item?.sentToKitchen) {
          if (updates.quantity !== undefined && updates.quantity > item.quantity) {
            set({
              cart: get().cart.map((i) =>
                i.id === itemId ? { ...i, quantity: updates.quantity! } : i
              ),
            });
          }
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
        if (item?.sentToKitchen) return;
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

      resetBillingState: () => {
        set({
          selectedTable: null,
          isParcelMode: false,
          cart: [],
          currentBillId: null,
          coverCount: 1,
          discountType: null,
          discountValue: null,
          discountReason: null,
        });
      },

      getKOTItems: () => {
        const cart = get().cart;
        const kotItems: CartItem[] = [];

        for (const item of cart) {
          if (!item.sentToKitchen) {
            kotItems.push(item);
          } else if (item.quantity > item.printedQuantity) {
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
      // Only persist non-transactional UI state
      partialize: (state) => ({
        tokenCounter: state.tokenCounter,
        currentBillNumber: state.currentBillNumber,
        // DO NOT persist currentBillId - it's transactional and must come from DB
      }),
    }
  )
);
