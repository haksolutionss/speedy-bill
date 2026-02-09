import type { BillData } from './templates';

// ═══════════════════════════════════════════════════════════════
// POSYTUDE YHD-8330 THERMAL PRINTER SPECIFICATIONS
// ═══════════════════════════════════════════════════════════════
const PRINTER_DPI = 203;
const PRINTABLE_MM = 72;  // 80mm paper, ~72mm printable
const CANVAS_WIDTH = Math.floor((PRINTABLE_MM / 25.4) * PRINTER_DPI);  // ≈ 576 px

// High-density rendering for sharp thermal output
const SCALE = 2;
const SCALED_WIDTH = CANVAS_WIDTH * SCALE;

// Thermal-safe typography
const OUTER_BORDER_WIDTH = 2; // looks good on 80mm thermal

const FONT_FAMILY = '"Courier New", monospace';

const FONT_NORMAL = `20px ${FONT_FAMILY}`;
const FONT_BOLD = `bold 20px ${FONT_FAMILY}`;
const FONT_HEADER = `bold 20px ${FONT_FAMILY}`;
const FONT_TITLE = `bold 22px ${FONT_FAMILY}`;



// Spacing optimized for thermal printer bleed prevention
const LINE_HEIGHT = 20;
const SECTION_GAP = 12;
const BORDER_WIDTH = 2;
const THIN_BORDER_WIDTH = 1;
const PADDING = 14;

/**
 * Render bill to canvas with thermal printer optimization
 * - Fixed 576px width (72mm @ 203 DPI)
 * - 2× scale rendering for sharp text
 * - Bold fonts and thick borders
 * - Proper spacing to prevent thermal bleed
 */
export function renderBillToCanvas(data: BillData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Calculate height based on content
  const estimatedHeight = calculateBillHeight(data);

  // Set physical canvas size (2× for crisp rendering)
  canvas.width = SCALED_WIDTH;
  canvas.height = estimatedHeight * SCALE;

  // Scale the context for 2× rendering
  ctx.scale(SCALE, SCALE);

  ctx.imageSmoothingEnabled = false;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, estimatedHeight);

  // Black text/lines
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';

  let y = PADDING;

  // ═══ HEADER SECTION ═══
  y = drawHeader(ctx, data, y);
  y += SECTION_GAP;

  // ═══ TAX INVOICE BOX ═══
  y = drawTaxInvoiceBox(ctx, data, y);
  y += SECTION_GAP;

  // ═══ BILL INFO ═══
  y = drawBillInfo(ctx, data, y);
  y += SECTION_GAP;

  // ═══ ITEMS TABLE ═══
  y = drawItemsTable(ctx, data, y);
  y += SECTION_GAP;

  // ═══ TOTALS ═══
  y = drawTotals(ctx, data, y);
  y += SECTION_GAP;

  // ═══ FOOTER ═══
  y = drawFooter(ctx, data, y);
  y += PADDING;

  // Draw outer border (context is already scaled)
  drawOuterBorder(ctx, y);

  return canvas;
}


function drawOuterBorder(ctx: CanvasRenderingContext2D, height: number) {
  ctx.save();
  ctx.lineWidth = OUTER_BORDER_WIDTH;
  ctx.strokeStyle = '#000';

  const half = OUTER_BORDER_WIDTH / 2;
  ctx.strokeRect(
    half,
    half,
    CANVAS_WIDTH - OUTER_BORDER_WIDTH,
    height - OUTER_BORDER_WIDTH
  );

  ctx.restore();
}

/**
 * Calculate estimated bill height for canvas allocation
 */
function calculateBillHeight(data: BillData): number {
  let height = PADDING * 2;

  // Header
  height += 100;

  // Tax invoice box
  height += 80;

  // Bill info
  height += 120;

  // Items header
  height += 60;

  // Items (estimate 2 lines per item for wrapping)
  height += data.items.length * LINE_HEIGHT * 2;

  // Totals section
  height += 200;

  // Footer
  height += 50;

  return height;
}

