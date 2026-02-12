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


const formatDate = (): string => {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatTime = (): string => {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatAmount = (amount: number): string => amount.toFixed(2);

/**
 * Generate ESC/POS commands for KOT printing
 */
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

  builder
    .twoColumns(`KOT #: ${displayKotNumber}`, '')
    .twoColumns(`Date: ${formatDate()}`, `Time: ${formatTime()}`)
    .dashedLine();

  builder
    .bold(true)
    .twoColumns('ITEM', 'QTY')
    .bold(false)
    .dashedLine();

  items.forEach((item, index) => {
    const itemName = item.portion !== 'single'
      ? `${index + 1}. ${item.productName} (${item.portion})`
      : `${index + 1}. ${item.productName}`;

    builder.twoColumns(itemName, `x${item.quantity}`);

    if (item.notes) {
      builder.line(`   >> ${item.notes}`);
    }
  });

  builder.solidLine();

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  builder
    .bold(true)
    .align(Alignment.CENTER)
    .line(`TOTAL ITEMS: ${totalQty}`)
    .bold(false);

  builder
    .newline()
    .feed(3)
    .partialCut();

  return builder.build();
};

export const generateBillCommands = (data: BillData, paperWidth: PaperWidth = '80mm'): Uint8Array => {
  const builder = new ESCPOSBuilder(paperWidth);
  const store = useUIStore.getState();
  const cleanedBillNumber = data.billNumber.split('-').pop();
  const cols = builder.getCharsPerLine();

  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  // === HEADER: Restaurant Name (large, bold, centered) ===
  builder
    .align(Alignment.CENTER)
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true)
    .line(data.restaurantName?.toUpperCase() || 'RESTAURANT')
    .bold(false)
    .setFontSize(FontSize.NORMAL);

  // Address lines (centered, normal size)
  if (data.address) {
    builder.setLineSpacing(22);
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => builder.line(line));
    builder.resetLineSpacing();
  }

  // Mobile (bold, centered)
  if (data.phone) {
    builder.bold(true).line(`Mobile : ${data.phone}`).bold(false);
  }

  // Separator
  builder.line('='.repeat(cols));

  // TAX INVOICE | PURE VEG / NON VEG box row
  const vegLabel = data.isPureVeg !== false ? 'PURE VEG' : 'NON VEG. / VEG';
  const leftBox = '| TAX INVOICE |';
  const rightBox = `| ${vegLabel} |`;
  const boxGap = cols - leftBox.length - rightBox.length;
  builder.bold(true).line(leftBox + ' '.repeat(Math.max(1, boxGap)) + rightBox).bold(false);

  // Separator
  builder.line('='.repeat(cols));
  builder.newline();

  // Bill No & Table/Token No (bold, two columns)
  builder
    .align(Alignment.LEFT)
    .bold(true)
    .twoColumns(
      `Bill No. ${cleanedBillNumber}`,
      `T. No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`
    )
    .bold(false);

  builder.dashedLine();

  // Date (bold, left)
  builder
    .bold(true)
    .line(`Date : ${formatDate()}`)
    .bold(false);

  // Separator before items header
  builder.line('='.repeat(cols));

  // Items header (bold)
  builder
    .bold(true)
    .fourColumns('Description', 'QTY', 'Rate', 'Amount')
    .bold(false);

  builder.dottedLine();

  // Item rows
  data.items.forEach((item) => {
    const itemName = item.portion !== 'single' && item.portion
      ? `${item.productName} (${item.portion})`
      : item.productName;

    builder.fourColumns(
      itemName,
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      (item.unitPrice * item.quantity).toFixed(2)
    );
  });

  builder.newline();

  // Dotted line (right portion only)
  builder.align(Alignment.RIGHT);
  builder.rightDottedLine(20);
  builder.newline();

  // Total RS.
  builder.line(`Total RS. : ${formatAmount(data.subTotal)}`);
  builder.newline();

  // Discount (if any)
  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    builder.line(`${discountLabel} -${formatAmount(data.discountAmount)}`);
    builder.newline();
  }

  // GST lines
  const gstRate = data.items[0]?.gstRate || 5;
  const halfRate = gstRate / 2;

  if (data.gstMode === 'igst') {
    builder.line(`IGST @ ${gstRate}% : ${formatAmount(data.cgstAmount + data.sgstAmount)}`);
  } else {
    builder.line(`C GST @ ${halfRate}% : ${formatAmount(data.cgstAmount || 0)}`);
    builder.line(`S GST @ ${halfRate}% : ${formatAmount(data.sgstAmount || 0)}`);
  }

  // Round Off
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) >= 0.01) {
    builder.line(`Round Off : ${formatAmount(roundOff)}`);
  }

  // Dotted separator before net total
  builder.rightDottedLine(20);

  // Net Rs. (bold, emphasized)
  builder
    .setFontSize(FontSize.DOUBLE_WIDTH)
    .bold(true)
    .line(`Net Rs. : ${formatAmount(data.finalAmount)}`)
    .bold(false)
    .setFontSize(FontSize.NORMAL);

  // Separator
  builder.align(Alignment.CENTER);
  builder.line('='.repeat(cols));

  // Footer: FSSAI, GSTIN, HSN
  builder.line(`FASSAI LIC No : ${data.fssaiNumber || '10721026000597'}`);
  builder.line(`GSTIN : ${data.gstin || '24DHFPM8077N1ZN'}`);
  builder.line('HSN/SAC CODE : 9963');
  builder.line('........THANKS FOR VISIT........');

  // Bottom separator
  builder.line('='.repeat(cols));

  builder.feed(4);
  builder.partialCut();

  return builder.build();
};
