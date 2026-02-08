
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

/**
 * Generate ESC/POS commands for Bill printing
 */
export const generateBillCommands = (data: BillData, paperWidth: PaperWidth = '80mm'): Uint8Array => {

  const builder = new ESCPOSBuilder(paperWidth);
  const symbol = 'Rs.'; // Changed from ₹ to Rs. for better printer compatibility
  const store = useUIStore.getState();

  // Get current + increment for next time
  const currentBillNumber = store.currentBillNumber;

  console.log("IsParceMode", data.isParcel)
  // Increase for next bill
  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  // Restaurant name and details - matching the image
  builder
    .align(Alignment.CENTER)
    .setFontSize(FontSize.DOUBLE_WIDTH)
    .bold(true)
    .line(data.restaurantName || 'Restaurant')
    .setFontSize(FontSize.NORMAL)
    .bold(false);

  if (data.address) {
    builder.line(data.address);
  }
  if (data.phone) {
    builder.line(`Mobile: ${data.phone}`);
  }

  builder.dashedLine();

  // TAX INVOICE header with VEG label
  builder
    .align(Alignment.CENTER)
    .bold(true)
    .line('TAX INVOICE       PURE VEG')
    .bold(false)
    .line('');

  // Bill info - matching image layout
  builder
    .align(Alignment.LEFT)
    .twoColumns(`Bill No. ${currentBillNumber}`, `T. No: ${data.isParcel ? (data.tokenNumber || 0) : (data.tableNumber || '-')}`);

  builder
    .line(`Date: ${formatDate()}`)
    .line('');

  builder.dashedLine();

  // Items header - matching the image exactly
  builder
    .bold(true)
    .threeColumns('Description', 'QTY', 'Rate Amount')
    .bold(false)
    .dashedLine();

  // Items - matching the image format
  data.items.forEach((item) => {
    const itemName = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const itemLines = breakTextIntoLines(itemName, 3);

    // Print first line with quantity, rate, and amount
    builder.threeColumns(
      itemLines[0],
      item.quantity.toString(),
      `${item.unitPrice.toFixed(2)}    ${(item.unitPrice * item.quantity).toFixed(2)}`
    );

    // Print remaining lines (if any) without quantity/rate/amount
    for (let i = 1; i < itemLines.length; i++) {
      builder.line(itemLines[i]);
    }
  });

  builder
    .line('')
    .dashedLine();

  // Totals - Right aligned, matching image
  builder.align(Alignment.RIGHT);

  builder.line(`Total RS.: ${formatAmount(data.subTotal, '', true)}`);
  builder.line('');

  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%):`
      : 'Discount:';
    builder.line(`${discountLabel} -${formatAmount(data.discountAmount, symbol)}`);
    builder.line('');
  }

  // Tax (only show if showGST is true or undefined for backward compatibility)
  if (data.showGST !== false) {
    if (data.gstMode === 'igst') {
      const igstRate = data.items[0]?.gstRate || 5; // Get rate from first item or default to 5%
      builder.line(`IGST @ ${igstRate}%: ${formatAmount(data.cgstAmount + data.sgstAmount, '', true)}`);
    } else {
      const cgstRate = (data.items[0]?.gstRate || 5) / 2; // Half of total GST rate
      const sgstRate = (data.items[0]?.gstRate || 5) / 2;
      builder.line(`CGST @ ${cgstRate}%: ${formatAmount(data.cgstAmount, '', true)}`);
      builder.line(`SGST @ ${sgstRate}%: ${formatAmount(data.sgstAmount, '', true)}`);
    }
  }

  // Round off calculation
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) > 0.01) {
    builder.line(`Round Off: ${formatAmount(Math.abs(roundOff), '', true)}`);
  }

  // Grand total - matching image exactly
  builder
    .bold(true)
    .line(`Net Rs.: ${formatAmount(data.finalAmount, '', true)}`)
    .bold(false)
    .align(Alignment.LEFT);

  builder.dashedLine();

  // Footer details - matching image
  builder.align(Alignment.CENTER);

  if (data.fssaiNumber) {
    builder.line(`FASSAI LIC No: ${data.fssaiNumber}`);
  }
  if (data.gstin) {
    builder.line(`GSTIN: ${data.gstin}`);
  }
  // if (data.hsnSacCode) {
  //   builder.line(`HSN/SAC CODE: ${data.hsnSacCode}`);
  // }

  // Footer message
  builder
    .line('.........THANKS FOR VISIT........')
    .feed(4)
    .partialCut();

  return builder.build();
};

// Helper function to format amount (updated to match image)
const formatAmount = (amount: number, symbol: string = '', noSymbol: boolean = false): string => {
  if (noSymbol) {
    return amount.toFixed(2);
  }
  return symbol ? `${symbol}${amount.toFixed(2)}` : amount.toFixed(2);
};