/**
 * Draw restaurant header with name, address, phone
 */
function drawHeader(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;


  // Restaurant name
  ctx.font = FONT_TITLE;
  ctx.textAlign = 'center';
  ctx.fillText(
    (data.restaurantName || 'RESTAURANT').toUpperCase(),
    CANVAS_WIDTH / 2,
    y
  );
  y += LINE_HEIGHT;

  // Address lines
  ctx.font = FONT_NORMAL;
  if (data.address) {
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => {
      ctx.fillText(line, CANVAS_WIDTH / 2, y);
      y += LINE_HEIGHT;
    });
  }

  // Phone number
  if (data.phone) {
    ctx.font = FONT_BOLD;
    ctx.fillText(`Mobile : ${data.phone}`, CANVAS_WIDTH / 2, y);
    y += LINE_HEIGHT;
  }

  // Bottom border
  drawThickLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT / 2;

  return y;
}

/**
 * Draw TAX INVOICE and VEG type boxes
 */
function drawTaxInvoiceBox(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  const boxHeight = 35;
  const boxY = y;

  // Outer border
  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeRect(PADDING, boxY, CANVAS_WIDTH - PADDING * 2, boxHeight);

  // Center divider
  ctx.lineWidth = THIN_BORDER_WIDTH;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, boxY);
  ctx.lineTo(CANVAS_WIDTH / 2, boxY + boxHeight);
  ctx.stroke();

  // TAX INVOICE text
  ctx.font = FONT_HEADER;
  ctx.textAlign = 'center';
  ctx.fillText('TAX INVOICE', CANVAS_WIDTH / 4, boxY + 25);

  // VEG type text
  const vegText = 'PURE VEG';
  ctx.fillText(vegText, (CANVAS_WIDTH / 4) * 3, boxY + 25);

  y += boxHeight + SECTION_GAP;

  return y;
}

/**
 * Draw bill number, table number, date
 */
