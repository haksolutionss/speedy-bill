
import { ESCPOSBuilder, Alignment, FontSize, PaperWidth } from './commands';
import { useUIStore, type CartItem } from '@/store/uiStore';

export interface KOTData {
  tableNumber?: string;
  tokenNumber?: number;
  items: CartItem[];
  billNumber?: string;
  kotNumber?: number;
  kotNumberFormatted?: string;
  isParcel?: boolean;
}

export interface BillData {
  billId: string;
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
  isReprint?: boolean;
  isPureVeg?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

const formatDate = (): string => {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
};

const formatTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatAmount = (amount: number): string => amount.toFixed(2);

// ─── KOT Commands ─────────────────────────────────────────────────

export const generateKOTCommands = (data: KOTData, paperWidth: PaperWidth = '80mm'): Uint8Array => {
  const builder = new ESCPOSBuilder(paperWidth);
  const { tableNumber, tokenNumber, items, kotNumber = 1, kotNumberFormatted, isParcel } = data;
  const displayKotNumber = kotNumberFormatted || kotNumber.toString().padStart(2, '0');

  builder
    .align(Alignment.CENTER)
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true)
    .setFontSize(FontSize.NORMAL)
    .bold(false)
    .newline();

  builder.setFontSize(FontSize.DOUBLE_BOTH).bold(true);
  if (isParcel) {
    builder.line(`PARCEL: #${tokenNumber || 0}`);
  } else {
    builder.line(`TABLE: ${tableNumber || '-'}`);
  }

  builder.setFontSize(FontSize.NORMAL).bold(false).align(Alignment.LEFT).dashedLine();

  builder
    .twoColumns(`KOT #: ${displayKotNumber}`, '')
    .twoColumns(`Date: ${formatDate()}`, `Time: ${formatTime()}`)
    .dashedLine();

  builder.bold(true).twoColumns('ITEM', 'QTY').bold(false).dashedLine();

  items.forEach((item, index) => {
    const itemName = item.portion !== 'single'
      ? `${index + 1}. ${item.productName} (${item.portion})`
      : `${index + 1}. ${item.productName}`;
    builder.twoColumns(itemName, `x${item.quantity}`);
    if (item.notes) builder.line(`   >> ${item.notes}`);
  });

  builder.dashedLine();

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  builder.bold(true).align(Alignment.CENTER).line(`TOTAL ITEMS: ${totalQty}`).bold(false);
  builder.newline().feed(3).partialCut();

  return builder.build();
};

// ─── Bill Commands (ASCII-Safe Text Fallback) ─────────────────────
//
// ⚠ This function uses ONLY ASCII-safe characters (=, -, spaces).
// No Unicode box-drawing glyphs — they fail on POSYTUDE YHD-8330.
// This is the FALLBACK mode; bitmap printing is preferred.

