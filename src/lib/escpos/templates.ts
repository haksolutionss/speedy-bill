
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


// Format date for printing
const formatDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

/**
 * Generate ESC/POS commands for clean Bill printing
 */
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


  builder
    .align(Alignment.CENTER)
    .bold(true)
    .setFontSize(FontSize.DOUBLE_WIDTH)
    .line(data.restaurantName || 'Restaurant')
    .setFontSize(FontSize.NORMAL)
    .bold(false);

  if (data.address) builder.line(data.address);
  if (data.phone) builder.line(`Mobile: ${data.phone}`);

  builder.line('');
  builder.bold(true).line('TAX INVOICE').bold(false);
  builder.line('PURE VEG');
  builder.line('');


  builder
    .align(Alignment.LEFT)
    .twoColumns(
      `Bill No: ${currentBillNumber}`,
      `T. No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`
    )
    .line(`Date: ${formatDate()}`)
    .line('');


  builder
    .bold(true)
    .threeColumns('Description', 'QTY', 'Amount')
    .bold(false)
    .line('');


  data.items.forEach(item => {
    const name =
      item.portion !== 'single' && data.isParcel
        ? `${item.productName} (${item.portion})`
        : item.productName;

    const lines = breakTextIntoLines(name, 3);
    const amount = (item.unitPrice * item.quantity).toFixed(2);

    builder.threeColumns(
      lines[0],
      item.quantity.toString(),
      amount
    );

    for (let i = 1; i < lines.length; i++) {
      builder.line(lines[i]);
    }
  });

  builder.line('');
  builder.line('');

  builder.align(Alignment.RIGHT);
  builder.line(`Total Rs.: ${formatAmount(data.subTotal, '', true)}`);
  builder.line('');

  if (data.discountAmount > 0) {
    const label =
      data.discountType === 'percentage'
        ? `Discount (${data.discountValue}%)`
        : 'Discount';

    builder.line(`${label}: -${formatAmount(data.discountAmount, '', true)}`);
    builder.line('');
  }

  if (data.showGST !== false) {
    if (data.gstMode === 'igst') {
      const rate = data.items[0]?.gstRate || 5;
      builder.line(`IGST @ ${rate}%: ${formatAmount(data.cgstAmount + data.sgstAmount, '', true)}`);
    } else {
      const rate = (data.items[0]?.gstRate || 5) / 2;
      builder.line(`CGST @ ${rate}%: ${formatAmount(data.cgstAmount, '', true)}`);
      builder.line(`SGST @ ${rate}%: ${formatAmount(data.sgstAmount, '', true)}`);
    }
  }

  const calculatedTotal =
    data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) > 0.01) {
    builder.line(`Round Off: ${formatAmount(roundOff, '', true)}`);
  }

  builder.line('');

  builder
    .bold(true)
    .line(`Net Rs.: ${formatAmount(data.finalAmount, '', true)}`)
    .bold(false)
    .align(Alignment.LEFT)
    .line('');

  builder.align(Alignment.CENTER);

  if (data.fssaiNumber) builder.line(`FSSAI LIC No: ${data.fssaiNumber}`);
  if (data.gstin) builder.line(`GSTIN: ${data.gstin}`);

  builder.line('');
  builder.line('THANK YOU FOR YOUR VISIT');

  builder.feed(6); // clean bottom padding
  builder.partialCut();

  return builder.build();
};

const formatAmount = (
  amount: number,
  symbol: string = '',
  noSymbol: boolean = false
): string => {
  if (noSymbol) return amount.toFixed(2);
  return symbol ? `${symbol}${amount.toFixed(2)}` : amount.toFixed(2);
};

