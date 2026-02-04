import { forwardRef } from 'react';
import type { CartItem } from '@/store/uiStore';

interface BillTemplateProps {
  billNumber: string;
  tableNumber?: string;
  tokenNumber?: number;
  items: CartItem[];
  subTotal: number;
  discountAmount: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountReason?: string;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  finalAmount: number;
  paymentMethod?: string;
  isParcel?: boolean;
  coverCount?: number;
  restaurantName?: string;
  address?: string;
  phone?: string;
  gstin?: string;
  currencySymbol?: string;
  gstMode?: 'cgst_sgst' | 'igst';
  customerName?: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  showGST?: boolean; // Whether to show GST rows (based on tax type)
}

export const BillTemplate = forwardRef<HTMLDivElement, BillTemplateProps>(
  ({
    billNumber,
    tableNumber,
    tokenNumber,
    items,
    subTotal,
    discountAmount,
    discountType,
    discountValue,
    discountReason,
    cgstAmount,
    sgstAmount,
    totalAmount,
    finalAmount,
    paymentMethod,
    isParcel,
    coverCount,
    restaurantName = "Hotel Aqsa",
    address = "Juhapura",
    phone = "",
    gstin = "27XXXXX1234X1ZX",
    currencySymbol = "₹",
    gstMode = "cgst_sgst",
    customerName,
    loyaltyPointsUsed = 0,
    loyaltyPointsEarned = 0,
    showGST = true, // Default to showing GST
  }, ref) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Group items by GST rate for tax breakdown (only if GST is enabled)
    const gstBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; igst: number }> = {};

    if (showGST) {
      items.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        const itemDiscount = discountAmount > 0 ? (itemTotal / subTotal) * discountAmount : 0;
        const taxableAmount = itemTotal - itemDiscount;
        const gst = taxableAmount * (item.gstRate / 100);

        if (!gstBreakdown[item.gstRate]) {
          gstBreakdown[item.gstRate] = { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        gstBreakdown[item.gstRate].taxableAmount += taxableAmount;
        if (gstMode === 'igst') {
          gstBreakdown[item.gstRate].igst += gst;
        } else {
          gstBreakdown[item.gstRate].cgst += gst / 2;
          gstBreakdown[item.gstRate].sgst += gst / 2;
        }
      });
    }

    return (
      <div ref={ref} className="bill-print-template">
        <style>{`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            .bill-print-template,
            .bill-print-template * {
              visibility: visible;
            }
            .bill-print-template {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              background: white !important;
              color: black !important;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.3;
              padding: 3mm;
            }
          }
          .bill-print-template {
            width: 80mm;
            background: white;
            color: black;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            padding: 3mm;
          }
          .bill-header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .bill-restaurant-name {
            font-size: 16px;
            font-weight: bold;
          }
          .bill-address {
            font-size: 9px;
            margin: 4px 0;
          }
          .bill-gstin {
            font-size: 10px;
          }
          .bill-title {
            font-size: 14px;
            font-weight: bold;
            margin-top: 8px;
            letter-spacing: 1px;
          }
          .bill-info {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .bill-table-info {
            font-weight: bold;
            text-align: center;
            padding: 8px 0;
            margin-bottom: 8px;
          }
          .bill-items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding: 4px 0;
          }
          .bill-items-header span:first-child {
            flex: 1;
          }
          .bill-items-header span:nth-child(2) {
            width: 30px;
            text-align: center;
          }
          .bill-items-header span:nth-child(3) {
            width: 45px;
            text-align: right;
          }
          .bill-items-header span:last-child {
            width: 55px;
            text-align: right;
          }
          .bill-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
          }
          .bill-item span:first-child {
            flex: 1;
            font-size: 10px;
          }
          .bill-item span:nth-child(2) {
            width: 30px;
            text-align: center;
          }
          .bill-item span:nth-child(3) {
            width: 45px;
            text-align: right;
          }
          .bill-item span:last-child {
            width: 55px;
            text-align: right;
          }
          .bill-item-notes {
            font-size: 9px;
            font-style: italic;
            padding-left: 8px;
            color: #666;
          }
          .bill-divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
         
        .bill-total-row {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
        }

        .bill-total-row span:first-child {
          min-width: 160px;
          text-align: right;
        }

        .bill-total-row span:last-child {
          min-width: 80px;
          text-align: right;
        }

        .bill-total-row.final {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px dashed #000;
          padding-top: 4px;
          margin-top: 4px;
        }

          .bill-gst-breakdown {
            font-size: 9px;
            padding-top: 8px;
            border-top: 1px dashed #000;
          }
          .bill-gst-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding-bottom: 4px;
            border-bottom: 1px solid #000;
          }
          .bill-gst-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .bill-payment {
            text-align: center;
            margin-top: 8px;
            padding: 8px;
            border: 1px solid #000;
          }
          .bill-footer {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
          }
          .bill-thank-you {
            font-size: 12px;
            font-weight: bold;
          }
        `}</style>

        <div className="bill-header">
          <div className="bill-restaurant-name">{restaurantName}</div>
          <div className="bill-address">{address}</div>
          {phone && <div className="bill-address">Tel: {phone}</div>}
          {gstin && <div className="bill-gstin">GSTIN: {gstin}</div>}
        </div>

        <div className="bill-info">
          <span>Bill No: {billNumber}</span>
          <span>Date: {dateStr}</span>
        </div>
        <div className="bill-info">
          <span>Time: {timeStr}</span>
          {coverCount && <span>Covers: {coverCount}</span>}
          {isParcel ? `PARCEL - Token #${tokenNumber}` : `TABLE: ${tableNumber}`}
        </div>

        <div className="bill-items-header">
          <span>Item</span>
          <span>Qty</span>
          <span>Rate</span>
          <span>Amount</span>
        </div>

        {items.map((item, index) => (
          <div key={item.id}>
            <div className="bill-item">
              <span>
                {index + 1}. {item.productName}
                {isParcel && item.portion !== 'single' && ` (${item.portion})`}
              </span>
              <span>{item.quantity}</span>
              <span>{item.unitPrice.toFixed(2)}</span>
              <span>{(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
            {item.notes && (
              <div className="bill-item-notes">» {item.notes}</div>
            )}
          </div>
        ))}

        <div className="bill-divider" />

        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Sub Total:</span>
            <span>{currencySymbol}{subTotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="bill-total-row">
              <span>
                Discount
                {discountType === 'percentage' ? ` (${discountValue}%)` : ''}
                {discountReason && ` - ${discountReason}`}:
              </span>
              <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
            </div>
          )}
          {showGST && gstMode === 'igst' ? (
            <div className="bill-total-row">
              <span>IGST:</span>
              <span>{currencySymbol}{(cgstAmount + sgstAmount).toFixed(2)}</span>
            </div>
          ) : showGST ? (
            <>
              <div className="bill-total-row">
                <span>CGST:</span>
                <span>{currencySymbol}{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="bill-total-row">
                <span>SGST:</span>
                <span>{currencySymbol}{sgstAmount.toFixed(2)}</span>
              </div>
            </>
          ) : null}
          <div className="bill-total-row final">
            <span>GRAND TOTAL:</span>
            <span>{currencySymbol}{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* {Object.keys(gstBreakdown).length > 0 && (
          <div className="bill-gst-breakdown">
            <div className="bill-gst-header">
              <span>GST%</span>
              <span>Taxable</span>
              {gstMode === 'igst' ? <span>IGST</span> : <><span>CGST</span><span>SGST</span></>}
            </div>
            {Object.entries(gstBreakdown).map(([rate, data]) => (
              <div key={rate} className="bill-gst-row">
                <span>{rate}%</span>
                <span>{data.taxableAmount.toFixed(2)}</span>
                {gstMode === 'igst' ? (
                  <span>{data.igst.toFixed(2)}</span>
                ) : (
                  <>
                    <span>{data.cgst.toFixed(2)}</span>
                    <span>{data.sgst.toFixed(2)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )} */}

        {paymentMethod && (
          <div className="bill-payment">
            <strong>PAID BY: {paymentMethod.toUpperCase()}</strong>
          </div>
        )}

        {/* Loyalty Info */}
        {/* {(loyaltyPointsUsed > 0 || loyaltyPointsEarned > 0 || customerName) && (
          <div style={{ marginTop: '0px', padding: '4px 0', borderTop: '1px dashed #000', fontSize: '10px' }}>
            {customerName && <div>Customer: {customerName}</div>}
            {loyaltyPointsUsed > 0 && <div>Points Redeemed: {loyaltyPointsUsed}</div>}
            {loyaltyPointsEarned > 0 && <div>Points Earned: +{loyaltyPointsEarned}</div>}
          </div>
        )} */}

        <div className="bill-footer">
          <div className="bill-thank-you">Thank You! Visit Again!</div>
        </div>
      </div>
    );
  }
);

BillTemplate.displayName = 'BillTemplate';
