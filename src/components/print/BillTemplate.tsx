import { forwardRef } from 'react';
import type { CartItem } from '@/data/mockData';

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
  restaurantAddress?: string;
  gstin?: string;
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
    restaurantName = "Restaurant Name",
    restaurantAddress = "123 Main Street, City - 400001",
    gstin = "27XXXXX1234X1ZX"
  }, ref) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Group items by GST rate for tax breakdown
    const gstBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number }> = {};
    items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemDiscount = discountAmount > 0 ? (itemTotal / subTotal) * discountAmount : 0;
      const taxableAmount = itemTotal - itemDiscount;
      const gst = taxableAmount * (item.gstRate / 100);
      
      if (!gstBreakdown[item.gstRate]) {
        gstBreakdown[item.gstRate] = { taxableAmount: 0, cgst: 0, sgst: 0 };
      }
      gstBreakdown[item.gstRate].taxableAmount += taxableAmount;
      gstBreakdown[item.gstRate].cgst += gst / 2;
      gstBreakdown[item.gstRate].sgst += gst / 2;
    });

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
            border-bottom: 1px dashed #000;
            margin-bottom: 8px;
          }
          .bill-items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding: 4px 0;
            border-bottom: 1px solid #000;
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
            border-bottom: 1px dotted #ccc;
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
          .bill-totals {
            padding: 4px 0;
          }
          .bill-total-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .bill-total-row.final {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 4px;
          }
          .bill-gst-breakdown {
            font-size: 9px;
            margin-top: 8px;
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
            margin-bottom: 4px;
          }
        `}</style>

        <div className="bill-header">
          <div className="bill-restaurant-name">{restaurantName}</div>
          <div className="bill-address">{restaurantAddress}</div>
          <div className="bill-gstin">GSTIN: {gstin}</div>
          <div className="bill-title">*** TAX INVOICE ***</div>
        </div>

        <div className="bill-info">
          <span>Bill No: {billNumber}</span>
          <span>Date: {dateStr}</span>
        </div>
        <div className="bill-info">
          <span>Time: {timeStr}</span>
          {coverCount && <span>Covers: {coverCount}</span>}
        </div>

        <div className="bill-table-info">
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
                {item.portion !== 'single' && ` (${item.portion})`}
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
            <span>₹{subTotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="bill-total-row">
              <span>
                Discount
                {discountType === 'percentage' ? ` (${discountValue}%)` : ''}
                {discountReason && ` - ${discountReason}`}:
              </span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="bill-total-row">
            <span>CGST:</span>
            <span>₹{cgstAmount.toFixed(2)}</span>
          </div>
          <div className="bill-total-row">
            <span>SGST:</span>
            <span>₹{sgstAmount.toFixed(2)}</span>
          </div>
          <div className="bill-total-row final">
            <span>GRAND TOTAL:</span>
            <span>₹{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        {Object.keys(gstBreakdown).length > 0 && (
          <div className="bill-gst-breakdown">
            <div className="bill-gst-header">
              <span>GST%</span>
              <span>Taxable</span>
              <span>CGST</span>
              <span>SGST</span>
            </div>
            {Object.entries(gstBreakdown).map(([rate, data]) => (
              <div key={rate} className="bill-gst-row">
                <span>{rate}%</span>
                <span>{data.taxableAmount.toFixed(2)}</span>
                <span>{data.cgst.toFixed(2)}</span>
                <span>{data.sgst.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {paymentMethod && (
          <div className="bill-payment">
            <strong>PAID BY: {paymentMethod.toUpperCase()}</strong>
          </div>
        )}

        <div className="bill-footer">
          <div className="bill-thank-you">Thank You! Visit Again!</div>
          <div>--------------------------------</div>
          <div>This is a computer generated invoice</div>
          <div>E&OE</div>
        </div>
      </div>
    );
  }
);

BillTemplate.displayName = 'BillTemplate';
