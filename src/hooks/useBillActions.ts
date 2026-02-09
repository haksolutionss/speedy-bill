import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore, type CartItem } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBillingOperations } from '@/hooks/useBillingOperations';
import { usePrint } from '@/hooks/usePrint';
import { calculateBillTotals } from '@/lib/billCalculations';
import { getNextKOTNumber } from '@/lib/kotNumberManager';
import { toast } from 'sonner';
import type { KOTData, BillData } from '@/lib/escpos/templates';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
}

export function useBillActions() {
  const {
    cart,
    currentBillId,
    selectedTable,
    isParcelMode,
    getKOTItems,
    discountType,
    discountValue,
    discountReason,
    setDiscount,
  } = useUIStore();

  const { settings, calculateLoyaltyPoints, calculateRedemptionValue } = useSettingsStore();
  const { printKOT, settleBill, saveOrUpdateBill } = useBillingOperations();
  const {
    printRef,
    print,
    printKOTDirect,
    printBillDirect,
    openCashDrawer,
    getBusinessInfo,
    currencySymbol,
    gstMode,
    isElectron,
  } = usePrint();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTPreview, setShowKOTPreview] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const kotItems = getKOTItems();
  const hasPendingItems = kotItems.length > 0;
  const hasItems = cart.length > 0;

  const taxType = settings.tax.type;
  const loyaltyDiscount = calculateRedemptionValue(loyaltyPointsToUse);
  const totals = calculateBillTotals(cart, discountType, discountValue, taxType);
  const { subTotal, discountAmount, cgstAmount, sgstAmount, totalAmount } = totals;
  const finalAmount = Math.max(0, totals.finalAmount - loyaltyDiscount);

  const businessInfo = getBusinessInfo();
  const pointsToEarn = calculateLoyaltyPoints(finalAmount);

  const buildKOTData = useCallback((): KOTData => {
    const kotNumber = getNextKOTNumber();
    const tokenNumber = useUIStore.getState().getNextToken();

    return {
      tableNumber: selectedTable?.number,
      tokenNumber: isParcelMode ? tokenNumber : undefined,
      items: kotItems,
      billNumber: currentBillId?.slice(0, 8),
      kotNumber: parseInt(kotNumber, 10),
      kotNumberFormatted: kotNumber,
      isParcel: isParcelMode,
    };
  }, [selectedTable, isParcelMode, kotItems, currentBillId]);

  const buildBillData = useCallback((overrideBillId?: string): BillData => {
    const tokenNumber = useUIStore.getState().getNextToken();

    return {

      billId: overrideBillId || currentBillId || '',
      billNumber: currentBillId?.slice(0, 8) || 'BILL-0000',
      tableNumber: selectedTable?.number,
      tokenNumber: isParcelMode ? tokenNumber : undefined,
      items: cart,
      subTotal,
      discountAmount: discountAmount + loyaltyDiscount,
      discountType: discountType || undefined,
      discountValue: discountValue || undefined,
      discountReason: discountReason || undefined,
      cgstAmount: taxType === 'gst' ? cgstAmount : 0,
      sgstAmount: taxType === 'gst' ? sgstAmount : 0,
      totalAmount,
      finalAmount,
      isParcel: isParcelMode,
      restaurantName: businessInfo.name,
      fssaiNumber: businessInfo.fssaiNumber,
      address: businessInfo.address,
      phone: businessInfo.phone,
      gstin: businessInfo.gstNumber,
      currencySymbol,
      gstMode,
      customerName: selectedCustomer?.name,
      loyaltyPointsUsed: loyaltyPointsToUse,
      loyaltyPointsEarned: pointsToEarn,
      showGST: taxType === 'gst',
    }
  }, [
    currentBillId, selectedTable, isParcelMode, cart, subTotal, discountAmount,
    loyaltyDiscount, discountType, discountValue, discountReason, taxType,
    cgstAmount, sgstAmount, totalAmount, finalAmount, businessInfo, currencySymbol,
    gstMode, selectedCustomer, loyaltyPointsToUse, pointsToEarn
  ]);

  const handleDirectPrintKOT = useCallback(async () => {
    if (!hasPendingItems || isPrinting) {
      if (!hasPendingItems) toast.info('No new items to send to kitchen');
      return;
    }

    setIsPrinting(true);
    try {
      await printKOT();
      const kotData = buildKOTData();
      const result = await printKOTDirect(kotData);

      if (result.success) {
        console.log(isElectron ? 'KOT printed to kitchen' : 'KOT sent to kitchen');
      } else if (result.error) {
        console.warn(`Print failed: ${result.error}`);
      }
    } catch (error) {
      console.error('KOT print error:', error);
    } finally {
      setIsPrinting(false);
    }
  }, [hasPendingItems, isPrinting, printKOT, buildKOTData, printKOTDirect, isElectron]);

  const handleDirectPrintBill = useCallback(async () => {
    if (!hasItems || isPrinting) {
      if (!hasItems) toast.error('Add items to print bill');
      return;
    }

    setIsPrinting(true);
    try {
      let billId: string | null = null;

      if (hasPendingItems) {
        billId = await printKOT();
      } else {
        billId = await saveOrUpdateBill();
      }

      if (!billId) {
        toast.error('Failed to create bill');
        return;
      }

      const defaultMethod = settings.billing.defaultPaymentMethod;
      const billData = { ...buildBillData(), billId, paymentMethod: defaultMethod };
      console.log("billData", billData)
      const result = await printBillDirect(billData);

      if (defaultMethod === 'cash' && isElectron) {
        await openCashDrawer();
      }

      await settleBill(defaultMethod, undefined, undefined, 0, finalAmount);

      if (result.success) {
        console.warn(`Bill settled with ${defaultMethod.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Bill print error:', error);
    } finally {
      setIsPrinting(false);
    }
  }, [
    hasItems, isPrinting, hasPendingItems, printKOT, saveOrUpdateBill,
    settings.billing.defaultPaymentMethod, buildBillData, printBillDirect,
    isElectron, openCashDrawer, settleBill, finalAmount
  ]);

  const handlePrintKOT = useCallback(async () => {
    if (!hasPendingItems) {
      toast.info('No new items to send to kitchen');
      return;
    }

    if (isElectron) {
      await handleDirectPrintKOT();
      return;
    }

    setShowKOTPreview(true);
  }, [hasPendingItems, isElectron, handleDirectPrintKOT]);

  const handlePrintBill = useCallback(async () => {
    if (!hasItems) {
      toast.error('Add items to print bill');
      return;
    }

    const billId = await saveOrUpdateBill();
    if (!billId) {
      toast.error('Failed to create bill');
      return;
    }

    setShowPaymentDialog(true);
  }, [hasItems, saveOrUpdateBill]);

  const confirmPrintKOT = useCallback(async () => {
    await printKOT();
    if (printRef.current) {
      print('kitchen');
    }
    setShowKOTPreview(false);
  }, [printKOT, printRef, print]);

  const handlePayment = useCallback(async (method: 'cash' | 'card' | 'upi') => {
    setShowPaymentDialog(false);
    setIsPrinting(true);

    try {
      const billId = currentBillId ?? await saveOrUpdateBill();
      if (!billId) {
        toast.error('Failed to create bill');
        return;
      }

      const billData = buildBillData();
      billData.paymentMethod = method;

      const result = await printBillDirect(billData);

      if (method === 'cash' && isElectron) {
        await openCashDrawer();
      }

      await settleBill(method, undefined, selectedCustomer?.id, loyaltyPointsToUse, finalAmount);

      if (!result.success && !isElectron) {
        setShowBillPreview(true);
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsPrinting(false);
      setSelectedCustomer(null);
      setLoyaltyPointsToUse(0);
    }
  }, [
    currentBillId, saveOrUpdateBill, buildBillData, printBillDirect,
    isElectron, openCashDrawer, settleBill, selectedCustomer, loyaltyPointsToUse, finalAmount
  ]);

  const handleSplitPayment = useCallback(async (
    payments: { method: 'cash' | 'card' | 'upi'; amount: number }[]
  ) => {
    setShowSplitPayment(false);
    setShowPaymentDialog(false);
    setIsPrinting(true);

    try {
      const billId = currentBillId ?? await saveOrUpdateBill();
      if (!billId) {
        toast.error('Failed to create bill');
        return;
      }

      const billData = buildBillData();
      billData.paymentMethod = 'Split';

      const result = await printBillDirect(billData);

      if (payments.some(p => p.method === 'cash') && isElectron) {
        await openCashDrawer();
      }

      await settleBill('split', payments, selectedCustomer?.id, loyaltyPointsToUse, finalAmount);

      if (!result.success && !isElectron) {
        setShowBillPreview(true);
      }
    } catch (error) {
      console.error('Split payment error:', error);
    } finally {
      setIsPrinting(false);
      setSelectedCustomer(null);
      setLoyaltyPointsToUse(0);
    }
  }, [
    currentBillId, saveOrUpdateBill, buildBillData, printBillDirect,
    isElectron, openCashDrawer, settleBill, selectedCustomer, loyaltyPointsToUse, finalAmount
  ]);

  const handleApplyDiscount = useCallback((
    type: 'percentage' | 'fixed' | null,
    value: number | null,
    reason: string | null
  ) => {
    setDiscount(type, value, reason);
  }, [setDiscount]);

  const handleSelectCustomer = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer);
    setLoyaltyPointsToUse(0);
  }, []);

  const handleUseLoyaltyPoints = useCallback((points: number) => {
    if (selectedCustomer && points <= selectedCustomer.loyalty_points) {
      setLoyaltyPointsToUse(points);
    }
  }, [selectedCustomer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        if (hasPendingItems) {
          handleDirectPrintKOT();
        } else {
          toast.info('No new items to send to kitchen');
        }
        return false;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        if (hasItems) {
          handleDirectPrintBill();
        } else {
          toast.error('Add items to print bill');
        }
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [hasPendingItems, hasItems, handleDirectPrintKOT, handleDirectPrintBill]);

  return {
    // State
    showPaymentDialog,
    setShowPaymentDialog,
    showKOTPreview,
    setShowKOTPreview,
    showBillPreview,
    setShowBillPreview,
    showDiscountModal,
    setShowDiscountModal,
    showCustomerModal,
    setShowCustomerModal,
    showSplitPayment,
    setShowSplitPayment,
    selectedCustomer,
    loyaltyPointsToUse,
    isPrinting,

    // Computed
    hasPendingItems,
    hasItems,
    kotItems,
    totals,
    finalAmount,
    loyaltyDiscount,
    pointsToEarn,
    businessInfo,
    currencySymbol,
    gstMode,
    taxType,
    isElectron,

    // Refs
    printRef,
    kotRef,
    billRef,

    // Handlers
    handlePrintKOT,
    handlePrintBill,
    confirmPrintKOT,
    handlePayment,
    handleSplitPayment,
    handleApplyDiscount,
    handleSelectCustomer,
    handleUseLoyaltyPoints,
    print,

    // Store state
    cart,
    currentBillId,
    selectedTable,
    isParcelMode,
    discountType,
    discountValue,
    discountReason,
    settings,
  };
}
