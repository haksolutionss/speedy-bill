import { forwardRef } from 'react';
import type { CartItem } from '@/store/uiStore';

interface KOTTemplateProps {
  tableNumber?: string;
  tokenNumber?: number;
  items: CartItem[];
  billNumber?: string;
  kotNumber?: number;
  kotNumberFormatted?: string; // Formatted like "01", "02"
  isParcel?: boolean;
}

export const KOTTemplate = forwardRef<HTMLDivElement, KOTTemplateProps>(
  ({ tableNumber, tokenNumber, items, billNumber, kotNumber = 1, kotNumberFormatted, isParcel }, ref) => {
    const displayKotNumber = kotNumberFormatted || kotNumber.toString().padStart(2, '0');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
      <div ref={ref} className="kot-print-template">
        <style>{`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            .kot-print-template,
            .kot-print-template * {
              visibility: visible;
            }
            .kot-print-template {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              background: white !important;
              color: black !important;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              padding: 4mm;
            }
          }
          .kot-print-template {
            width: 80mm;
            background: white;
            color: black;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 4mm;
          }
          .kot-header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .kot-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .kot-type {
            font-size: 16px;
            padding: 4px;
          }
          .kot-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .kot-table-number {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 8px 0;
            padding: 8px;
            border: 2px solid #000;
          }
          .kot-items {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 8px 0;
          }
          .kot-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
          }
          .kot-item:last-child {
            border-bottom: none;
          }
          .kot-item-name {
            flex: 1;
            font-weight: bold;
          }
          .kot-item-qty {
            font-size: 16px;
            font-weight: bold;
            min-width: 40px;
            text-align: right;
          }
          .kot-item-portion {
            font-size: 10px;
            color: #666;
          }
          .kot-item-notes {
            font-size: 11px;
            font-style: italic;
            padding-left: 8px;
            color: #333;
            margin-top: 2px;
            background: #f5f5f5;
            padding: 4px 8px;
            border-left: 3px solid #333;
          }
          .kot-footer {
            text-align: center;
            margin-top: 8px;
            font-size: 10px;
          }
          .kot-count {
            text-align: center;
            font-weight: bold;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #000;
          }
        `}</style>

        {isParcel && (
          <div className="kot-header">
            <div className="kot-type">PARCEL</div>
          </div>
        )}

        <div className="kot-info">
          {isParcel ? `TOKEN #${tokenNumber}` : `TABLE: ${tableNumber}`}
          <div className="kot-info">
            <span>KOT #: {displayKotNumber}</span>
            {billNumber && <span>Bill: {billNumber}</span>}
          </div>
        </div>

        <div className="kot-info">
          <span>Date: {dateStr}</span>
          <span>Time: {timeStr}</span>
        </div>


        <div className="kot-items">
          {items.map((item, index) => (
            <div key={item.id}>
              <div className="kot-item">
                <div className="kot-item-name">
                  {index + 1}. {item.productName}
                  {item.portion !== 'single' && (
                    <span className="kot-item-portion"> ({item.portion})</span>
                  )}
                </div>
                <div className="kot-item-qty">{item.quantity}</div>
              </div>
              {item.notes && (
                <div className="kot-item-notes">📝 {item.notes}</div>
              )}
            </div>
          ))}
        </div>

        <div className="kot-count">
          Total Items: {items.reduce((sum, item) => sum + item.quantity, 0)}
        </div>
      </div>
    );
  }
);

KOTTemplate.displayName = 'KOTTemplate';
