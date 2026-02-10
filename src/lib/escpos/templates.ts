import { ESCPOSBuilder, Alignment, FontSize, PaperWidth, BOX_CHARS } from './commands';
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


const formatDate = (): string => {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const breakTextIntoLines = (text: string, maxChars: number): string[] => {
  const lines: string[] = [];
  let current = '';
  const words = text.split(' ');

  for (const word of words) {
    if ((current + word).length <= maxChars) {
      current += (current ? ' ' : '') + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
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

  const printTotalLine = (label: string, amount: number, symbol: string) => {
    const left = label.padEnd(16);   // label width
    const right = `${symbol}${amount.toFixed(2)}`.padStart(14); // amount width
    builder.line(left + right);
  };

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


const formatAmount = (amount: number): string => {
  return amount.toFixed(2);
};

export const generateBillCommands = (data: BillData, paperWidth: PaperWidth = '80mm'): Uint8Array => {
  const builder = new ESCPOSBuilder(paperWidth);
  const store = useUIStore.getState();
  const cleanedBillNumber = data.billNumber.split("-").pop();

  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  // ┌───────────────────────────────────────────┐
  // │         Top border of entire bill         │
  // └───────────────────────────────────────────┘
  builder.topBorder();

  // Restaurant name - centered with borders
  builder.align(Alignment.CENTER).bold(true);
  builder.borderedLine(data.restaurantName?.toUpperCase() || 'RESTAURANT');
  builder.bold(false);

  // Address lines - centered with borders
  if (data.address) {
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => {
      builder.borderedLine(line);
    });
  }

  // Phone - centered with borders
  if (data.phone) {
    builder.borderedLine(`Mobile : ${data.phone}`);
  }

  // ├───────────────────────────────────────────┤
  builder.middleDivider();

  // TAX INVOICE | PURE VEG section with inner box borders
  const maxContentWidth = builder.getCharsPerLine() - 2; // Account for outer borders
  const halfWidth = Math.floor(maxContentWidth / 2);

  const taxInvoiceText = 'TAX INVOICE';
  const vegText = 'PURE VEG';

  const leftPadding = Math.floor((halfWidth - taxInvoiceText.length) / 2);
  const rightPadding = Math.floor((halfWidth - vegText.length) / 2);

  const leftSide = ' '.repeat(leftPadding) + taxInvoiceText + ' '.repeat(halfWidth - leftPadding - taxInvoiceText.length);
  const rightSide = ' '.repeat(rightPadding) + vegText + ' '.repeat(halfWidth - rightPadding - vegText.length);

  // Inner box: ┌────────┬────────┐
  const innerTopBorder = BOX_CHARS.TOP_LEFT +
    BOX_CHARS.HORIZONTAL.repeat(halfWidth) +
    BOX_CHARS.T_DOWN +
    BOX_CHARS.HORIZONTAL.repeat(halfWidth - 1) +
    BOX_CHARS.TOP_RIGHT;
  builder.align(Alignment.LEFT);
  builder.borderedLine(innerTopBorder);

  // Content: │ TAX INVOICE │ PURE VEG │
  const innerContent = BOX_CHARS.VERTICAL + leftSide + BOX_CHARS.VERTICAL + rightSide + BOX_CHARS.VERTICAL;
  builder.bold(true);
  builder.borderedLine(innerContent);
  builder.bold(false);

  // Inner box: └────────┴────────┘
  const innerBottomBorder = BOX_CHARS.BOTTOM_LEFT +
    BOX_CHARS.HORIZONTAL.repeat(halfWidth) +
    BOX_CHARS.T_UP +
    BOX_CHARS.HORIZONTAL.repeat(halfWidth - 1) +
    BOX_CHARS.BOTTOM_RIGHT;
  builder.borderedLine(innerBottomBorder);

  // ├───────────────────────────────────────────┤
  builder.middleDivider();

  // Bill details - left aligned with borders
  builder.align(Alignment.LEFT).bold(true);
  builder.borderedTwoColumns(
    `Bill No: ${cleanedBillNumber}`,
    `T. No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`
  );
  builder.bold(false);

  // ├───────────────────────────────────────────┤
  builder.middleDivider();

  // Date - with borders
  builder.bold(true);
  builder.borderedLine(`Date : ${formatDate()}`);
  builder.bold(false);

  // ├───────────────────────────────────────────┤
  builder.middleDivider();

  // Items header - with borders
  builder.bold(true);
  builder.borderedFourColumns('Description', 'QTY', 'Rate', 'Amount');
  builder.bold(false);

  // Dotted separator inside borders
  const dottedSeparator = '.'.repeat(maxContentWidth);
  builder.borderedLine(dottedSeparator);

  // Items - each line with borders
  data.items.forEach((item) => {
    const itemName = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const amount = (item.unitPrice * item.quantity).toFixed(2);

    builder.borderedFourColumns(
      itemName.toUpperCase(),
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      amount
    );

    if (item.notes) {
      builder.borderedLine(`  ${item.notes}`);
    }
  });

  // Empty line with borders
  builder.borderedLine();

  // Dotted separator inside borders
  builder.borderedLine(dottedSeparator);

  // Totals section - right aligned with borders
  builder.align(Alignment.RIGHT);
  builder.borderedLine(`Total RS. : ${formatAmount(data.subTotal)}`);
  builder.borderedLine();

  // Discount - if applicable
  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%):`
      : 'Discount:';
    builder.borderedLine(`${discountLabel} -${formatAmount(data.discountAmount)}`);
    builder.borderedLine();
  }

  // GST - if enabled
  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;
    const halfRate = gstRate / 2;

    if (data.gstMode === 'igst') {
      builder.borderedLine(`IGST @ ${gstRate}% : ${formatAmount(data.cgstAmount + data.sgstAmount)}`);
    } else {
      builder.borderedLine(`C GST @ ${halfRate}% : ${formatAmount(data.cgstAmount)}`);
      builder.borderedLine(`S GST @ ${halfRate}% : ${formatAmount(data.sgstAmount)}`);
    }
  }

  // Round off calculation
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) >= 0.01) {
    builder.borderedLine(`Round Off : ${formatAmount(Math.abs(roundOff))}`);
  }

  // Final amount - bold, with borders
  builder.bold(true);
  builder.borderedLine(`Net Rs. : ${formatAmount(data.finalAmount)}`);
  builder.bold(false);

  // ├───────────────────────────────────────────┤
  builder.middleDivider();

  // Footer section - centered with borders
  builder.align(Alignment.CENTER);

  if (data.fssaiNumber) {
    builder.borderedLine(`FASSAI LIC No : ${data.fssaiNumber}`);
  }

  if (data.gstin) {
    builder.borderedLine(`GSTIN : ${data.gstin}`);
  }

  builder.borderedLine('.........THANKS FOR VISIT.........');

  // └───────────────────────────────────────────┘
  // Bottom border of entire bill
  builder.bottomBorder();

  // Feed and cut
  builder.feed(4);
  builder.partialCut();

  return builder.build();
};