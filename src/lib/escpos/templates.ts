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
  const inner = cols - 2; // inner width inside | |

  if (!data.isReprint) {
    store.incrementBillNumber();
  }

  // === TOP BORDER ===
  builder.align(Alignment.CENTER);
  builder.borderLine();

  // === HEADER: Restaurant Name (large, bold) ===
  builder
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true)
    .borderedLine(data.restaurantName?.toUpperCase() || 'RESTAURANT')
    .bold(false)
    .setFontSize(FontSize.NORMAL);

  // Address lines (centered, compact)
  if (data.address) {
    const addressLines = data.address.split(',').map(l => l.trim());
    addressLines.forEach(line => builder.borderedLine(line));
  }

  // Mobile
  if (data.phone) {
    builder.bold(true).borderedLine(`Mobile : ${data.phone}`).bold(false);
  }

  // --- solid separator ---
  builder.borderLine();

  // TAX INVOICE | PURE VEG row
  const vegLabel = data.isPureVeg !== false ? 'PURE VEG' : 'NON VEG';
  const leftBox = '| TAX INVOICE |';
  const rightBox = `| ${vegLabel} |`;
  const boxGap = inner - leftBox.length - rightBox.length;
  builder.bold(true).borderedLine(leftBox + ' '.repeat(Math.max(1, boxGap)) + rightBox).bold(false);

  // --- solid separator ---
  builder.borderLine();

  // Bill No & Table/Token No
  const billNoStr = `Bill No. ${cleanedBillNumber}`;
  const tableNoStr = `T.No: ${data.isParcel ? (data.tokenNumber || '-') : (data.tableNumber || '-')}`;
  const billGap = inner - billNoStr.length - tableNoStr.length;
  builder.bold(true).borderedLine(billNoStr + ' '.repeat(Math.max(1, billGap)) + tableNoStr, 'left').bold(false);

  // Date
  builder.bold(true).borderedLine(`Date : ${formatDate()}`, 'left').bold(false);

  // --- solid separator before items ---
  builder.borderLine();

  // Items header
  const hdrLine = formatFourCols('Description', 'QTY', 'Rate', 'Amount', inner, paperWidth);
  builder.bold(true).borderedLine(hdrLine, 'left').bold(false);

  // dotted separator inside border
  builder.line('|' + '.'.repeat(inner) + '|');

  // Item rows
  data.items.forEach((item) => {
    const itemName = item.portion !== 'single' && item.portion
      ? `${item.productName} (${item.portion})`
      : item.productName;
    const row = formatFourCols(
      itemName,
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      (item.unitPrice * item.quantity).toFixed(2),
      inner,
      paperWidth
    );
    builder.borderedLine(row, 'left');
  });

  // Right-side dotted line inside border
  const dots = '.'.repeat(20);
  builder.borderedLine(dots, 'right');

  // Total RS.
  builder.borderedLine(`Total RS. : ${formatAmount(data.subTotal)}`, 'right');

  // Discount
  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%) :`
      : 'Discount :';
    builder.borderedLine(`${discountLabel} -${formatAmount(data.discountAmount)}`, 'right');
  }

  // GST lines
  const gstRate = data.items[0]?.gstRate || 5;
  const halfRate = gstRate / 2;

  if (data.gstMode === 'igst') {
    builder.borderedLine(`IGST @ ${gstRate}% : ${formatAmount(data.cgstAmount + data.sgstAmount)}`, 'right');
  } else {
    builder.borderedLine(`C GST @ ${halfRate}% : ${formatAmount(data.cgstAmount || 0)}`, 'right');
    builder.borderedLine(`S GST @ ${halfRate}% : ${formatAmount(data.sgstAmount || 0)}`, 'right');
  }

  // Round Off
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;
  if (Math.abs(roundOff) >= 0.01) {
    builder.borderedLine(`Round Off : ${formatAmount(roundOff)}`, 'right');
  }

  // Dotted separator before net total
  builder.borderedLine(dots, 'right');

  // Net Rs. (bold, double-width)
  builder
    .setFontSize(FontSize.DOUBLE_WIDTH)
    .bold(true)
    .borderedLine(`Net Rs. : ${formatAmount(data.finalAmount)}`, 'right')
    .bold(false)
    .setFontSize(FontSize.NORMAL);

  // --- solid separator ---
  builder.borderLine();

  // Footer
  builder.borderedLine(`FSSAI LIC No : ${data.fssaiNumber || '10721026000597'}`);
  builder.borderedLine(`GSTIN : ${data.gstin || '24DHFPM8077N1ZN'}`);
  builder.borderedLine('HSN/SAC CODE : 9963');
  builder.borderedLine('* THANKS FOR VISIT *');

  // === BOTTOM BORDER ===
  builder.borderLine();

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
      : [18, 4, 9, 11];

  return [
    col1.substring(0, widths[0]).padEnd(widths[0]),
    col2.substring(0, widths[1]).padStart(widths[1]),
    col3.substring(0, widths[2]).padStart(widths[2]),
    col4.substring(0, widths[3]).padStart(widths[3]),
  ].join(' ');
}
