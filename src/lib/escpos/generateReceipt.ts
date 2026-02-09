import type { BillData } from './templates';

/**
 * CONFIG
 * 80mm printer = 48 chars
 * 58mm printer = 32 chars
 */
const WIDTH = 48;

/**
 * ESC/POS CONTROL CODES
 * These MUST be sent before printing
 */
const ESC = '\x1B';
const INIT = ESC + '@';            // Reset printer
const FONT_A = ESC + 'M' + '\x00'; // Fixed width font
const NORMAL = ESC + '!' + '\x00'; // Normal size
const LINE_SPACE = ESC + '3' + '\x18'; // Line spacing

/**
 * HELPERS
 */
function hr(char = '-') {
    return char.repeat(WIDTH);
}

function pad(
    text: string,
    width: number,
    align: 'left' | 'right' = 'left'
) {
    return align === 'left'
        ? text.padEnd(width)
        : text.padStart(width);
}

function center(text: string) {
    if (text.length >= WIDTH) return text.slice(0, WIDTH);
    const space = WIDTH - text.length;
    const left = Math.floor(space / 2);
    return ' '.repeat(left) + text;
}

function boxLine(text: string) {
    return '|' + pad(text, WIDTH - 2) + '|';
}

function dualBox(left: string, right: string) {
    const inner = WIDTH - 3;
    const half = Math.floor(inner / 2);
    return (
        '|' +
        pad(left, half) +
        '|' +
        pad(right, inner - half) +
        '|'
    );
}

/**
 * MAIN FUNCTION
 * Returns STRING → send directly to printer
 */
export function generateReceipt(data: BillData): string {
    const lines: string[] = [];

    // --- INIT PRINTER ---
    lines.push(INIT + FONT_A + NORMAL + LINE_SPACE);

    // --- OUTER BORDER TOP ---
    lines.push('+' + hr('-').slice(0, WIDTH - 2) + '+');

    // --- HEADER ---
    lines.push(boxLine(center((data.restaurantName || 'RESTAURANT').toUpperCase())));

    if (data.address) {
        data.address.split(',').forEach(a => {
            lines.push(boxLine(center(a.trim())));
        });
    }

    if (data.phone) {
        lines.push(boxLine(center(`Mobile : ${data.phone}`)));
    }

    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    // --- TAX INVOICE BOX ---
    lines.push(dualBox(' TAX INVOICE ', ' VEG '));
    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    // --- BILL INFO ---
    lines.push(
        boxLine(
            pad(`Bill No. ${data.billNumber}`, 24) +
            pad(
                data.isParcel
                    ? `Token: ${data.tokenNumber || '-'}`
                    : `T. No: ${data.tableNumber || '-'}`,
                22,
                'right'
            )
        )
    );

    const dateStr = new Date().toLocaleDateString('en-GB');
    lines.push(boxLine(`Date : ${dateStr}`));

    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    // --- TABLE HEADER ---
    lines.push(
        '|' +
        pad('Description', 22) +
        pad('QTY', 4, 'right') +
        pad('Rate', 8, 'right') +
        pad('Amount', 12, 'right') +
        '|'
    );

    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    // --- ITEMS ---
    data.items.forEach(item => {
        const name = item.productName.toUpperCase().slice(0, 22);
        const qty = item.quantity.toString();
        const rate = item.unitPrice.toFixed(2);
        const amt = (item.unitPrice * item.quantity).toFixed(2);

        lines.push(
            '|' +
            pad(name, 22) +
            pad(qty, 4, 'right') +
            pad(rate, 8, 'right') +
            pad(amt, 12, 'right') +
            '|'
        );
    });

    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    // --- TOTALS ---
    const pushAmount = (label: string, value: number) => {
        lines.push(
            '|' +
            pad(label, 34) +
            pad(value.toFixed(2), 12, 'right') +
            '|'
        );
    };

    pushAmount('Total Rs. :', data.subTotal);

    if (data.discountAmount > 0) {
        pushAmount('Discount :', -data.discountAmount);
    }

    if (data.showGST !== false) {
        pushAmount('CGST :', data.cgstAmount);
        pushAmount('SGST :', data.sgstAmount);
    }

    const roundOff =
        data.finalAmount -
        (data.subTotal - data.discountAmount + data.cgstAmount + data.sgstAmount);

    if (Math.abs(roundOff) >= 0.01) {
        pushAmount('Round Off :', roundOff);
    }

    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    lines.push(
        '|' +
        pad('Net Rs. :', 34) +
        pad(data.finalAmount.toFixed(2), 12, 'right') +
        '|'
    );

    // --- FOOTER ---
    lines.push('|' + hr('-').slice(0, WIDTH - 2) + '|');

    if (data.fssaiNumber) {
        lines.push(boxLine(center(`FSSAI LIC NO : ${data.fssaiNumber}`)));
    }

    if (data.gstin) {
        lines.push(boxLine(center(`GSTIN : ${data.gstin}`)));
    }

    lines.push(boxLine(center('THANKS FOR VISIT')));

    // --- OUTER BORDER BOTTOM ---
    lines.push('+' + hr('-').slice(0, WIDTH - 2) + '+');

    // --- FEED & CUT (optional) ---
    lines.push('\n\n\n');
    lines.push('\x1D\x56\x00'); // Full cut (if supported)

    return lines.join('\n');
}