function drawBillInfo(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  // Top border
  drawThickLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Bill number and table number
  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  const tableNo = data.isParcel
    ? `Token: ${data.tokenNumber || '-'}`
    : `T. No: ${data.tableNumber || '-'}`;

  ctx.fillText(`Bill No: ${data.billNumber}`, PADDING, y);
  ctx.textAlign = 'right';
  ctx.fillText(tableNo, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Separator
  drawThinLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Date
  ctx.textAlign = 'left';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  ctx.fillText(`Date:   ${dateStr}`, PADDING, y);
  y += LINE_HEIGHT;

  // Bottom border
  drawThickLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT / 2;

  return y;
}

/**
 * Draw items table – thermal / Hotel Sunrise style
 */
function drawItemsTable(
  ctx: CanvasRenderingContext2D,
  data: BillData,
  startY: number
): number {
  let y = startY;

  // Fixed column X positions (DO NOT CALCULATE)
  const descX = PADDING;
  const qtyX = PADDING + 300;
  const rateX = PADDING + 380;
  const amtX = CANVAS_WIDTH - PADDING;

  // Header
  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  ctx.fillText('Description', descX, y);

  ctx.textAlign = 'right';
  ctx.fillText('QTY', qtyX, y);
  ctx.fillText('Rate', rateX, y);
  ctx.fillText('Amount', amtX, y);

  y += LINE_HEIGHT;

  // Dotted line
  drawDottedLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Items
  ctx.font = FONT_NORMAL;

  for (const item of data.items) {
    const name =
      item.portion !== 'single' && data.isParcel
        ? `${item.productName} (${item.portion})`
        : item.productName;

    const amount = (item.unitPrice * item.quantity).toFixed(2);

    ctx.textAlign = 'left';
    ctx.fillText(name, descX, y);

    ctx.textAlign = 'right';
    ctx.fillText(String(item.quantity), qtyX, y);
    ctx.fillText(item.unitPrice.toFixed(2), rateX, y);
    ctx.fillText(amount, amtX, y);

    y += LINE_HEIGHT;

    // Notes (indented, same font)
    if (item.notes) {
      ctx.textAlign = 'left';
      ctx.fillText(`>> ${item.notes}`, descX + 12, y);
      y += LINE_HEIGHT;
    }
  }

  return y + LINE_HEIGHT / 2;
}

/**
 * Draw totals section – Sunrise style
 */
function drawTotals(
  ctx: CanvasRenderingContext2D,
  data: BillData,
  startY: number
): number {
  let y = startY;

  const labelX = PADDING + 260;
  const valueX = CANVAS_WIDTH - PADDING;

  // Top dotted separator
  drawDottedLine(ctx, labelX, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  ctx.font = FONT_NORMAL;

  // Total
  ctx.textAlign = 'left';
  ctx.fillText('Total RS. :', labelX, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.subTotal.toFixed(2), valueX, y);
  y += LINE_HEIGHT;

  // Discount
  if (data.discountAmount > 0) {
    const label =
      data.discountType === 'percentage'
        ? `Discount (${data.discountValue}%) :`
        : 'Discount :';

    ctx.textAlign = 'left';
    ctx.fillText(label, labelX, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-${data.discountAmount.toFixed(2)}`, valueX, y);
    y += LINE_HEIGHT;
  }

  // GST
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate ?? 5;
    const half = gstRate / 2;

    if (data.gstMode === 'igst') {
      ctx.textAlign = 'left';
      ctx.fillText(`IGST @ ${gstRate}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(
        (data.cgstAmount + data.sgstAmount).toFixed(2),
        valueX,
        y
      );
      y += LINE_HEIGHT;
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(`CGST @ ${half}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.cgstAmount.toFixed(2), valueX, y);
      y += LINE_HEIGHT;

      ctx.textAlign = 'left';
      ctx.fillText(`SGST @ ${half}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.sgstAmount.toFixed(2), valueX, y);
      y += LINE_HEIGHT;
    }
  }

  // Round off
  const calc =
    data.subTotal -
    data.discountAmount +
    data.cgstAmount +
    data.sgstAmount;

  const roundOff = data.finalAmount - calc;

  if (Math.abs(roundOff) >= 0.01) {
    ctx.textAlign = 'left';
    ctx.fillText('Round Off :', labelX, y);
    ctx.textAlign = 'right';
    ctx.fillText(roundOff.toFixed(2), valueX, y);
    y += LINE_HEIGHT;
  }

  // Bottom dotted line
  drawDottedLine(ctx, labelX, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Net total
  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  ctx.fillText('Net Rs. :', labelX, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.finalAmount.toFixed(2), valueX, y);
  y += LINE_HEIGHT;

  // Bottom solid line
  drawThickLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);

  return y + LINE_HEIGHT / 2;
}


/**
 * Draw footer with FSSAI, GSTIN, thank you message
 */
function drawFooter(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  ctx.font = FONT_NORMAL;
  ctx.textAlign = 'center';

  if (data.fssaiNumber) {
    ctx.fillText(`FSSAI LIC No : ${data.fssaiNumber}`, CANVAS_WIDTH / 2, y);
    y += LINE_HEIGHT;
  }

  if (data.gstin) {
    ctx.fillText(`GSTIN : ${data.gstin}`, CANVAS_WIDTH / 2, y);
    y += LINE_HEIGHT;
  }

  y += LINE_HEIGHT / 2;

  // Thank you message
  ctx.font = FONT_BOLD;
  ctx.fillText('.........THANKS FOR VISIT.........', CANVAS_WIDTH / 2, y);
  y += LINE_HEIGHT;

  return y;
}

// ═══════════════════════════════════════════════════════════════
// DRAWING UTILITIES
// ═══════════════════════════════════════════════════════════════

function drawThickLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.lineWidth = BORDER_WIDTH;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawThinLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.lineWidth = THIN_BORDER_WIDTH;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawDottedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}