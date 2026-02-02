import { useBillActions } from '@/hooks/useBillActions';
import { BillSummary } from './BillSummary';
import { DiscountModal } from './DiscountModal';
import { CustomerModal } from './CustomerModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import {
  ActionButtons,
  PaymentDialog,
  KOTPreviewDialog,
  BillPreviewDialog,
} from './actions';

export function BillActions() {
  const {
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
  } = useBillActions();

  const { subTotal, discountAmount, cgstAmount, sgstAmount, totalAmount } = totals;

  return (
    <>
      <ActionButtons
        hasPendingItems={hasPendingItems}
        hasItems={hasItems}
        isPrinting={isPrinting}
        discountValue={discountValue}
        discountType={discountType}
        currencySymbol={currencySymbol}
        selectedCustomerName={selectedCustomer?.name.split(' ')[0]}
        onPrintKOT={handlePrintKOT}
        onPrintBill={handlePrintBill}
        onOpenDiscount={() => setShowDiscountModal(true)}
        onOpenCustomer={() => setShowCustomerModal(true)}
      />

      <DiscountModal
        open={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        currentType={discountType}
        currentValue={discountValue}
        currentReason={discountReason}
        subTotal={subTotal}
      />

      <CustomerModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleSelectCustomer}
        currentCustomer={selectedCustomer}
        billAmount={finalAmount}
        onUseLoyaltyPoints={handleUseLoyaltyPoints}
        loyaltyPointsToUse={loyaltyPointsToUse}
      />

      <KOTPreviewDialog
        open={showKOTPreview}
        onOpenChange={setShowKOTPreview}
        printRef={printRef}
        kotRef={kotRef}
        tableNumber={selectedTable?.number}
        items={kotItems}
        isParcel={isParcelMode}
        onConfirm={confirmPrintKOT}
      />

      <BillPreviewDialog
        open={showBillPreview}
        onOpenChange={setShowBillPreview}
        printRef={printRef}
        billRef={billRef}
        billNumber={currentBillId?.slice(0, 8) || 'BILL-0000'}
        tableNumber={selectedTable?.number}
        items={cart}
        subTotal={subTotal}
        discountAmount={discountAmount + loyaltyDiscount}
        cgstAmount={taxType === 'gst' ? cgstAmount : 0}
        sgstAmount={taxType === 'gst' ? sgstAmount : 0}
        totalAmount={totalAmount}
        finalAmount={finalAmount}
        isParcel={isParcelMode}
        restaurantName={businessInfo.name}
        address={businessInfo.address}
        phone={businessInfo.phone}
        gstin={taxType === 'gst' ? businessInfo.gstNumber : undefined}
        currencySymbol={currencySymbol}
        gstMode={gstMode}
        customerName={selectedCustomer?.name}
        loyaltyPointsUsed={loyaltyPointsToUse}
        loyaltyPointsEarned={pointsToEarn}
        showGST={taxType === 'gst'}
        onPrint={() => { print('counter'); setShowBillPreview(false); }}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        finalAmount={finalAmount}
        currencySymbol={currencySymbol}
        isPrinting={isPrinting}
        selectedCustomer={selectedCustomer}
        loyaltyPointsToUse={loyaltyPointsToUse}
        loyaltyDiscount={loyaltyDiscount}
        pointsToEarn={pointsToEarn}
        loyaltyEnabled={settings.loyalty.enabled}
        onPayment={handlePayment}
        onOpenSplitPayment={() => {
          setShowPaymentDialog(false);
          setShowSplitPayment(true);
        }}
      />

      <SplitPaymentModal
        open={showSplitPayment}
        onClose={() => setShowSplitPayment(false)}
        onConfirm={handleSplitPayment}
        finalAmount={finalAmount}
      />
    </>
  );
}
