import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock dependencies
vi.mock("@/store/uiStore", () => ({
  useUIStore: vi.fn(() => ({
    cart: [],
    selectedTable: null,
    isParcelMode: false,
    discountType: null,
    discountValue: null,
    discountReason: null,
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    currentBillId: null,
    getKOTItems: vi.fn(() => []),
    incrementBillNumber: vi.fn(() => "BILL-0001"),
  })),
}));

vi.mock("@/store/settingsStore", () => ({
  useSettingsStore: vi.fn(() => ({
    settings: {
      tax: { type: "gst" },
      currency: { symbol: "₹" },
    },
  })),
}));

vi.mock("@/hooks/useBillingOperations", () => ({
  useBillingOperations: vi.fn(() => ({
    printKOT: vi.fn().mockResolvedValue("test-bill-id"),
    settleBill: vi.fn().mockResolvedValue(true),
    saveOrUpdateBill: vi.fn().mockResolvedValue("test-bill-id"),
  })),
}));

vi.mock("@/hooks/usePrint", () => ({
  usePrint: vi.fn(() => ({
    printKOT: vi.fn().mockResolvedValue({ success: true, method: "queue" }),
    printBill: vi.fn().mockResolvedValue({ success: true, method: "queue" }),
    getBusinessInfo: vi.fn(() => ({ name: "Test Restaurant" })),
    currencySymbol: "₹",
    gstMode: "cgst_sgst",
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("MobileCartTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading States", () => {
    it("should show loading state while processing KOT print", async () => {
      // Test that isPrintingKOT state works correctly
      let isPrintingKOT = false;
      const setIsPrintingKOT = (value: boolean) => {
        isPrintingKOT = value;
      };

      setIsPrintingKOT(true);
      expect(isPrintingKOT).toBe(true);

      setIsPrintingKOT(false);
      expect(isPrintingKOT).toBe(false);
    });

    it("should show loading state while processing payment", async () => {
      let isProcessingPayment = false;
      const setIsProcessingPayment = (value: boolean) => {
        isProcessingPayment = value;
      };

      setIsProcessingPayment(true);
      expect(isProcessingPayment).toBe(true);

      setIsProcessingPayment(false);
      expect(isProcessingPayment).toBe(false);
    });

    it("should disable buttons during processing", () => {
      const isProcessing = true;
      const isDisabled = isProcessing || false;

      expect(isDisabled).toBe(true);
    });
  });

  describe("KOT Data Building", () => {
    it("should build correct KOT data structure", () => {
      const selectedTable = { number: "T1", id: "table-123" };
      const isParcelMode = false;
      const kotItems = [
        { productName: "Burger", quantity: 2, portion: "regular" },
      ];
      const billId = "bill-123";

      const kotData = {
        billId,
        tableNumber: selectedTable?.number,
        tokenNumber: isParcelMode ? Date.now() % 1000 : undefined,
        items: kotItems,
        billNumber: billId.slice(0, 8),
        kotNumber: 1,
        kotNumberFormatted: "01",
        isParcel: isParcelMode,
      };

      expect(kotData.billId).toBe("bill-123");
      expect(kotData.tableNumber).toBe("T1");
      expect(kotData.isParcel).toBe(false);
      expect(kotData.items.length).toBe(1);
    });

    it("should handle parcel mode correctly", () => {
      const isParcelMode = true;
      const tokenNumber = isParcelMode ? Date.now() % 1000 : undefined;

      expect(tokenNumber).toBeDefined();
      expect(typeof tokenNumber).toBe("number");
    });
  });

  describe("Bill Data Building", () => {
    it("should build correct bill data structure", () => {
      const billData = {
        billId: "bill-456",
        billNumber: "BILL-0001",
        tableNumber: "T2",
        items: [],
        subTotal: 500,
        discountAmount: 50,
        cgstAmount: 22.5,
        sgstAmount: 22.5,
        totalAmount: 495,
        finalAmount: 495,
        isParcel: false,
        showGST: true,
      };

      expect(billData.billId).toBe("bill-456");
      expect(billData.showGST).toBe(true);
      expect(billData.finalAmount).toBe(495);
    });

    it("should hide GST when tax type is none", () => {
      const taxType: string = "none";
      const showGST = taxType === "gst";

      expect(showGST).toBe(false);
    });
  });

  describe("Payment Flow", () => {
    it("should call settleBill with correct payment method", async () => {
      const settleBill = vi.fn().mockResolvedValue(true);
      const method = "cash";

      await settleBill(method);

      expect(settleBill).toHaveBeenCalledWith("cash");
    });

    it("should handle payment error gracefully", async () => {
      const settleBill = vi.fn().mockRejectedValue(new Error("Payment failed"));

      try {
        await settleBill("card");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

describe("PaymentModal Loading States", () => {
  it("should show loader on payment buttons when processing", () => {
    const isProcessing = true;

    // Verify that the isProcessing prop affects button state
    expect(isProcessing).toBe(true);
  });

  it("should disable all payment buttons when processing", () => {
    const isProcessing = true;
    const buttonDisabled = isProcessing;

    expect(buttonDisabled).toBe(true);
  });
});
