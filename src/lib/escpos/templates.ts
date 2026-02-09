
import { ESCPOSBuilder, Alignment, FontSize, PaperWidth } from './commands';
import { useUIStore, type CartItem } from '@/store/uiStore';

export interface KOTData {
  tableNumber?: string;
  tokenNumber?: number;
  items: CartItem[];
  billNumber?: string;
  kotNumber?: number;
  kotNumberFormatted?: string; // Formatted KOT number like "01", "02"
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
  showGST?: boolean; // Whether to show GST in print
  isReprint?: boolean; // Whether this is a reprint
  isPureVeg?: boolean; // Pure Veg indicator
}

// Add this helper function at the top of the file, after the imports
const breakTextIntoLines = (text: string, maxWordsPerLine: number = 3): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];

  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    const lineWords = words.slice(i, i + maxWordsPerLine);
    lines.push(lineWords.join(' '));
  }

  return lines;
};


// Format time for printing
const formatTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};


/**
 * Generate ESC/POS commands for KOT printing
 */
export const generateKOTCommands = (data: KOTData, paperWidth: PaperWidth = '80mm'): Uint8Array => {
  const builder = new ESCPOSBuilder(paperWidth);
  const { tableNumber, tokenNumber, items, billNumber, kotNumber = 1, kotNumberFormatted, isParcel } = data;
  const displayKotNumber = kotNumberFormatted || kotNumber.toString().padStart(2, '0');

  builder
    .align(Alignment.CENTER)
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true)
    // .line('** KOT **')
    .setFontSize(FontSize.NORMAL)
    .bold(false)
    .newline();


  // Table/Token number prominently
  builder
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true);

  if (isParcel) {
    builder.line(`PARCEL: #${tokenNumber || 0}`);
  } else {
    builder.line(`TABLE: ${tableNumber || '-'}`);
  }

  builder
    .setFontSize(FontSize.NORMAL)
    .bold(false)
    .align(Alignment.LEFT)
    .dashedLine();

  // KOT info - use formatted number
  builder
    .twoColumns(`KOT #: ${displayKotNumber}`, '')
    .twoColumns(`Date: ${formatDate()}`, `Time: ${formatTime()}`)
    .dashedLine();

  // Items header
  builder
    .bold(true)
    .twoColumns('ITEM', 'QTY')
    .bold(false)
    .dashedLine();

  // Items
  items.forEach((item, index) => {
    const itemName = item.portion !== 'single'
      ? `${index + 1}. ${item.productName} (${item.portion})`
      : `${index + 1}. ${item.productName}`;

    builder.twoColumns(itemName, `x${item.quantity}`);

    // Notes for item
    if (item.notes) {
      builder.line(`   >> ${item.notes}`);
    }
  });

  builder.dashedLine();

  // Total items count
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  builder
    .bold(true)
    .align(Alignment.CENTER)
    .line(`TOTAL ITEMS: ${totalQty}`)
    .bold(false);

  // Footer
  builder
    .newline()
    .feed(3)
    .partialCut();

  return builder.build();
};
export const generateBillCommands = (
  data: BillData,
  paperWidth: PaperWidth = '80mm'
): Uint8Array => {

  const builder = new ESCPOSBuilder(paperWidth);
  const store = useUIStore.getState();
  const currentBillNumber = store.currentBillNumber;

  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  const width = paperWidth === '80mm' ? 48 : 32;

  // ── Top border ──
  builder.line('┌' + '─'.repeat(width - 2) + '┐');

  // ── Company name - bold centered ──
  const companyName = data.restaurantName || 'RESTAURANT';
  const companyPad = Math.floor((width - companyName.length - 2) / 2);
  builder.bold(true);
  builder.line('│' + ' '.repeat(companyPad) + companyName + ' '.repeat(width - companyName.length - companyPad - 2) + '│');
  builder.bold(false);

  // ── Address lines ──
  if (data.address) {
    const addressLines = data.address.split(',').map(line => line.trim());
    addressLines.forEach(line => {
      const pad = Math.floor((width - line.length - 2) / 2);
      builder.line('│' + ' '.repeat(pad) + line + ' '.repeat(width - line.length - pad - 2) + '│');
    });
  }

  // ── Phone (bold) ──
  if (data.phone) {
    const phoneLine = `Mobile : ${data.phone}`;
    const phonePad = Math.floor((width - phoneLine.length - 2) / 2);
    builder.bold(true);
    builder.line('│' + ' '.repeat(phonePad) + phoneLine + ' '.repeat(width - phoneLine.length - phonePad - 2) + '│');
    builder.bold(false);
  }

  // ── Separator ──
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // ── TAX INVOICE | PURE VEG / NON VEG boxes ──
  const taxLabel = 'TAX INVOICE';
  const vegLabel = data.isPureVeg !== false ? 'PURE VEG' : 'NON VEG./VEG';
  const boxInner = `┌${'─'.repeat(taxLabel.length + 2)}┬${'─'.repeat(vegLabel.length + 2)}┐`;
  const boxMiddle = `│ ${taxLabel} │ ${vegLabel} │`;
  const boxBottom = `└${'─'.repeat(taxLabel.length + 2)}┴${'─'.repeat(vegLabel.length + 2)}┘`;

  const boxWidth = boxInner.length;
  const boxPad = Math.floor((width - boxWidth - 2) / 2);

  builder.bold(true);
  builder.line('│' + ' '.repeat(boxPad) + boxInner + ' '.repeat(width - boxWidth - boxPad - 2) + '│');
  builder.line('│' + ' '.repeat(boxPad) + boxMiddle + ' '.repeat(width - boxWidth - boxPad - 2) + '│');
  builder.line('│' + ' '.repeat(boxPad) + boxBottom + ' '.repeat(width - boxWidth - boxPad - 2) + '│');
  builder.bold(false);

  // ── Separator ──
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // ── Bill No / T. No (bold) ──
  const billNo = `Bill No. ${currentBillNumber}`;
  const tableNo = `T. No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`;
  const billGap = width - billNo.length - tableNo.length - 2;
  builder.bold(true);
  builder.line('│' + billNo + ' '.repeat(billGap) + tableNo + '│');
  builder.bold(false);

  // ── Thin separator ──
  builder.line('│' + '─'.repeat(width - 2) + '│');

  // ── Date ──
  const dateLine = `Date:   ${formatDate()}`;
  builder.bold(true);
  builder.line('│' + dateLine + ' '.repeat(width - dateLine.length - 2) + '│');
  builder.bold(false);

  // ── Separator before items ──
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // ── Items header (bold) ──
  const descCol = 22;
  const qtyCol = 5;
  const rateCol = 10;

  const headerDesc = 'Description';
  const headerQty = 'QTY';
  const headerRate = 'Rate';
  const headerAmt = 'Amount';

  builder.bold(true);
  const headerLine = '│' + headerDesc + ' '.repeat(descCol - headerDesc.length) +
    headerQty + ' '.repeat(qtyCol - headerQty.length) +
    headerRate + ' '.repeat(rateCol - headerRate.length) +
    headerAmt + ' '.repeat(width - descCol - qtyCol - rateCol - headerAmt.length - 2) + '│';
  builder.line(headerLine);
  builder.bold(false);

  // ── Dotted separator ──
  builder.line('│' + '·'.repeat(width - 2) + '│');

  // ── Items ──
  data.items.forEach(item => {
    const name = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const itemQty = item.quantity.toString();
    const itemRate = item.unitPrice.toFixed(2);
    const itemAmount = (item.unitPrice * item.quantity).toFixed(2);

    const displayName = name.length > descCol ? name.substring(0, descCol - 1) : name;

    const itemLine = '│' + displayName + ' '.repeat(descCol - displayName.length) +
      itemQty + ' '.repeat(qtyCol - itemQty.length) +
      itemRate + ' '.repeat(rateCol - itemRate.length) +
      itemAmount + ' '.repeat(width - descCol - qtyCol - rateCol - itemAmount.length - 2) + '│';
    builder.line(itemLine);
  });

  // ── Empty line + separator before totals ──
  builder.line('│' + ' '.repeat(width - 2) + '│');
  builder.line('│' + ' '.repeat(descCol + qtyCol) + '─'.repeat(width - descCol - qtyCol - 2) + '│');

  // ── Total RS ──
  const totalLabel = 'Total RS. :';
  const totalAmt = formatAmount(data.subTotal);
  builder.line('│' + ' '.repeat(descCol + qtyCol) + totalLabel + ' '.repeat(rateCol - totalLabel.length) + totalAmt + ' '.repeat(width - descCol - qtyCol - rateCol - totalAmt.length - 2) + '│');

  // ── Discount ──
  if (data.discountAmount > 0) {
    const discLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    const discAmt = '-' + formatAmount(data.discountAmount);
    builder.line('│' + ' '.repeat(descCol + qtyCol) + discLabel + ' '.repeat(rateCol - discLabel.length) + discAmt + ' '.repeat(width - descCol - qtyCol - rateCol - discAmt.length - 2) + '│');
  }

  // ── Empty line ──
  builder.line('│' + ' '.repeat(width - 2) + '│');

  // ── GST ──
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;

    if (data.gstMode === 'igst') {
      const igstLabel = `IGST @ ${gstRate}% :`;
      const igstAmt = formatAmount(data.cgstAmount + data.sgstAmount);
      builder.line('│' + ' '.repeat(descCol + qtyCol) + igstLabel + ' '.repeat(rateCol - igstLabel.length) + igstAmt + ' '.repeat(width - descCol - qtyCol - rateCol - igstAmt.length - 2) + '│');
    } else {
      const halfRate = gstRate / 2;
      const cgstLabel = `C GST @ ${halfRate}% :`;
      const cgstAmt = formatAmount(data.cgstAmount);
      builder.line('│' + ' '.repeat(descCol + qtyCol) + cgstLabel + ' '.repeat(rateCol - cgstLabel.length) + cgstAmt + ' '.repeat(width - descCol - qtyCol - rateCol - cgstAmt.length - 2) + '│');

      const sgstLabel = `S GST @ ${halfRate}% :`;
      const sgstAmt = formatAmount(data.sgstAmount);
      builder.line('│' + ' '.repeat(descCol + qtyCol) + sgstLabel + ' '.repeat(rateCol - sgstLabel.length) + sgstAmt + ' '.repeat(width - descCol - qtyCol - rateCol - sgstAmt.length - 2) + '│');
    }
  }

  // ── Round off ──
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) > 0.01) {
    const roundLabel = 'Round Off :';
    const roundAmt = formatAmount(Math.abs(roundOff));
    const sign = roundOff < 0 ? '-' : '';
    builder.line('│' + ' '.repeat(descCol + qtyCol) + roundLabel + ' '.repeat(rateCol - roundLabel.length) + sign + roundAmt + ' '.repeat(width - descCol - qtyCol - rateCol - (sign + roundAmt).length - 2) + '│');
  }

  // ── Separator before net ──
  builder.line('│' + ' '.repeat(descCol + qtyCol) + '─'.repeat(width - descCol - qtyCol - 2) + '│');

  // ── Net Total (bold) ──
  builder.bold(true);
  const netLabel = 'Net Rs. :';
  const netAmt = formatAmount(data.finalAmount);
  builder.line('│' + ' '.repeat(descCol + qtyCol) + netLabel + ' '.repeat(rateCol - netLabel.length) + netAmt + ' '.repeat(width - descCol - qtyCol - rateCol - netAmt.length - 2) + '│');
  builder.bold(false);

  // ── Separator before footer ──
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // ── Footer ──
  if (data.fssaiNumber) {
    const fssai = `FASSAI LIC No : ${data.fssaiNumber}`;
    const fPad = Math.floor((width - fssai.length - 2) / 2);
    builder.line('│' + ' '.repeat(fPad) + fssai + ' '.repeat(width - fssai.length - fPad - 2) + '│');
  }

  if (data.gstin) {
    const gst = `GSTIN : ${data.gstin}`;
    const gPad = Math.floor((width - gst.length - 2) / 2);
    builder.line('│' + ' '.repeat(gPad) + gst + ' '.repeat(width - gst.length - gPad - 2) + '│');
  }

  // ── Thanks ──
  const thanks = '.........THANKS FOR VISIT.........';
  const tPad = Math.floor((width - thanks.length - 2) / 2);
  builder.line('│' + ' '.repeat(tPad) + thanks + ' '.repeat(width - thanks.length - tPad - 2) + '│');

  // ── Bottom border ──
  builder.line('└' + '─'.repeat(width - 2) + '┘');

  builder.feed(4);
  builder.partialCut();

  return builder.build();
};

const formatDate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatAmount = (amount: number): string => {
  return amount.toFixed(2);
};


