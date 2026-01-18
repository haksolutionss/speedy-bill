/**
 * ESC/POS Command Library for Thermal Printers
 * Supports 58mm, 76mm, and 80mm paper widths
 */

// ESC/POS Command Constants
export const ESC = 0x1B;
export const GS = 0x1D;
export const FS = 0x1C;
export const DLE = 0x10;
export const EOT = 0x04;
export const NUL = 0x00;
export const LF = 0x0A;
export const CR = 0x0D;

// Paper width configurations (characters per line)
export const PAPER_WIDTHS = {
  '58mm': { chars: 32, dotsWidth: 384 },
  '76mm': { chars: 42, dotsWidth: 512 },
  '80mm': { chars: 48, dotsWidth: 576 },
} as const;

export type PaperWidth = keyof typeof PAPER_WIDTHS;

// Text alignment
export enum Alignment {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2,
}

// Font size
export enum FontSize {
  NORMAL = 0x00,
  DOUBLE_HEIGHT = 0x10,
  DOUBLE_WIDTH = 0x20,
  DOUBLE_BOTH = 0x30,
}

// ESC/POS Command Builder
export class ESCPOSBuilder {
  private buffer: number[] = [];
  private paperWidth: PaperWidth;
  private charsPerLine: number;

  constructor(paperWidth: PaperWidth = '80mm') {
    this.paperWidth = paperWidth;
    this.charsPerLine = PAPER_WIDTHS[paperWidth].chars;
    this.initialize();
  }

  // Initialize printer
  initialize(): this {
    this.buffer.push(ESC, 0x40); // ESC @ - Initialize
    return this;
  }

  // Set text alignment
  align(alignment: Alignment): this {
    this.buffer.push(ESC, 0x61, alignment); // ESC a n
    return this;
  }

  // Set font size
  setFontSize(size: FontSize): this {
    this.buffer.push(GS, 0x21, size); // GS ! n
    return this;
  }

  // Bold on/off
  bold(on: boolean): this {
    this.buffer.push(ESC, 0x45, on ? 1 : 0); // ESC E n
    return this;
  }

  // Underline on/off
  underline(on: boolean): this {
    this.buffer.push(ESC, 0x2D, on ? 1 : 0); // ESC - n
    return this;
  }

  // Inverse (white on black) on/off
  inverse(on: boolean): this {
    this.buffer.push(GS, 0x42, on ? 1 : 0); // GS B n
    return this;
  }

  // Print text
  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.buffer.push(...bytes);
    return this;
  }

  // Print line with newline
  line(str: string = ''): this {
    return this.text(str).newline();
  }

  // Newline
  newline(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  // Print horizontal line using dashes
  horizontalLine(char: string = '-'): this {
    return this.line(char.repeat(this.charsPerLine));
  }

  // Print dotted line
  dottedLine(): this {
    return this.horizontalLine('.');
  }

  // Print dashed line
  dashedLine(): this {
    return this.horizontalLine('-');
  }

  // Print double line
  doubleLine(): this {
    return this.horizontalLine('=');
  }

  // Print two columns (left and right aligned)
  twoColumns(left: string, right: string): this {
    const maxLeftWidth = this.charsPerLine - right.length - 1;
    const leftTrimmed = left.substring(0, maxLeftWidth);
    const spaces = this.charsPerLine - leftTrimmed.length - right.length;
    return this.line(leftTrimmed + ' '.repeat(Math.max(1, spaces)) + right);
  }

  // Print three columns
  threeColumns(left: string, center: string, right: string): this {
    const centerWidth = center.length;
    const rightWidth = right.length;
    const leftMaxWidth = this.charsPerLine - centerWidth - rightWidth - 2;
    const leftTrimmed = left.substring(0, leftMaxWidth);
    
    const totalUsed = leftTrimmed.length + centerWidth + rightWidth;
    const totalSpaces = this.charsPerLine - totalUsed;
    const leftSpaces = Math.floor(totalSpaces / 2);
    const rightSpaces = totalSpaces - leftSpaces;
    
    return this.line(leftTrimmed + ' '.repeat(leftSpaces) + center + ' '.repeat(rightSpaces) + right);
  }

  // Print four columns (for item lines: name, qty, rate, amount)
  fourColumns(col1: string, col2: string, col3: string, col4: string): this {
    const widths = this.paperWidth === '58mm' 
      ? [14, 4, 6, 8] 
      : this.paperWidth === '76mm'
      ? [20, 5, 7, 10]
      : [24, 5, 8, 11];
    
    const formatted = [
      col1.substring(0, widths[0]).padEnd(widths[0]),
      col2.substring(0, widths[1]).padStart(widths[1]),
      col3.substring(0, widths[2]).padStart(widths[2]),
      col4.substring(0, widths[3]).padStart(widths[3]),
    ].join('');
    
    return this.line(formatted);
  }

  // Feed paper
  feed(lines: number = 3): this {
    this.buffer.push(ESC, 0x64, lines); // ESC d n
    return this;
  }

  // Cut paper (full cut)
  cut(): this {
    this.buffer.push(GS, 0x56, 0x00); // GS V 0 - Full cut
    return this;
  }

  // Partial cut
  partialCut(): this {
    this.buffer.push(GS, 0x56, 0x01); // GS V 1 - Partial cut
    return this;
  }

  // Open cash drawer
  openCashDrawer(): this {
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xFA); // ESC p 0 25 250
    return this;
  }

  // Set line spacing
  setLineSpacing(n: number): this {
    this.buffer.push(ESC, 0x33, n); // ESC 3 n
    return this;
  }

  // Reset line spacing to default
  resetLineSpacing(): this {
    this.buffer.push(ESC, 0x32); // ESC 2
    return this;
  }

  // Beep (if printer supports it)
  beep(times: number = 1, duration: number = 100): this {
    this.buffer.push(ESC, 0x42, times, duration / 50); // ESC B n t
    return this;
  }

  // Get the built command buffer as Uint8Array
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  // Get buffer as base64 string
  toBase64(): string {
    const uint8Array = this.build();
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  // Reset buffer
  reset(): this {
    this.buffer = [];
    return this.initialize();
  }

  // Get chars per line for current paper width
  getCharsPerLine(): number {
    return this.charsPerLine;
  }
}

// Helper to convert paper format to ESC/POS paper width
export const formatToPaperWidth = (format: string): PaperWidth => {
  switch (format) {
    case '58mm':
      return '58mm';
    case '76mm':
      return '76mm';
    default:
      return '80mm';
  }
};