export const generateBillCommands = (
  data: BillData,
  paperWidth: PaperWidth = '80mm'
): Uint8Array => {
  const builder = new ESCPOSBuilder(paperWidth);
  const store = useUIStore.getState();
  const currentBillNumber = store.currentBillNumber;
  const w = builder.getCharsPerLine(); // 48 for 80mm

  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  const sep = '='.repeat(w);
  const thinSep = '-'.repeat(w);
  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((w - text.length) / 2));
    return ' '.repeat(pad) + text;
  };
  const lr = (left: string, right: string) => {
    const gap = Math.max(1, w - left.length - right.length);
    return left + ' '.repeat(gap) + right;
  };

  // ═══ HEADER ═══
  builder.line(sep);
  builder.align(Alignment.CENTER).bold(true);
  builder.line(data.restaurantName?.toUpperCase() || 'RESTAURANT');
  builder.bold(false);

  if (data.address) {
    data.address.split(',').map(l => l.trim()).forEach(line => {
      builder.line(center(line));
    });
  }

  if (data.phone) {
    builder.bold(true);
    builder.line(center(`Mobile : ${data.phone}`));
    builder.bold(false);
  }

  builder.line(sep);

  // ═══ TAX INVOICE / VEG ═══
  const taxLabel = 'TAX INVOICE';
  const vegLabel = data.isPureVeg !== false ? 'PURE VEG' : 'NON VEG./VEG';
  builder.bold(true).align(Alignment.CENTER);
  builder.line(center(taxLabel));
  builder.line(center(vegLabel));
  builder.bold(false);
  builder.line(sep);

  // ═══ BILL INFO ═══
  builder.align(Alignment.LEFT).bold(true);
  const tNo = data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-');
  builder.line(lr(`Bill No. ${currentBillNumber}`, `T. No: ${tNo}`));
  builder.line(thinSep);
  builder.line(`Date:   ${formatDate()}`);
  builder.bold(false);
  builder.line(sep);

  // ═══ ITEMS HEADER ═══
  const descW = paperWidth === '58mm' ? 16 : 22;
  const qtyW = 5;
  const rateW = paperWidth === '58mm' ? 5 : 10;
  const amtW = w - descW - qtyW - rateW;

  const pad = (s: string, len: number, align: 'l' | 'r' = 'l') =>
    align === 'r' ? s.substring(0, len).padStart(len) : s.substring(0, len).padEnd(len);

  builder.bold(true);
  builder.line(
    pad('Description', descW) +
    pad('QTY', qtyW, 'r') +
    pad('Rate', rateW, 'r') +
    pad('Amount', amtW, 'r')
  );
  builder.bold(false);
  builder.line('.'.repeat(w));

  // ═══ ITEMS ═══
  data.items.forEach(item => {
    const raw = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;
    const name = raw.length > descW ? raw.substring(0, descW - 1) + '.' : raw;
    const amt = (item.unitPrice * item.quantity).toFixed(2);

    builder.line(
      pad(name, descW) +
      pad(item.quantity.toString(), qtyW, 'r') +
      pad(item.unitPrice.toFixed(2), rateW, 'r') +
      pad(amt, amtW, 'r')
    );
  });

  builder.newline();

  // ═══ TOTALS ═══
  const totalIndent = descW + qtyW;
  const totalWidth = w - totalIndent;
  const rightRow = (label: string, value: string) => {
    const gap = Math.max(1, totalWidth - label.length - value.length);
    builder.line(' '.repeat(totalIndent) + label + ' '.repeat(gap) + value);
  };

  builder.line(' '.repeat(totalIndent) + '-'.repeat(totalWidth));

  rightRow('Total RS. :', formatAmount(data.subTotal));

  if (data.discountAmount > 0) {
    const discLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    rightRow(discLabel, '-' + formatAmount(data.discountAmount));
  }

  builder.newline();

  // GST
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;
    if (data.gstMode === 'igst') {
      rightRow(`IGST @ ${gstRate}% :`, formatAmount(data.cgstAmount + data.sgstAmount));
    } else {
      const half = gstRate / 2;
      rightRow(`C GST @ ${half}% :`, formatAmount(data.cgstAmount));
      rightRow(`S GST @ ${half}% :`, formatAmount(data.sgstAmount));
    }
  }

  // Round off
  const calc = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calc;
  if (Math.abs(roundOff) > 0.01) {
    const sign = roundOff < 0 ? '-' : '';
    rightRow('Round Off :', sign + formatAmount(Math.abs(roundOff)));
  }

  builder.line(' '.repeat(totalIndent) + '-'.repeat(totalWidth));

  // Net total
  builder.bold(true);
  rightRow('Net Rs. :', formatAmount(data.finalAmount));
  builder.bold(false);

  builder.line(sep);

  // ═══ FOOTER ═══
  builder.align(Alignment.CENTER);
  if (data.fssaiNumber) builder.line(center(`FASSAI LIC No : ${data.fssaiNumber}`));
  if (data.gstin) builder.line(center(`GSTIN : ${data.gstin}`));
  builder.newline();
  builder.bold(true);
  builder.line(center('.........THANKS FOR VISIT.........'));
  builder.bold(false);
  builder.line(sep);

  builder.feed(4).partialCut();

  return builder.build();
};
