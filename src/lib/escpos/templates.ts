/**
 * ESC/POS Print Templates for KOT and Bill
 */

import { ESCPOSBuilder, Alignment, FontSize, PaperWidth } from './commands';
import type { CartItem } from '@/store/uiStore';

export interface KOTData {
  tableNumber?: string;
  tokenNumber?: number;
  items: CartItem[];
  billNumber?: string;
  kotNumber?: number;
  isParcel?: boolean;
}

export interface BillData {
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
  currencySymbol?: string;
  gstMode?: 'cgst_sgst' | 'igst';
  customerName?: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
}

// Format currency for printing
const formatAmount = (amount: number, symbol: string = '₹'): string => {
  return `${symbol}${amount.toFixed(2)}`.padStart(10);
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
  const { tableNumber, tokenNumber, items, billNumber, kotNumber = 1, isParcel } = data;

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

  // Parcel indicator
  if (isParcel) {
    builder
      .inverse(true)
      .line(' PARCEL ')
      .inverse(false)
      .newline();
  }

  // Table/Token number prominently
  builder
    .setFontSize(FontSize.DOUBLE_BOTH)
    .bold(true);

  if (isParcel) {
    builder.line(`TOKEN #${tokenNumber || 0}`);
  } else {
    builder.line(`TABLE: ${tableNumber || '-'}`);
  }

  builder
    .setFontSize(FontSize.NORMAL)
    .bold(false)
    .align(Alignment.LEFT)
    .dashedLine();

  // KOT info
  builder
    .twoColumns(`KOT #: ${kotNumber}`, billNumber ? `Bill: ${billNumber}` : '')
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

  console.log("Generating bill commands", data);
  const builder = new ESCPOSBuilder(paperWidth);
  const symbol = 'Rs.'; // Changed from ₹ to Rs. for better printer compatibility

  // Header
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
    builder.line(`Tel: ${data.phone}`);
  }
  if (data.gstin) {
    builder.line(`GSTIN: ${data.gstin}`);
  }

  builder.dashedLine();

  // Bill info
  builder
    .align(Alignment.LEFT)
    .twoColumns(`Bill No: ${data.billNumber}`, `Date: ${formatDate()}`)
    .twoColumns(`Time: ${formatTime()}`, data.coverCount ? `Covers: ${data.coverCount}` : '');

  // Table/Token
  builder
    .dashedLine()
    .align(Alignment.CENTER)
    .bold(true);

  if (data.isParcel) {
    builder.line(`PARCEL - Token #${data.tokenNumber || 0}`);
  } else {
    builder.line(`TABLE: ${data.tableNumber || '-'}`);
  }

  builder
    .bold(false)
    .align(Alignment.LEFT)
    .dashedLine();

  // Items header
  builder
    .bold(true)
    .fourColumns('Item', 'Qty', 'Rate', 'Amt')
    .bold(false)
    .dashedLine();

  // Items
  data.items.forEach((item, index) => {
    const itemName = item.portion !== 'single'
      ? `${index + 1}.${item.productName}(${item.portion})`
      : `${index + 1}.${item.productName}`;

    builder.fourColumns(
      itemName,
      item.quantity.toString(),
      item.unitPrice.toFixed(0),
      (item.unitPrice * item.quantity).toFixed(2)
    );

    if (item.notes) {
      builder.line(`  >> ${item.notes}`);
    }
  });

  builder.dashedLine();

  // Totals - Right aligned single column
  builder.align(Alignment.RIGHT);

  builder.line(`Sub Total: ${formatAmount(data.subTotal, symbol)}`);

  if (data.discountAmount > 0) {
    const discountLabel = data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%):`
      : 'Discount:';
    builder.line(`${discountLabel} -${formatAmount(data.discountAmount, symbol)}`);
  }

  // Tax
  if (data.gstMode === 'igst') {
    builder.line(`IGST: ${formatAmount(data.cgstAmount + data.sgstAmount, symbol)}`);
  } else {
    builder.line(`CGST: ${formatAmount(data.cgstAmount, symbol)}`);
    builder.line(`SGST: ${formatAmount(data.sgstAmount, symbol)}`);
  }

  // Round off calculation
  const calculatedTotal = data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount;
  const roundOff = data.finalAmount - calculatedTotal;

  if (Math.abs(roundOff) > 0.01) {
    builder.line(`Round Off: ${roundOff >= 0 ? '+' : ''}${formatAmount(Math.abs(roundOff), symbol)}`);
  }

  // Grand total
  builder
    .dashedLine()
    .bold(true)
    .setFontSize(FontSize.DOUBLE_HEIGHT)
    .line(`GRAND TOTAL: ${formatAmount(data.finalAmount, symbol)}`)
    .setFontSize(FontSize.NORMAL)
    .bold(false)
    .align(Alignment.LEFT);

  // // GST Breakdown - Single column, right-aligned
  // const gstBreakdown: Record<number, { taxable: number; cgst: number; sgst: number }> = {};
  // data.items.forEach(item => {
  //   const itemTotal = item.unitPrice * item.quantity;
  //   const itemDiscount = data.discountAmount > 0 ? (itemTotal / data.subTotal) * data.discountAmount : 0;
  //   const taxable = itemTotal - itemDiscount;
  //   const gst = taxable * (item.gstRate / 100);

  //   if (!gstBreakdown[item.gstRate]) {
  //     gstBreakdown[item.gstRate] = { taxable: 0, cgst: 0, sgst: 0 };
  //   }
  //   gstBreakdown[item.gstRate].taxable += taxable;
  //   gstBreakdown[item.gstRate].cgst += gst / 2;
  //   gstBreakdown[item.gstRate].sgst += gst / 2;
  // });

  // if (Object.keys(gstBreakdown).length > 0) {
  //   builder
  //     .dashedLine()
  //     .align(Alignment.CENTER)
  //     .line('GST BREAKDOWN')
  //     .align(Alignment.LEFT);

  //   Object.entries(gstBreakdown).forEach(([rate, vals]) => {
  //     if (data.gstMode === 'igst') {
  //       builder.twoColumns(
  //         `${rate}% IGST on ${vals.taxable.toFixed(0)}:`,
  //         `${symbol}${(vals.cgst + vals.sgst).toFixed(2)}`
  //       );
  //     } else {
  //       // Single column with right-aligned total GST amount
  //       builder.twoColumns(
  //         `${rate}% on ${vals.taxable.toFixed(0)}:`,
  //         `${symbol}${(vals.cgst + vals.sgst).toFixed(2)}`
  //       );
  //     }
  //   });
  // }

  // Payment method
  // if (data.paymentMethod) {
  //   builder
  //     .dashedLine()
  //     .align(Alignment.CENTER)
  //     .inverse(true)
  //     .line(` PAID BY: ${data.paymentMethod.toUpperCase()} `)
  //     .inverse(false);
  // }

  // Customer & Loyalty
  // if (data.customerName || data.loyaltyPointsUsed || data.loyaltyPointsEarned) {
  //   builder
  //     .dashedLine()
  //     .align(Alignment.LEFT);

  //   if (data.customerName) {
  //     builder.line(`Customer: ${data.customerName}`);
  //   }
  //   if (data.loyaltyPointsUsed && data.loyaltyPointsUsed > 0) {
  //     builder.line(`Points Redeemed: ${data.loyaltyPointsUsed}`);
  //   }
  //   if (data.loyaltyPointsEarned && data.loyaltyPointsEarned > 0) {
  //     builder.line(`Points Earned: +${data.loyaltyPointsEarned}`);
  //   }
  // }

  // Footer
  builder
    .dashedLine()
    .align(Alignment.CENTER)
    .bold(true)
    .line('Thank You! Visit Again!')
    .bold(false)
    .feed(4)
    .partialCut();

  return builder.build();
};