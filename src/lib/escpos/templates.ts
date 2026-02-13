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

  builder.setFont('A')
  builder.bold(true)
  builder.dashedLine();
  // === HEADER: Restaurant Name (large, bold, centered, NO border) ===
  builder.align(Alignment.CENTER);
  builder
    .align(Alignment.CENTER)
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true)
    .line(data.restaurantName?.toUpperCase() || 'RESTAURANT')
    .bold(false)
    .setFontSize(FontSize.NORMAL);

  builder.setFont('A')
  // Address lines (centered, compact)
  if (data.address) {
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => builder.line(line));
  }

  // Mobile (bold, centered)
  if (data.phone) {
    builder.bold(true).line(`Mobile : ${data.phone}`).bold(false);
  }

  // --- separator ---
  builder.bold(true);
  builder.dashedLine();
  builder.drawBoxRow('TAX INVOICE', '', 'PURE VEG');
  // --- separator ---
  builder.dashedLine();
  builder.bold(false);



  // Bill No & Table/Token No (with | on edges)
  builder.align(Alignment.LEFT);
  const billNoStr = `Bill No. ${cleanedBillNumber}`;
  const tableNoStr = `T.No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`;
  const billLine = billNoStr + ' '.repeat(Math.max(1, cols - 2 - billNoStr.length - tableNoStr.length)) + tableNoStr;
  builder.bold(true).line(billLine);

  builder.dashedLine();

  // Date (with | on left)
  builder.line(`Date : ${formatDate()}`);

  // --- separator before items ---
  builder.dashedLine();

  // Items header (with | on edges, bold)
  const innerW = cols;
  const hdrLine = formatFourCols('Description', 'QTY', 'Rate', 'Amount', innerW, paperWidth);
  builder.bold(true).line(hdrLine).bold(false);

  // dotted separator
  builder.dottedLine();

  // Item rows (with | on left only)
  data.items.forEach((item) => {
    const itemName = item.portion !== 'single' && item.portion
      ? `${item.productName} (${item.portion})`
      : item.productName;
    const row = formatFourCols(
      itemName,
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      (item.unitPrice * item.quantity).toFixed(2),
      innerW,
      paperWidth
    );
    builder.line(row);
  });

  // Right-aligned dotted separator
  builder.align(Alignment.RIGHT);
  builder.rightDottedLine(16);

  // Total RS. (right-aligned, no border)
  builder.line(`Total RS. : ${formatAmount(data.subTotal)}`);


  builder.line('')
  // Discount
  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    builder.line(`${discountLabel} -${formatAmount(data.discountAmount)}`);
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

  builder.rightDottedLine(16);

  // Net Rs. (bold, double-width, right-aligned)
  builder
    .setFontSize(FontSize.DOUBLE_WIDTH)
    .bold(true)
    .line(`Net Rs. : ${formatAmount(data.finalAmount)}`)
    .bold(false)
    .setFontSize(FontSize.NORMAL);

  // --- separator ---
  builder.bold(true)
  builder.dashedLine();

  // Footer (centered)
  builder.align(Alignment.CENTER);
  builder.line('Composition Taxable Person');
  builder.line(`FSSAI LIC No : ${data.fssaiNumber || '10721026000597'}`);
  builder.line(`GSTIN : ${data.gstin || '24DHFPM8077N1ZN'}`);
  builder.line('........THANKS FOR VISIT........');
  builder.line('')
  builder.bold(true)
  builder.dashedLine();
  builder.feed(3);
  builder.partialCut();

  return builder.build();
};

/** Format four columns for a given inner width */
function formatFourCols(
  col1: string, col2: string, col3: string, col4: string,
  totalWidth: number, paper: PaperWidth
): string {
  const widths = paper === '58mm'
    ? [15, 4, 5, 6]
    : paper === '76mm'
      ? [23, 5, 6, 6]
      : [19, 4, 9, 12];
  return [
    col1.substring(0, widths[0]).padEnd(widths[0]),
    col2.substring(0, widths[1]).padStart(widths[1]),
    col3.substring(0, widths[2]).padStart(widths[2]),
    col4.substring(0, widths[3]).padStart(widths[3]),
  ].join(' ');
}
