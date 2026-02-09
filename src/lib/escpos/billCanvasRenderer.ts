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
const OUTER_BORDER_WIDTH = 4; // looks good on 80mm thermal

const FONT_FAMILY = '"Courier New", Courier, monospace';

const FONT_NORMAL = `28px ${FONT_FAMILY}`;
const FONT_BOLD = `bold 30px ${FONT_FAMILY}`;
const FONT_HEADER = `bold 32px ${FONT_FAMILY}`;
const FONT_TITLE = `bold 36px ${FONT_FAMILY}`;


// Spacing optimized for thermal printer bleed prevention
const LINE_HEIGHT = 25;
const SECTION_GAP = 20;
const BORDER_WIDTH = 3;
const THIN_BORDER_WIDTH = 2;
const PADDING = 20;

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

  // Set physical canvas size (2× for crisp rendering)
  canvas.width = SCALED_WIDTH;

  // Calculate height based on content
  const estimatedHeight = calculateBillHeight(data);
  canvas.height = estimatedHeight * SCALE;

  // Apply scaling transform
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

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = SCALED_WIDTH;
  finalCanvas.height = y * SCALE;

  const finalCtx = finalCanvas.getContext('2d')!;

  // draw content
  finalCtx.drawImage(canvas, 0, 0);

  // IMPORTANT: scale again for drawing border
  finalCtx.scale(SCALE, SCALE);

  // draw outer border
  drawOuterBorder(finalCtx, y);

  return finalCanvas;

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
  height += 100;

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

  // Top border
  drawThickLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

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

  const boxHeight = 70;
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
  ctx.fillText('TAX INVOICE', CANVAS_WIDTH / 4, boxY + 45);

  // VEG type text
  const vegText = 'PURE VEG';
  ctx.fillText(vegText, (CANVAS_WIDTH / 4) * 3, boxY + 45);

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

  ctx.fillText(`Bill No. ${data.billNumber}`, PADDING, y);
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
 * Draw items table with proper column alignment
 */
function drawItemsTable(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  // Column widths
  const descWidth = 260;
  const qtyWidth = 80;
  const rateWidth = 110;
  const amtWidth = CANVAS_WIDTH - PADDING * 2 - descWidth - qtyWidth - rateWidth;

  // Table header
  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  ctx.fillText('Description', PADDING, y);
  ctx.textAlign = 'right';
  ctx.fillText('QTY', PADDING + descWidth + qtyWidth, y);
  ctx.fillText('Rate', PADDING + descWidth + qtyWidth + rateWidth, y);
  ctx.fillText('Amount', CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Dotted separator
  drawDottedLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Items
  ctx.font = FONT_NORMAL;
  data.items.forEach(item => {
    const itemName = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const amount = (item.unitPrice * item.quantity).toFixed(2);

    ctx.textAlign = 'left';
    ctx.fillText(itemName, PADDING, y);
    ctx.textAlign = 'right';
    ctx.fillText(item.quantity.toString(), PADDING + descWidth + qtyWidth, y);
    ctx.fillText(item.unitPrice.toFixed(2), PADDING + descWidth + qtyWidth + rateWidth, y);
    ctx.fillText(amount, CANVAS_WIDTH - PADDING, y);
    y += LINE_HEIGHT;

    // Item notes
    if (item.notes) {
      ctx.font = FONT_NORMAL;
      ctx.textAlign = 'left';
      ctx.fillText(`>> ${item.notes}`, PADDING + 20, y);
      y += LINE_HEIGHT;
      ctx.font = FONT_NORMAL;
    }
  });

  y += LINE_HEIGHT / 2;

  return y;
}

/**
 * Draw totals section with GST breakdown
 */
function drawTotals(ctx: CanvasRenderingContext2D, data: BillData, startY: number): number {
  let y = startY;

  const labelX = CANVAS_WIDTH / 2;
  const valueX = CANVAS_WIDTH - PADDING;

  // Separator
  drawThinLine(ctx, labelX, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Subtotal
  ctx.font = FONT_NORMAL;
  ctx.textAlign = 'left';
  ctx.fillText('Total RS. :', labelX, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.subTotal.toFixed(2), valueX, y);
  y += LINE_HEIGHT;

  // Discount
  if (data.discountAmount > 0) {
    const discLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    ctx.textAlign = 'left';
    ctx.fillText(discLabel, labelX, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-${data.discountAmount.toFixed(2)}`, valueX, y);
    y += LINE_HEIGHT;
  }

  y += LINE_HEIGHT / 2;

  // GST
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;

    if (data.gstMode === 'igst') {
      ctx.textAlign = 'left';
      ctx.fillText(`IGST @ ${gstRate}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText((data.cgstAmount + data.sgstAmount).toFixed(2), valueX, y);
      y += LINE_HEIGHT;
    } else {
      const halfRate = gstRate / 2;

      ctx.textAlign = 'left';
      ctx.fillText(`C GST @ ${halfRate}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.cgstAmount.toFixed(2), valueX, y);
      y += LINE_HEIGHT;

      ctx.textAlign = 'left';
      ctx.fillText(`S GST @ ${halfRate}% :`, labelX, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.sgstAmount.toFixed(2), valueX, y);
      y += LINE_HEIGHT;
    }
  }

  // Round off
  const calculated = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculated;
  if (Math.abs(roundOff) > 0.01) {
    const sign = roundOff < 0 ? '-' : '';
    ctx.textAlign = 'left';
    ctx.fillText('Round Off :', labelX, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${sign}${Math.abs(roundOff).toFixed(2)}`, valueX, y);
    y += LINE_HEIGHT;
  }

  // Final separator
  drawThinLine(ctx, labelX, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT;

  // Net total
  ctx.font = FONT_BOLD;
  ctx.textAlign = 'left';
  ctx.fillText('Net Rs. :', labelX, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.finalAmount.toFixed(2), valueX, y);
  y += LINE_HEIGHT;

  // Bottom border
  drawThickLine(ctx, PADDING, y, CANVAS_WIDTH - PADDING, y);
  y += LINE_HEIGHT / 2;

  return y;
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
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}