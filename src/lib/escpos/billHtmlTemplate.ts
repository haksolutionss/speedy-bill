import type { BillData } from './templates';
import type { PaperWidth } from './commands';

/**
 * Paper width mapping for HTML printing via Electron
 * Maps thermal paper sizes to pixel widths at 203 DPI
 */
const PAPER_PX: Record<PaperWidth, number> = {
  '58mm': 384,
  '76mm': 512,
  '80mm': 576,
};

const formatDate = (): string => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
};

const formatAmount = (amount: number): string => amount.toFixed(2);

/**
 * Generates a complete HTML document string for bill printing
 * via Electron's webContents.print() — silent, zero-margin, pixel-perfect.
 *
 * This REPLACES ESC/POS text-based bill generation for the primary path.
 */
export function generateBillHTML(data: BillData, paperWidth: PaperWidth = '80mm'): string {
  const widthPx = PAPER_PX[paperWidth];
  const cleanedBillNumber = data.billNumber.split('-').pop() || data.billNumber;
  const vegLabel = data.isPureVeg !== false ? 'PURE VEG.' : 'NON VEG. / VEG';
  const gstRate = data.items[0]?.gstRate ?? 5;
  const halfRate = gstRate / 2;

  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  // Build items HTML
  const itemsHTML = data.items.map((item) => {
    const name = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;
    const amount = (item.unitPrice * item.quantity).toFixed(2);
    return `
      <tr>
        <td class="col-desc">${name.toUpperCase()}</td>
        <td class="col-qty">${item.quantity}</td>
        <td class="col-rate">${item.unitPrice.toFixed(2)}</td>
        <td class="col-amt">${amount}</td>
      </tr>
      ${item.notes ? `<tr><td colspan="4" class="item-note">${item.notes}</td></tr>` : ''}
    `;
  }).join('');

  // Build address lines
  const addressHTML = data.address
    ? data.address.split(',').map(l => `<div class="addr-line">${l.trim()}</div>`).join('')
    : '';

  // Build discount row
  const discountHTML = data.discountAmount > 0
    ? `<div class="total-row">
        <span class="t-label">${data.discountType === 'percentage' ? `Discount (${data.discountValue}%)` : 'Discount'} :</span>
        <span class="t-value">-${formatAmount(data.discountAmount)}</span>
      </div>`
    : '';

  // Build GST rows — always show labels, show actual amounts (could be 0.00)
  let gstHTML = '';
  if (data.showGST !== false) {
    if (data.gstMode === 'igst') {
      gstHTML = `
        <div class="total-row">
          <span class="t-label">IGST @ ${gstRate}% :</span>
          <span class="t-value">${formatAmount(data.cgstAmount + data.sgstAmount)}</span>
        </div>`;
    } else {
      gstHTML = `
        <div class="total-row">
          <span class="t-label">C GST @ ${halfRate}% :</span>
          <span class="t-value">${formatAmount(data.cgstAmount)}</span>
        </div>
        <div class="total-row">
          <span class="t-label">S GST @ ${halfRate}% :</span>
          <span class="t-value">${formatAmount(data.sgstAmount)}</span>
        </div>`;
    }
  }

  // Round off row
  const roundOffHTML = Math.abs(roundOff) >= 0.01
    ? `<div class="total-row">
        <span class="t-label">Round Off :</span>
        <span class="t-value">${formatAmount(roundOff)}</span>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${paperWidth} auto;
    margin: 0;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    width: ${widthPx}px;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: 'Courier New', 'Courier', monospace;
    font-size: 12px;
    line-height: 1.3;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bill {
    width: 100%;
    border: 2px solid #000;
  }

  /* ── HEADER ── */
  .header {
    text-align: center;
    padding: 8px 6px 6px;
    border-bottom: 2px solid #000;
  }
  .restaurant-name {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }
  .addr-line {
    font-size: 12px;
    line-height: 1.5;
  }
  .phone-line {
    font-size: 13px;
    font-weight: 700;
    margin-top: 3px;
  }

  /* ── TAX INVOICE / VEG BOX ── */
  .invoice-row {
    display: flex;
    justify-content: center;
    padding: 6px 8px;
    border-bottom: 2px solid #000;
  }
  .invoice-box {
    display: flex;
    border: 2px solid #000;
  }
  .invoice-cell {
    padding: 4px 12px;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .invoice-cell:first-child {
    border-right: 2px solid #000;
  }

  /* ── BILL INFO ── */
  .bill-info-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 6px;
    font-size: 13px;
    font-weight: 700;
    border-bottom: 1px solid #000;
  }
  .date-row {
    padding: 5px 6px;
    font-size: 13px;
    font-weight: 700;
    border-bottom: 2px solid #000;
  }

  /* ── ITEMS TABLE ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
  }
  .items-table thead th {
    padding: 4px 6px;
    font-weight: 900;
    font-size: 12px;
    text-align: left;
    border-bottom: 1px dotted #000;
  }
  .items-table thead th.col-qty,
  .items-table thead th.col-rate,
  .items-table thead th.col-amt {
    text-align: right;
  }
  .items-table tbody td {
    padding: 3px 6px;
    font-size: 12px;
    vertical-align: top;
  }
  .col-desc { width: auto; }
  .col-qty { width: 36px; text-align: center; }
  .col-rate { width: 56px; text-align: right; }
  .col-amt { width: 62px; text-align: right; }
  .item-note {
    font-size: 10px;
    padding-left: 16px !important;
    font-style: italic;
  }

  /* ── TOTALS ── */
  .totals-section {
    padding: 0 6px 4px;
  }
  .total-row {
    display: flex;
    justify-content: flex-end;
    font-size: 12px;
    padding: 2px 0;
  }
  .t-label {
    text-align: right;
    margin-right: 10px;
  }
  .t-value {
    width: 72px;
    text-align: right;
  }
  .subtotal-row {
    border-top: 1px dotted #000;
    padding-top: 8px;
    margin-top: 6px;
  }
  .net-row {
    border-top: 1px solid #000;
    padding-top: 4px;
    margin-top: 4px;
    font-weight: 900;
    font-size: 15px;
  }

  /* ── FOOTER ── */
  .footer {
    text-align: center;
    padding: 6px 6px 10px;
    border-top: 2px solid #000;
    font-size: 11px;
    line-height: 1.6;
  }
  .thanks {
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="bill">

  <!-- HEADER -->
  <div class="header">
    <div class="restaurant-name">${(data.restaurantName || 'RESTAURANT').toUpperCase()}</div>
    ${addressHTML}
    ${data.phone ? `<div class="phone-line">Mobile : ${data.phone}</div>` : ''}
  </div>

  <!-- TAX INVOICE | PURE VEG BOX -->
  <div class="invoice-row">
    <div class="invoice-box">
      <div class="invoice-cell">TAX INVOICE</div>
      <div class="invoice-cell">${vegLabel}</div>
    </div>
  </div>

  <!-- BILL INFO -->
  <div class="bill-info-row">
    <span>Bill No. ${cleanedBillNumber}</span>
    <span>T. No: ${data.isParcel ? (data.tokenNumber || 0) : (data.tableNumber || '-')}</span>
  </div>
  <div class="date-row">Date : ${formatDate()}</div>

  <!-- ITEMS TABLE -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="col-desc">Description</th>
        <th class="col-qty">QTY</th>
        <th class="col-rate">Rate</th>
        <th class="col-amt">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-section">
    <div class="total-row subtotal-row">
      <span class="t-label">Total RS. :</span>
      <span class="t-value">${formatAmount(data.subTotal)}</span>
    </div>
    ${discountHTML}
    ${gstHTML}
    ${roundOffHTML}
    <div class="total-row net-row">
      <span class="t-label">Net Rs. :</span>
      <span class="t-value">${formatAmount(data.finalAmount)}</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>Composition taxable person.</div>
    ${data.gstin ? `<div>GSTIN : ${data.gstin}</div>` : ''}
    <div>HSN/SAC COde : 9963</div>
    ${data.fssaiNumber ? `<div>FSSAI LIC No : ${data.fssaiNumber}</div>` : ''}
    <div class="thanks">.........THANKS FOR VISIT.........</div>
  </div>

</div>
</body>
</html>`;
}
