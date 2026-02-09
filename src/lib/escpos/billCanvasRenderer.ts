/**
 * Bill Canvas Renderer
 * Renders a bill layout to a canvas for raster bitmap printing
 * Targets 80mm thermal paper @ 203 DPI = 576 dots width
 */

import type { BillData } from './templates';
import { useUIStore } from '@/store/uiStore';

/** Print width in dots for 80mm @ 203 DPI */
const PRINT_WIDTH = 576;
const MARGIN = 16;

/** Font definitions for canvas rendering */
const FONTS = {
  header: 'bold 28px "Courier New", monospace',
  normalBold: 'bold 20px "Courier New", monospace',
  normal: '20px "Courier New", monospace',
  small: '16px "Courier New", monospace',
  smallBold: 'bold 16px "Courier New", monospace',
  netTotal: 'bold 24px "Courier New", monospace',
} as const;

/** Drawing context that tracks current Y position */
interface DrawContext {
  ctx: CanvasRenderingContext2D;
  y: number;
  width: number;
  margin: number;
}

// ─── Drawing helpers ──────────────────────────────────────────────

function centeredText(dc: DrawContext, text: string, font: string, lineH = 24): void {
  dc.ctx.font = font;
  dc.ctx.textAlign = 'center';
  dc.ctx.fillText(text, dc.width / 2, dc.y);
  dc.y += lineH;
}

function leftText(dc: DrawContext, text: string, font: string, lineH = 24): void {
  dc.ctx.font = font;
  dc.ctx.textAlign = 'left';
  dc.ctx.fillText(text, dc.margin, dc.y);
  dc.y += lineH;
}

function twoCol(dc: DrawContext, left: string, right: string, font: string, lineH = 24): void {
  dc.ctx.font = font;
  dc.ctx.textAlign = 'left';
  dc.ctx.fillText(left, dc.margin, dc.y);
  dc.ctx.textAlign = 'right';
  dc.ctx.fillText(right, dc.width - dc.margin, dc.y);
  dc.y += lineH;
}

function hLine(dc: DrawContext, thickness = 2, dash: number[] = []): void {
  dc.ctx.lineWidth = thickness;
  dc.ctx.setLineDash(dash);
  dc.ctx.beginPath();
  dc.ctx.moveTo(4, dc.y);
  dc.ctx.lineTo(dc.width - 4, dc.y);
  dc.ctx.stroke();
  dc.ctx.setLineDash([]);
  dc.y += thickness + 2;
}

function rightTotal(dc: DrawContext, label: string, value: string, font: string): void {
  const amtX = dc.width - dc.margin;
  const labelX = amtX - 110;
  dc.ctx.font = font;
  dc.ctx.textAlign = 'right';
  dc.ctx.fillText(label, labelX, dc.y);
  dc.ctx.fillText(value, amtX, dc.y);
  dc.y += 24;
}

function partialHLine(dc: DrawContext, startFraction: number): void {
  const startX = dc.width * startFraction;
  dc.ctx.lineWidth = 1;
  dc.ctx.beginPath();
  dc.ctx.moveTo(startX, dc.y);
  dc.ctx.lineTo(dc.width - dc.margin, dc.y);
  dc.ctx.stroke();
  dc.y += 4;
}

// ─── Date formatter ───────────────────────────────────────────────

function formatDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

// ─── Main renderer ────────────────────────────────────────────────

/**
 * Renders a BillData object to a monochrome-ready HTMLCanvasElement.
 * The canvas is 576px wide (80mm @ 203 DPI) with white background and black drawing.
 */
