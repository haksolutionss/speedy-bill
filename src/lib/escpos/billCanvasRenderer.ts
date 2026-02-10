import type { BillData } from './templates';

const PRINTER_DPI = 203;
const PRINTABLE_MM = 72;
const CANVAS_WIDTH = Math.floor((PRINTABLE_MM / 25.4) * PRINTER_DPI);

const FONT_FAMILY = '"Courier New", monospace';

const FONT_SMALL = `22px ${FONT_FAMILY}`;
const FONT_NORMAL = `22px ${FONT_FAMILY}`;
const FONT_BOLD = `600 26px ${FONT_FAMILY}`;
const FONT_BOLD_TABLE = `500 24px ${FONT_FAMILY}`;
const FONT_BOLD_MEDIUM = `600 28px ${FONT_FAMILY}`;
const FONT_HEADER = `700 32px ${FONT_FAMILY}`;

const LINE_HEIGHT = 25;
const PADDING = 16;
const OUTER_BORDER = 3;

export function renderBillToCanvas(data: BillData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const estimatedHeight = calculateBillHeight(data);

  canvas.width = CANVAS_WIDTH;
  canvas.height = estimatedHeight;

  ctx.imageSmoothingEnabled = true;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, estimatedHeight);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';

  drawOuterBorder(ctx, estimatedHeight);

  let y = PADDING + 8;

  y = drawHeader(ctx, data, y);
  y = drawTaxInvoiceBox(ctx, data, y);
  y = drawBillInfo(ctx, data, y);
  y = drawItemsTable(ctx, data, y);
  y = drawTotals(ctx, data, y);
  y = drawFooter(ctx, data, y);

  return canvas;
}

function calculateBillHeight(data: BillData): number {
  let height = PADDING * 2;
  height += 130; // header
  height += 45;  // tax invoice box
  height += 90;  // bill info
  height += 40;  // items header
  height += data.items.length * LINE_HEIGHT;
  height += 220; // totals (extra for composition footer)
  height += 120; // footer
  return height;
}

function drawOuterBorder(ctx: CanvasRenderingContext2D, height: number) {
  ctx.save();
  ctx.lineWidth = OUTER_BORDER;
  ctx.strokeStyle = '#000';
  const half = OUTER_BORDER / 2;
  ctx.strokeRect(half, half, CANVAS_WIDTH - OUTER_BORDER, height - OUTER_BORDER);
  ctx.restore();
}

function drawHeader(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY + 15;

  ctx.font = FONT_HEADER;
  ctx.textAlign = 'center';
  ctx.fillText((data.restaurantName || 'RESTAURANT').toUpperCase(), CANVAS_WIDTH / 2, y);
  y += LINE_HEIGHT + 2;

  ctx.font = FONT_SMALL;
  if (data.address) {
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => {
      ctx.fillText(line, CANVAS_WIDTH / 2, y);
      y += LINE_HEIGHT - 2;
    });
  }

  ctx.font = FONT_BOLD;
  if (data.phone) {
    ctx.fillText(`Mobile : ${data.phone}`, CANVAS_WIDTH / 2, y);
  }
  y += LINE_HEIGHT + 4;

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  y += 12;

  return y;
}

function drawTaxInvoiceBox(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  const boxHeight = 32;
  const boxY = y;

  ctx.lineWidth = 2;
  ctx.strokeRect(PADDING, boxY, CANVAS_WIDTH - PADDING * 2, boxHeight);

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, boxY);
  ctx.lineTo(CANVAS_WIDTH / 2, boxY + boxHeight);
  ctx.stroke();

  ctx.font = FONT_BOLD_MEDIUM;
  ctx.textAlign = 'center';
  ctx.fillText('TAX INVOICE', CANVAS_WIDTH / 4, boxY + 22);

  const vegText = data.isPureVeg !== false ? 'PURE VEG.' : 'NON VEG./VEG';
  ctx.fillText(vegText, (CANVAS_WIDTH / 4) * 3, boxY + 22);

  y += boxHeight + 12;

  return y;
}

