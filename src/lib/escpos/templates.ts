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
  // const currentBillNumber = store.currentBillNumber;
  const cleanedBillNumber = data.billNumber.split("-").pop();

  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  builder.solidLine();

  builder
    .align(Alignment.CENTER)
    .bold(true)
    .line(data.restaurantName?.toUpperCase() || 'RESTAURANT')
    .bold(false);

  if (data.address) {
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => {
      builder.line(line);
    });
  }

  if (data.phone) {
    builder.line(`Mobile : ${data.phone}`);
  }

  builder.setLineSpacing(24);

  builder.drawBoxLine();
  builder.drawBoxRow('TAX INVOICE', '', 'PURE VEG');
  builder.drawBoxLine();

  builder.resetLineSpacing();


  builder
    .align(Alignment.LEFT)
    .bold(true)
    .twoColumns(`Bill No: ${cleanedBillNumber}`, `T. No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`)
    .bold(false);

  builder.solidLine();

  builder
    .bold(true)
    .line(`Date : ${formatDate()}`)
    .bold(false);

  builder.solidLine();

  builder
    .bold(true)
    .fourColumns('Desc', 'QTY', 'Rate', 'Amount')
    .bold(false);

  builder.dottedLine();

  data.items.forEach((item) => {
    const itemName = item.portion !== 'single' && data.isParcel
      ? `${item.productName} (${item.portion})`
      : item.productName;

    const amount = (item.unitPrice * item.quantity).toFixed(2);

    builder.fourColumns(
      itemName.toUpperCase(),
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      amount
    );

    if (item.notes) {
      builder.line(`  ${item.notes}`);
    }
  });

  builder.line('');

  builder.align(Alignment.RIGHT);
  builder.rightDottedLine(16);

  builder
    .align(Alignment.RIGHT)
    .line(`Total RS. : ${formatAmount(data.subTotal)}`)
    .line('');

  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%):`
      : 'Discount:';
    builder.line(`${discountLabel} -${formatAmount(data.discountAmount)}`);
    builder.line('');
  }

  if (data.showGST !== false) {
    const gstRate = data.items[0]?.gstRate || 5;
    const halfRate = gstRate / 2;

    if (data.gstMode === 'igst') {
      builder.line(`IGST @ ${gstRate}% : ${formatAmount(data.cgstAmount + data.sgstAmount)}`);
    } else {
      builder.line(`C GST @ ${halfRate}% : ${formatAmount(data.cgstAmount)}`);
      builder.line(`S GST @ ${halfRate}% : ${formatAmount(data.sgstAmount)}`);
    }
  }

  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) >= 0.01) {
    builder.line(`Round Off : ${formatAmount(Math.abs(roundOff))}`);
  }

  builder
    .bold(true)
    .line(`Net Rs. : ${formatAmount(data.finalAmount)}`)
    .bold(false);

  builder.solidLine();

  builder.align(Alignment.CENTER);

  if (data.fssaiNumber) {
    builder.line(`FASSAI LIC No : ${data.fssaiNumber}`);
  }

  if (data.gstin) {
    builder.line(`GSTIN : ${data.gstin}`);
  }

  builder.line('.........THANKS FOR VISIT.........');

  builder.solidLine();

  builder.feed(4);

  builder.partialCut();

  return builder.build();
};