export function renderBillToCanvas(data: BillData): HTMLCanvasElement {
  const store = useUIStore.getState();
  const currentBillNumber = store.currentBillNumber;

  // Generous initial height — trimmed at the end
  const estimatedH = 900 + data.items.length * 28;

  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH;
  canvas.height = estimatedH;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'black';

  const dc: DrawContext = { ctx, y: 24, width: PRINT_WIDTH, margin: MARGIN };

  const outerBorderX = 4;
  const outerBorderTop = dc.y - 12;

  // ═══ HEADER ═══
  dc.y += 4;
  centeredText(dc, (data.restaurantName || 'RESTAURANT').toUpperCase(), FONTS.header, 34);

  if (data.address) {
    data.address.split(',').map(l => l.trim()).forEach(line => {
      centeredText(dc, line, FONTS.small, 20);
    });
  }

  if (data.phone) {
    dc.y += 2;
    centeredText(dc, `Mobile : ${data.phone}`, FONTS.normalBold, 26);
  }

  dc.y += 6;
  hLine(dc, 2);
  dc.y += 4;

  // ═══ TAX INVOICE | PURE VEG boxes ═══
  const taxLabel = 'TAX INVOICE';
  const vegLabel = data.isPureVeg !== false ? 'PURE VEG' : 'NON VEG./VEG';

  ctx.font = FONTS.normalBold;
  const taxW = ctx.measureText(taxLabel).width + 24;
  const vegW = ctx.measureText(vegLabel).width + 24;
  const totalBoxW = taxW + vegW;
  const boxX = (PRINT_WIDTH - totalBoxW) / 2;
  const boxH = 30;

  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, dc.y - 2, taxW, boxH);
  ctx.strokeRect(boxX + taxW, dc.y - 2, vegW, boxH);

  ctx.textAlign = 'center';
  ctx.fillText(taxLabel, boxX + taxW / 2, dc.y + 19);
  ctx.fillText(vegLabel, boxX + taxW + vegW / 2, dc.y + 19);

  dc.y += boxH + 8;
  hLine(dc, 2);
  dc.y += 4;

  // ═══ BILL INFO ═══
  const tNoLabel = data.isParcel
    ? `T. No: ${data.tokenNumber || '-'}`
    : `T. No: ${data.tableNumber || '-'}`;
  twoCol(dc, `Bill No. ${currentBillNumber}`, tNoLabel, FONTS.normalBold, 24);

  hLine(dc, 1);
  dc.y += 2;
  leftText(dc, `Date:   ${formatDate()}`, FONTS.normalBold, 24);
  dc.y += 2;
  hLine(dc, 2);
  dc.y += 4;

  // ═══ ITEMS TABLE HEADER ═══
  const descX = dc.margin;
  const qtyX = PRINT_WIDTH * 0.48;
  const rateX = PRINT_WIDTH * 0.68;
  const amtX = PRINT_WIDTH - dc.margin;

  ctx.font = FONTS.normalBold;
  ctx.textAlign = 'left';
  ctx.fillText('Description', descX, dc.y);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', qtyX, dc.y);
  ctx.textAlign = 'right';
  ctx.fillText('Rate', rateX, dc.y);
  ctx.fillText('Amount', amtX, dc.y);
  dc.y += 24;

  hLine(dc, 1, [2, 3]); // dotted
  dc.y += 2;

  // ═══ ITEM ROWS ═══
  ctx.font = FONTS.normal;
  data.items.forEach(item => {
    const raw = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;
    const name = raw.length > 22 ? raw.substring(0, 21) + '.' : raw;
    const amt = (item.unitPrice * item.quantity).toFixed(2);

    ctx.textAlign = 'left';
    ctx.fillText(name, descX, dc.y);
    ctx.textAlign = 'center';
    ctx.fillText(item.quantity.toString(), qtyX, dc.y);
    ctx.textAlign = 'right';
    ctx.fillText(item.unitPrice.toFixed(2), rateX, dc.y);
    ctx.fillText(amt, amtX, dc.y);
    dc.y += 24;
  });

  dc.y += 8;

  // ═══ TOTALS ═══
  partialHLine(dc, 0.44);
  dc.y += 4;

  rightTotal(dc, 'Total RS. :', data.subTotal.toFixed(2), FONTS.normal);

  if (data.discountAmount > 0) {
    const discLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    rightTotal(dc, discLabel, '-' + data.discountAmount.toFixed(2), FONTS.normal);
  }

  dc.y += 4;

  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;
    if (data.gstMode === 'igst') {
      rightTotal(dc, `IGST @ ${gstRate}% :`, (data.cgstAmount + data.sgstAmount).toFixed(2), FONTS.normal);
    } else {
      const half = gstRate / 2;
      rightTotal(dc, `C GST @ ${half}% :`, data.cgstAmount.toFixed(2), FONTS.normal);
      rightTotal(dc, `S GST @ ${half}% :`, data.sgstAmount.toFixed(2), FONTS.normal);
    }
  }

  // Round off
  const calc = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calc;
  if (Math.abs(roundOff) > 0.01) {
    const sign = roundOff < 0 ? '-' : '';
    rightTotal(dc, 'Round Off :', sign + Math.abs(roundOff).toFixed(2), FONTS.normal);
  }

  partialHLine(dc, 0.44);
  dc.y += 4;

  // Net total
  rightTotal(dc, 'Net Rs. :', data.finalAmount.toFixed(2), FONTS.netTotal);
  dc.y += 4;

  // ═══ FOOTER ═══
  hLine(dc, 2);
  dc.y += 4;

  if (data.fssaiNumber) {
    centeredText(dc, `FASSAI LIC No : ${data.fssaiNumber}`, FONTS.small, 20);
  }
  if (data.gstin) {
    centeredText(dc, `GSTIN : ${data.gstin}`, FONTS.small, 20);
  }
  dc.y += 4;
  centeredText(dc, '.........THANKS FOR VISIT.........', FONTS.normalBold, 24);
  dc.y += 10;

  // ═══ OUTER BORDER ═══
  const outerBorderBottom = dc.y;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    outerBorderX,
    outerBorderTop,
    PRINT_WIDTH - outerBorderX * 2,
    outerBorderBottom - outerBorderTop
  );

  // Trim canvas to actual used height
  const trimmed = document.createElement('canvas');
  trimmed.width = PRINT_WIDTH;
  trimmed.height = dc.y + 20;
  const tCtx = trimmed.getContext('2d')!;
  tCtx.fillStyle = 'white';
  tCtx.fillRect(0, 0, trimmed.width, trimmed.height);
  tCtx.drawImage(canvas, 0, 0);

  return trimmed;
}
