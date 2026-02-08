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

// Helper function to break text into lines
const breakTextIntoLines = (text: string, maxWordsPerLine: number = 3): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];

  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    const lineWords = words.slice(i, i + maxWordsPerLine);
    lines.push(lineWords.join(' '));
  }

  return lines;
};

// Format date for printing
const formatDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Format time for printing
const formatTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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
    paymentMethod,
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

    // Calculate round off
    const calculatedTotal = subTotal - discountAmount + cgstAmount + sgstAmount;
    const roundOff = finalAmount - calculatedTotal;

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
            }
          }
          .bill-print-template {
            width: 80mm;
            background: white;
            color: black;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.4;
            padding: 3mm;
          }
          .bill-header {
            text-align: center;
            margin-bottom: 8px;
          }
          .bill-restaurant-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .bill-address {
            font-size: 10px;
            margin: 2px 0;
          }
          .bill-divider {
            border: none;
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .bill-tax-invoice {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin: 8px 0;
          }
          .pure-veg-text {
            color: #228B22;
            margin-left: 16px;
          }
          .bill-info-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin: 2px 0;
          }
          .bill-items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 10px;
            padding: 4px 0;
          }
          .bill-items-header .col-desc { flex: 2; }
          .bill-items-header .col-qty { width: 30px; text-align: center; }
          .bill-items-header .col-rate-amt { width: 80px; text-align: right; }
          .bill-item-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            padding: 2px 0;
          }
          .bill-item-row .col-desc { flex: 2; word-break: break-word; }
          .bill-item-row .col-qty { width: 30px; text-align: center; }
          .bill-item-row .col-rate-amt { width: 80px; text-align: right; }
          .bill-totals {
            margin-top: 8px;
          }
          .bill-total-row {
            display: flex;
            justify-content: flex-end;
            font-size: 10px;
            margin: 2px 0;
          }
          .bill-total-row span:first-child {
            margin-right: 16px;
          }
          .bill-total-row.grand-total {
            font-weight: bold;
            font-size: 12px;
          }
          .bill-footer {
            text-align: center;
            margin-top: 16px;
            font-size: 10px;
          }
          .bill-thank-you {
            font-weight: bold;
            font-size: 11px;
            margin: 12px 0;
            letter-spacing: 1px;
          }
          .bill-regulatory {
            font-size: 9px;
            margin-top: 8px;
          }
        `}</style>

        {/* Header */}
        <div className="bill-header">
          <div className="bill-restaurant-name">{restaurantName}</div>
          {address && <div className="bill-address">{address}</div>}
          {phone && <div className="bill-address">Mobile: {phone}</div>}
        </div>

        <hr className="bill-divider" />

        {/* Tax Invoice Header with Pure Veg */}
        <div className="bill-tax-invoice">
          TAX INVOICE
          {isPureVeg && <span className="pure-veg-text">PURE VEG</span>}
        </div>

        {/* Bill Info */}
        <div className="bill-info-row">
          <span>Bill No. {billNumber}</span>
          <span>T. No: {isParcel ? (tokenNumber || 0) : (tableNumber || '-')}</span>
        </div>
        <div className="bill-info-row">
          <span>Date: {formatDate()}</span>
          <span>Time: {formatTime()}</span>
        </div>

        <hr className="bill-divider" />

        {/* Items Header */}
        <div className="bill-items-header">
          <span className="col-desc">Description</span>
          <span className="col-qty">QTY</span>
          <span className="col-rate-amt">Rate Amount</span>
        </div>

        <hr className="bill-divider" />

        {/* Items */}
        {items.map((item) => {
          const itemName = item.portion !== 'single' && isParcel
            ? `${item.productName} (${item.portion})`
            : item.productName;

          const itemLines = breakTextIntoLines(itemName, 3);

          return (
            <div key={item.id}>
              <div className="bill-item-row">
                <span className="col-desc">{itemLines[0]}</span>
                <span className="col-qty">{item.quantity}</span>
                <span className="col-rate-amt">
                  {item.unitPrice.toFixed(2)}    {(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
              {/* Remaining lines of item name */}
              {itemLines.slice(1).map((line, idx) => (
                <div key={idx} className="bill-item-row">
                  <span className="col-desc">{line}</span>
                  <span className="col-qty"></span>
                  <span className="col-rate-amt"></span>
                </div>
              ))}
            </div>
          );
        })}

        <hr className="bill-divider" />

        {/* Totals - Right aligned */}
        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Total RS.:</span>
            <span>{subTotal.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="bill-total-row">
              <span>
                Discount{discountType === 'percentage' ? ` (${discountValue}%)` : ''}:
              </span>
              <span>-{discountAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Tax rows - only if showGST is true */}
          {showGST && (
            gstMode === 'igst' ? (
              <div className="bill-total-row">
                <span>IGST @ {items[0]?.gstRate || 5}%:</span>
                <span>{(cgstAmount + sgstAmount).toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="bill-total-row">
                  <span>CGST @ {(items[0]?.gstRate || 5) / 2}%:</span>
                  <span>{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="bill-total-row">
                  <span>SGST @ {(items[0]?.gstRate || 5) / 2}%:</span>
                  <span>{sgstAmount.toFixed(2)}</span>
                </div>
              </>
            )
          )}

          {/* Round off */}
          {Math.abs(roundOff) > 0.01 && (
            <div className="bill-total-row">
              <span>Round Off:</span>
              <span>{Math.abs(roundOff).toFixed(2)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="bill-total-row grand-total">
            <span>Net Rs.:</span>
            <span>{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        <hr className="bill-divider" />

        {/* Footer */}
        <div className="bill-footer">
          {/* Regulatory Information */}
          {fssaiNumber && (
            <div className="bill-regulatory">FASSAI LIC No: {fssaiNumber}</div>
          )}
          {gstin && (
            <div className="bill-regulatory">GSTIN: {gstin}</div>
          )}

          {/* Thank You Message */}
          <div className="bill-thank-you">
            .........THANKS FOR VISIT........
          </div>
        </div>
      </div>
    );
  }
);

BillTemplate.displayName = 'BillTemplate';