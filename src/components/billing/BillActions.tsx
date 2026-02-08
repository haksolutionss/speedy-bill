import { useBillActions } from '@/hooks/useBillActions';
import { usePrint } from '@/hooks/usePrint';
import { BillSummary } from './BillSummary';
import { DiscountModal } from './DiscountModal';
import { CustomerModal } from './CustomerModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import { DevPrintPreviewModal } from './DevPrintPreviewModal';
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

  // Dev preview modal controls from usePrint
  const { showDevPreview, pendingBillData, confirmDevPrint, closeDevPreview } = usePrint();

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
        fssaiNumber={businessInfo.fssaiNumber}
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

      {/* Development Print Preview Modal - Only shown in dev mode on desktop */}
      {pendingBillData && (
        <DevPrintPreviewModal
          open={showDevPreview}
          onOpenChange={(open) => {
            if (!open) closeDevPreview();
          }}
          onConfirmPrint={confirmDevPrint}
          billData={{
            billNumber: pendingBillData.billNumber,
            tableNumber: pendingBillData.tableNumber,
            tokenNumber: pendingBillData.tokenNumber,
            items: pendingBillData.items,
            subTotal: pendingBillData.subTotal,
            discountAmount: pendingBillData.discountAmount,
            discountType: pendingBillData.discountType,
            discountValue: pendingBillData.discountValue,
            discountReason: pendingBillData.discountReason,
            cgstAmount: pendingBillData.cgstAmount,
            sgstAmount: pendingBillData.sgstAmount,
            totalAmount: pendingBillData.totalAmount,
            finalAmount: pendingBillData.finalAmount,
            paymentMethod: pendingBillData.paymentMethod,
            isParcel: pendingBillData.isParcel,
            coverCount: pendingBillData.coverCount,
            restaurantName: pendingBillData.restaurantName,
            address: pendingBillData.address,
            phone: pendingBillData.phone,
            gstin: pendingBillData.gstin,
            fssaiNumber: pendingBillData.fssaiNumber,
            currencySymbol: pendingBillData.currencySymbol,
            gstMode: pendingBillData.gstMode,
            customerName: pendingBillData.customerName,
            loyaltyPointsUsed: pendingBillData.loyaltyPointsUsed,
            loyaltyPointsEarned: pendingBillData.loyaltyPointsEarned,
            showGST: pendingBillData.showGST,
            isPureVeg: pendingBillData.isPureVeg,
          }}
        />
      )}
    </>
  );
}
