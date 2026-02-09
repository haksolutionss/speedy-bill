
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

  // Draw top border
  builder.line('┌' + '─'.repeat(width - 2) + '┐');

  // Company name - centered, no bold in header
  const companyName = data.restaurantName || 'RESTAURANT';
  const companyPadding = Math.floor((width - companyName.length - 2) / 2);
  builder.line('│' + ' '.repeat(companyPadding) + companyName + ' '.repeat(width - companyName.length - companyPadding - 2) + '│');

  // Address lines - each on separate line, centered
  if (data.address) {
    const addressLines = data.address.split(',').map(line => line.trim());
    addressLines.forEach(line => {
      const linePadding = Math.floor((width - line.length - 2) / 2);
      builder.line('│' + ' '.repeat(linePadding) + line + ' '.repeat(width - line.length - linePadding - 2) + '│');
    });
  }

  // Phone
  if (data.phone) {
    const phoneLine = `Mobile: ${data.phone}`;
    const phonePadding = Math.floor((width - phoneLine.length - 2) / 2);
    builder.line('│' + ' '.repeat(phonePadding) + phoneLine + ' '.repeat(width - phoneLine.length - phonePadding - 2) + '│');
  }

  // Separator before TAX INVOICE
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // TAX INVOICE box - with bold borders
  const taxInvoice = 'TAX INVOICE';
  const vegType = 'PURE VEG';

  // Create inner box for TAX INVOICE
  const invoiceWidth = 20;
  const vegWidth = 18;
  const totalInnerWidth = invoiceWidth + vegWidth + 3;
  const innerPadding = Math.floor((width - totalInnerWidth - 2) / 2);

  builder.line('│' + ' '.repeat(innerPadding) + '┌' + '─'.repeat(invoiceWidth) + '┬' + '─'.repeat(vegWidth) + '┐' + ' '.repeat(width - totalInnerWidth - innerPadding - 2) + '│');

  const taxPad = Math.floor((invoiceWidth - taxInvoice.length) / 2);
  const vegPad = Math.floor((vegWidth - vegType.length) / 2);
  builder.line('│' + ' '.repeat(innerPadding) + '│' + ' '.repeat(taxPad) + taxInvoice + ' '.repeat(invoiceWidth - taxInvoice.length - taxPad) + '│' + ' '.repeat(vegPad) + vegType + ' '.repeat(vegWidth - vegType.length - vegPad) + '│' + ' '.repeat(width - totalInnerWidth - innerPadding - 2) + '│');
  builder.line('│' + ' '.repeat(innerPadding) + '└' + '─'.repeat(invoiceWidth) + '┴' + '─'.repeat(vegWidth) + '┘' + ' '.repeat(width - totalInnerWidth - innerPadding - 2) + '│');

  // Separator
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // Bill No and T. No
  const billNo = `Bill No. ${currentBillNumber}`;
  const tableNo = `T. No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`;
  const billTableGap = width - billNo.length - tableNo.length - 2;
  builder.line('│' + billNo + ' '.repeat(billTableGap) + tableNo + '│');

  // Date
  const dateLine = `Date: ${formatDate()}`;
  builder.line('│' + dateLine + ' '.repeat(width - dateLine.length - 2) + '│');

  // Separator before items
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // Table header
  const desc = 'Description';
  const qty = 'QTY';
  const rate = 'Rate';
  const amount = 'Amount';

  // Column widths
  const descCol = 22;
  const qtyCol = 5;
  const rateCol = 10;
  const amtCol = 10;

  const headerLine = '│' + desc + ' '.repeat(descCol - desc.length) +
    qty + ' '.repeat(qtyCol - qty.length) +
    rate + ' '.repeat(rateCol - rate.length) +
    amount + ' '.repeat(width - descCol - qtyCol - rateCol - amount.length - 2) + '│';
  builder.line(headerLine);

  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // Items
  data.items.forEach(item => {
    const name = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const itemQty = item.quantity.toString();
    const itemRate = item.unitPrice.toFixed(2);
    const itemAmount = (item.unitPrice * item.quantity).toFixed(2);

    // Truncate name if needed
    const displayName = name.length > descCol ? name.substring(0, descCol - 3) + '...' : name;

    const itemLine = '│' + displayName + ' '.repeat(descCol - displayName.length) +
      itemQty + ' '.repeat(qtyCol - itemQty.length) +
      itemRate + ' '.repeat(rateCol - itemRate.length) +
      itemAmount + ' '.repeat(width - descCol - qtyCol - rateCol - itemAmount.length - 2) + '│';
    builder.line(itemLine);
  });

  // Empty line
  builder.line('│' + ' '.repeat(width - 2) + '│');

  builder.line('│' + ' '.repeat(descCol + qtyCol) + '─'.repeat(width - descCol - qtyCol - 2) + '│');

  // Total
  const totalLabel = 'Total Rs.:';
  const totalAmt = formatAmount(data.subTotal);
  const totalLine = '│' + ' '.repeat(descCol + qtyCol) + totalLabel + ' '.repeat(rateCol - totalLabel.length) + totalAmt + ' '.repeat(width - descCol - qtyCol - rateCol - totalAmt.length - 2) + '│';
  builder.line(totalLine);

  // Empty line
  builder.line('│' + ' '.repeat(width - 2) + '│');

  // GST
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;

    if (data.gstMode === 'igst') {
      const igstLabel = `IGST @ ${gstRate}%:`;
      const igstAmt = formatAmount(data.cgstAmount + data.sgstAmount);
      builder.line('│' + ' '.repeat(descCol + qtyCol) + igstLabel + ' '.repeat(rateCol - igstLabel.length) + igstAmt + ' '.repeat(width - descCol - qtyCol - rateCol - igstAmt.length - 2) + '│');
    } else {
      const halfRate = gstRate / 2;

      const cgstLabel = `C GST @ ${halfRate}%:`;
      const cgstAmt = formatAmount(data.cgstAmount);
      builder.line('│' + ' '.repeat(descCol + qtyCol) + cgstLabel + ' '.repeat(rateCol - cgstLabel.length) + cgstAmt + ' '.repeat(width - descCol - qtyCol - rateCol - cgstAmt.length - 2) + '│');

      const sgstLabel = `S GST @ ${halfRate}%:`;
      const sgstAmt = formatAmount(data.sgstAmount);
      builder.line('│' + ' '.repeat(descCol + qtyCol) + sgstLabel + ' '.repeat(rateCol - sgstLabel.length) + sgstAmt + ' '.repeat(width - descCol - qtyCol - rateCol - sgstAmt.length - 2) + '│');
    }
  }

  // Round off
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) > 0.01) {
    const roundLabel = 'Round Off:';
    const roundAmt = formatAmount(roundOff);
    builder.line('│' + ' '.repeat(descCol + qtyCol) + roundLabel + ' '.repeat(rateCol - roundLabel.length) + roundAmt + ' '.repeat(width - descCol - qtyCol - rateCol - roundAmt.length - 2) + '│');
  }

  // Dotted line before net total
  builder.line('│' + ' '.repeat(descCol + qtyCol) + '─'.repeat(width - descCol - qtyCol - 2) + '│');

  // Net Total (bold)
  builder.bold(true);
  const netLabel = 'Net Rs.:';
  const netAmt = formatAmount(data.finalAmount);
  const netLine = '│' + ' '.repeat(descCol + qtyCol) + netLabel + ' '.repeat(rateCol - netLabel.length) + netAmt + ' '.repeat(width - descCol - qtyCol - rateCol - netAmt.length - 2) + '│';
  builder.line(netLine);
  builder.bold(false);

  // Separator
  builder.line('├' + '─'.repeat(width - 2) + '┤');

  // Footer - centered
  if (data.fssaiNumber) {
    const fssai = `FASSAI LIC No: ${data.fssaiNumber}`;
    const fssaiPad = Math.floor((width - fssai.length - 2) / 2);
    builder.line('│' + ' '.repeat(fssaiPad) + fssai + ' '.repeat(width - fssai.length - fssaiPad - 2) + '│');
  }

  if (data.gstin) {
    const gstin = `GSTIN: ${data.gstin}`;
    const gstinPad = Math.floor((width - gstin.length - 2) / 2);
    builder.line('│' + ' '.repeat(gstinPad) + gstin + ' '.repeat(width - gstin.length - gstinPad - 2) + '│');
  }

  // if (data.hsnSacCode) {
  //   const hsn = `HSN/SAC CODE: ${data.hsnSacCode}`;
  //   const hsnPad = Math.floor((width - hsn.length - 2) / 2);
  //   builder.line('│' + ' '.repeat(hsnPad) + hsn + ' '.repeat(width - hsn.length - hsnPad - 2) + '│');
  // }

  // Thank you with dots
  const thanks = 'THANKS FOR VISIT';
  const thanksPad = Math.floor((width - thanks.length - 12) / 2);
  builder.line('│' + ' '.repeat(thanksPad) + '·······' + thanks + '·······' + ' '.repeat(width - thanks.length - thanksPad - 12 - 2) + '│');

  // Bottom border
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