function drawBillInfo(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  y += LINE_HEIGHT;

  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  const cleaned = data.billNumber.split('-').pop();

  ctx.fillText(`Bill No. ${cleaned}`, PADDING, y);

  ctx.textAlign = 'right';
  const tableText = data.isParcel
    ? `Token: ${data.tokenNumber || '-'}`
    : `T. No: ${data.tableNumber || '-'}`;
  ctx.fillText(tableText, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT + 2;

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  y += LINE_HEIGHT;

  ctx.textAlign = 'left';
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  ctx.fillText(`Date :  ${dateStr}`, PADDING, y);
  y += LINE_HEIGHT + 2;

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  y += LINE_HEIGHT - 2;

  return y;
}

function drawItemsTable(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  const descX = PADDING;
  const qtyX = CANVAS_WIDTH - 220;
  const rateX = CANVAS_WIDTH - 140;
  const amtX = CANVAS_WIDTH - PADDING;

  ctx.font = FONT_BOLD_TABLE;
  ctx.textAlign = 'left';
  ctx.fillText('Description', descX, y);

  ctx.textAlign = 'right';
  ctx.fillText('QTY', qtyX, y);
  ctx.fillText('Rate', rateX, y);
  ctx.fillText('Amount', amtX, y);

  y += LINE_HEIGHT;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  ctx.restore();
  y += LINE_HEIGHT - 2;

  ctx.font = FONT_NORMAL;

  for (const item of data.items) {
    const name = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const amount = (item.unitPrice * item.quantity).toFixed(2);

    ctx.textAlign = 'left';
    ctx.fillText(name.toUpperCase(), descX, y);

    ctx.textAlign = 'right';
    ctx.fillText(String(item.quantity), qtyX, y);
    ctx.fillText(item.unitPrice.toFixed(2), rateX, y);
    ctx.fillText(amount, amtX, y);

    y += LINE_HEIGHT;

    if (item.notes) {
      ctx.textAlign = 'left';
      ctx.fillText(`  ${item.notes}`, descX + 10, y);
      y += LINE_HEIGHT;
    }
  }

  y += 8;

  return y;
}

function drawTotals(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  const labelX = CANVAS_WIDTH - 230;
  const valueX = CANVAS_WIDTH - PADDING;

  // Dotted separator
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(labelX, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  ctx.restore();
  y += LINE_HEIGHT;

  ctx.font = FONT_NORMAL;

  // Sub total
  ctx.textAlign = 'left';
  ctx.fillText('Total RS. :', labelX, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.subTotal.toFixed(2), valueX, y);
  y += LINE_HEIGHT;

  // Discount
  if (data.discountAmount > 0) {
    const label = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';

    ctx.textAlign = 'left';
    ctx.fillText(label, labelX, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-${data.discountAmount.toFixed(2)}`, valueX, y);
    y += LINE_HEIGHT;
  }

  // GST — always show labels
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate ?? 5;
    const half = gstRate / 2;

    if (data.gstMode === 'igst') {
      ctx.textAlign = 'left';
      ctx.fillText(`IGST @ ${gstRate}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText((data.cgstAmount + data.sgstAmount).toFixed(2), valueX, y);
      y += LINE_HEIGHT;
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(`C GST @ ${half}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.cgstAmount.toFixed(2), valueX, y);
      y += LINE_HEIGHT;

      ctx.textAlign = 'left';
      ctx.fillText(`S GST @ ${half}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.sgstAmount.toFixed(2), valueX, y);
      y += LINE_HEIGHT;
    }
  }

  // Round off
  const calc = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calc;

  if (Math.abs(roundOff) >= 0.01) {
    ctx.textAlign = 'left';
    ctx.fillText('Round Off :', labelX, y);
    ctx.textAlign = 'right';
    ctx.fillText(roundOff.toFixed(2), valueX, y);
    y += LINE_HEIGHT;
  }

  // Dotted separator before net
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(labelX, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();
  ctx.restore();
  y += LINE_HEIGHT;

  // Net total
  ctx.font = FONT_BOLD_MEDIUM;
  ctx.textAlign = 'left';
  ctx.fillText('Net Rs. :', labelX, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.finalAmount.toFixed(2), valueX, y);
  y += LINE_HEIGHT + 4;

  // Solid line
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - PADDING, y);
  ctx.stroke();

  return y + LINE_HEIGHT / 2;
}

function drawFooter(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY + 15;

  ctx.font = FONT_SMALL;
  ctx.textAlign = 'center';

  // Composition taxable person
  ctx.fillText('Composition taxable person.', CANVAS_WIDTH / 2, y);
  y += LINE_HEIGHT;

  if (data.gstin) {
    ctx.fillText(`GSTIN : ${data.gstin}`, CANVAS_WIDTH / 2, y);
    y += LINE_HEIGHT;
  }

  ctx.fillText('HSN/SAC COde : 9963', CANVAS_WIDTH / 2, y);
  y += LINE_HEIGHT;

  if (data.fssaiNumber) {
    ctx.fillText(`FSSAI LIC No : ${data.fssaiNumber}`, CANVAS_WIDTH / 2, y);
    y += LINE_HEIGHT;
  }

  ctx.font = FONT_SMALL;
  ctx.fillText('.........THANKS FOR VISIT.........', CANVAS_WIDTH / 2, y);
  y += LINE_HEIGHT;

  return y;
}
