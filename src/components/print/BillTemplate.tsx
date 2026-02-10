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
  fssaiNumber?: string;
  currencySymbol?: string;
  gstMode?: 'cgst_sgst' | 'igst';
  customerName?: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  showGST?: boolean;
  isPureVeg?: boolean;
}

const formatDate = (): string => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
};

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
    cgstAmount,
    sgstAmount,
    finalAmount,
    isParcel,
    restaurantName = "Restaurant",
    address = "",
    phone = "",
    gstin = "",
    fssaiNumber = "",
    gstMode = "cgst_sgst",
    showGST = true,
    isPureVeg = true,
  }, ref) => {

    const cleanedBillNumber = billNumber.split('-').pop() || billNumber;
    const gstRate = items[0]?.gstRate ?? 5;
    const halfRate = gstRate / 2;
    const vegLabel = isPureVeg ? 'PURE VEG.' : 'NON VEG. / VEG';

    const calculatedTotal = subTotal - discountAmount + cgstAmount + sgstAmount;
    const roundOff = finalAmount - calculatedTotal;

    return (
      <div ref={ref} className="bill-print-template">
        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body * { visibility: hidden; }
            .bill-print-template, .bill-print-template * { visibility: visible; }
            .bill-print-template { position: absolute; left: 0; top: 0; width: 80mm; background: white !important; color: black !important; }
          }
          .bill-print-template {
            width: 80mm;
            background: white;
            color: black;
            font-family: 'Courier New', 'Courier', monospace;
            font-size: 12px;
            line-height: 1.3;
            padding: 2mm 3mm;
          }

          /* ── Outer border ── */
          .bill-outer {
            border: 2px solid #000;
          }

          /* ── Header ── */
          .bill-header {
            text-align: center;
            padding: 8px 6px 6px;
            border-bottom: 2px solid #000;
          }
          .bill-restaurant-name {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
          .bill-address-line {
            font-size: 12px;
            line-height: 1.5;
          }
          .bill-phone {
            font-size: 13px;
            font-weight: 700;
            margin-top: 3px;
          }

          /* ── TAX INVOICE / VEG box ── */
          .bill-invoice-row {
            display: flex;
            justify-content: center;
            padding: 6px 8px;
            border-bottom: 2px solid #000;
          }
          .bill-invoice-box {
            display: flex;
            border: 2px solid #000;
          }
          .bill-invoice-cell {
            padding: 4px 12px;
            font-weight: 900;
            font-size: 13px;
            letter-spacing: 0.5px;
            white-space: nowrap;
          }
          .bill-invoice-cell:first-child {
            border-right: 2px solid #000;
          }

          /* ── Bill info ── */
          .bill-info-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 6px;
            font-size: 13px;
            font-weight: 700;
            border-bottom: 1px solid #000;
          }
          .bill-date-row {
            padding: 5px 6px;
            font-size: 13px;
            font-weight: 700;
            border-bottom: 2px solid #000;
          }

          /* ── Items table ── */
          .bill-items-header {
            display: flex;
            padding: 4px 6px;
            font-weight: 900;
            font-size: 12px;
            border-bottom: 1px dotted #000;
          }
          .col-desc { flex: 1; min-width: 0; }
          .col-qty { width: 36px; text-align: center; }
          .col-rate { width: 56px; text-align: right; }
          .col-amt { width: 62px; text-align: right; }

          .bill-item-row {
            display: flex;
            padding: 3px 6px;
            font-size: 12px;
          }
          .bill-item-row .col-desc {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* ── Totals ── */
          .bill-totals-section {
            padding: 0 6px 4px;
          }
          .bill-total-row {
            display: flex;
            justify-content: flex-end;
            font-size: 12px;
            padding: 2px 0;
          }
          .bill-total-row .total-label {
            text-align: right;
            margin-right: 10px;
          }
          .bill-total-row .total-value {
            width: 72px;
            text-align: right;
          }
          .bill-subtotal-row {
            border-top: 1px dotted #000;
            padding-top: 8px;
            margin-top: 6px;
          }
          .bill-net-row {
            border-top: 1px solid #000;
            padding-top: 4px;
            margin-top: 4px;
            font-weight: 900;
            font-size: 15px;
          }

          /* ── Footer ── */
          .bill-footer {
            text-align: center;
            padding: 6px 6px 10px;
            border-top: 2px solid #000;
            font-size: 11px;
            line-height: 1.6;
          }
          .bill-thanks {
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.5px;
            margin-top: 4px;
          }
        `}</style>

        <div className="bill-outer">
          {/* ── Header ── */}
          <div className="bill-header">
            <div className="bill-restaurant-name">{(restaurantName).toUpperCase()}</div>
            {address && address.split(',').map((line, i) => (
              <div key={i} className="bill-address-line">{line.trim()}</div>
            ))}
            {phone && <div className="bill-phone">Mobile : {phone}</div>}
          </div>

          {/* ── TAX INVOICE | PURE VEG ── */}
          <div className="bill-invoice-row">
            <div className="bill-invoice-box">
              <div className="bill-invoice-cell">TAX INVOICE</div>
              <div className="bill-invoice-cell">{vegLabel}</div>
            </div>
          </div>

          {/* ── Bill No / Table No ── */}
          <div className="bill-info-row">
            <span>Bill No. {cleanedBillNumber}</span>
            <span>T. No: {isParcel ? (tokenNumber || 0) : (tableNumber || '-')}</span>
          </div>
          <div className="bill-date-row">
            Date : {formatDate()}
          </div>

          {/* ── Items Header ── */}
          <div className="bill-items-header">
            <span className="col-desc">Description</span>
            <span className="col-qty">QTY</span>
            <span className="col-rate">Rate</span>
            <span className="col-amt">Amount</span>
          </div>

          {/* ── Items ── */}
          <div>
            {items.map((item) => {
              const name = item.portion !== 'single' && isParcel
                ? `${item.productName} (${item.portion})`
                : item.productName;
              return (
                <div key={item.id} className="bill-item-row">
                  <span className="col-desc">{name.toUpperCase()}</span>
                  <span className="col-qty">{item.quantity}</span>
                  <span className="col-rate">{item.unitPrice.toFixed(2)}</span>
                  <span className="col-amt">{(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* ── Totals ── */}
          <div className="bill-totals-section">
            {/* Sub Total */}
            <div className="bill-total-row bill-subtotal-row">
              <span className="total-label">Total RS. :</span>
              <span className="total-value">{subTotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            {discountAmount > 0 && (
              <div className="bill-total-row">
                <span className="total-label">
                  {discountType === 'percentage' ? `Discount (${discountValue}%)` : 'Discount'} :
                </span>
                <span className="total-value">-{discountAmount.toFixed(2)}</span>
              </div>
            )}

            {/* GST — always show labels */}
            {showGST && (
              gstMode === 'igst' ? (
                <div className="bill-total-row">
                  <span className="total-label">IGST @ {gstRate}% :</span>
                  <span className="total-value">{(cgstAmount + sgstAmount).toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="bill-total-row">
                    <span className="total-label">C GST @ {halfRate}% :</span>
                    <span className="total-value">{cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="bill-total-row">
                    <span className="total-label">S GST @ {halfRate}% :</span>
                    <span className="total-value">{sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              )
            )}

            {/* Round Off */}
            {Math.abs(roundOff) > 0.001 && (
              <div className="bill-total-row">
                <span className="total-label">Round Off :</span>
                <span className="total-value">{roundOff.toFixed(2)}</span>
              </div>
            )}

            {/* Net Total */}
            <div className="bill-total-row bill-net-row">
              <span className="total-label">Net Rs. :</span>
              <span className="total-value">{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="bill-footer">
            <div>Composition taxable person.</div>
            {gstin && <div>GSTIN : {gstin}</div>}
            <div>HSN/SAC COde : 9963</div>
            {fssaiNumber && <div>FSSAI LIC No : {fssaiNumber}</div>}
            <div className="bill-thanks">.........THANKS FOR VISIT.........</div>
          </div>
        </div>
      </div>
    );
  }
);

BillTemplate.displayName = 'BillTemplate';
