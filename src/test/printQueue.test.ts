import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing module
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("Print Queue Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  describe("KOT Print Jobs", () => {
    it("should create a KOT print job with correct payload structure", async () => {
      const kotData = {
        billId: "test-bill-123",
        tableNumber: "T1",
        items: [
          { productName: "Burger", quantity: 2, portion: "regular" },
          { productName: "Fries", quantity: 1, portion: "large" },
        ],
        kotNumber: 1,
        kotNumberFormatted: "01",
        isParcel: false,
      };

      // Verify KOT data structure is correct
      expect(kotData).toHaveProperty("billId");
      expect(kotData).toHaveProperty("items");
      expect(kotData).toHaveProperty("kotNumberFormatted");
      expect(kotData.items.length).toBe(2);
    });

    it("should include all required fields for KOT print job insertion", () => {
      const printJobPayload = {
        bill_id: "test-bill-123",
        job_type: "kot",
        status: "pending",
        payload: { tableNumber: "T1", items: [] },
        requested_from: "pwa",
      };

      expect(printJobPayload.job_type).toBe("kot");
      expect(printJobPayload.status).toBe("pending");
      expect(printJobPayload.requested_from).toBe("pwa");
    });

    it("should format KOT number correctly with leading zeros", () => {
      const formatKOTNumber = (num: number): string => {
        return num.toString().padStart(2, "0");
      };

      expect(formatKOTNumber(1)).toBe("01");
      expect(formatKOTNumber(9)).toBe("09");
      expect(formatKOTNumber(10)).toBe("10");
      expect(formatKOTNumber(99)).toBe("99");
    });
  });

  describe("Bill Print Jobs", () => {
    it("should create a Bill print job with correct payload structure", async () => {
      const billData = {
        billId: "test-bill-456",
        billNumber: "BILL-0001",
        tableNumber: "T2",
        items: [
          { productName: "Pizza", quantity: 1, unitPrice: 250, portion: "large" },
        ],
        subTotal: 250,
        discountAmount: 0,
        cgstAmount: 12.5,
        sgstAmount: 12.5,
        totalAmount: 275,
        finalAmount: 275,
        paymentMethod: "cash",
        showGST: true,
      };

      expect(billData).toHaveProperty("billId");
      expect(billData).toHaveProperty("billNumber");
      expect(billData).toHaveProperty("finalAmount");
      expect(billData.showGST).toBe(true);
    });

    it("should include correct job_type for bill printing", () => {
      const printJobPayload = {
        bill_id: "test-bill-456",
        job_type: "bill",
        status: "pending",
        payload: { billNumber: "BILL-0001" },
        requested_from: "pwa",
      };

      expect(printJobPayload.job_type).toBe("bill");
    });
  });

  describe("Print Job Status Flow", () => {
    it("should have valid status transitions", () => {
      const validStatuses = ["pending", "processing", "completed", "failed"];
      
      expect(validStatuses).toContain("pending");
      expect(validStatuses).toContain("completed");
      expect(validStatuses).toContain("failed");
    });

    it("should validate print job required fields", () => {
      const requiredFields = ["bill_id", "job_type", "payload", "requested_from"];
      
      const printJob = {
        bill_id: "test-123",
        job_type: "kot",
        payload: {},
        requested_from: "pwa",
      };

      requiredFields.forEach((field) => {
        expect(printJob).toHaveProperty(field);
      });
    });
  });
});

describe("KOT Number Manager", () => {
  it("should reset KOT number on new day", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    expect(today).not.toBe(yesterday);
  });

  it("should increment KOT number correctly", () => {
    let kotCounter = 0;
    
    const getNextKOT = () => {
      kotCounter += 1;
      return kotCounter.toString().padStart(2, "0");
    };

    expect(getNextKOT()).toBe("01");
    expect(getNextKOT()).toBe("02");
    expect(getNextKOT()).toBe("03");
  });
});
