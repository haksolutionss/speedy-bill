import type { BillData } from './templates';

export const ESC = 0x1B;
export const GS = 0x1D;
export const LF = 0x0A;

export const PAPER_WIDTHS = {
  '58mm': { chars: 32, dotsWidth: 384 },
  '76mm': { chars: 42, dotsWidth: 512 },
  '80mm': { chars: 48, dotsWidth: 576 },
} as const;

export type PaperWidth = keyof typeof PAPER_WIDTHS;

export enum Alignment {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2,
}

export enum FontSize {
  NORMAL = 0x00,
  DOUBLE_HEIGHT = 0x10,
  DOUBLE_WIDTH = 0x20,
  DOUBLE_BOTH = 0x30,
}

function centerText(text: string, width: number): string {
  const pad = Math.max(0, width - text.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

export class ESCPOSBuilder {
  private buffer: number[] = [];
  private paperWidth: PaperWidth;
  private charsPerLine: number;

  constructor(paperWidth: PaperWidth = '80mm') {
    this.paperWidth = paperWidth;
    this.charsPerLine = PAPER_WIDTHS[paperWidth].chars;
    this.initialize();
  }

  initialize(): this {
    this.buffer.push(ESC, 0x40);   // reset
    this.resetLineSpacing();       // ADD THIS
    return this;
  }


  align(alignment: Alignment): this {
    this.buffer.push(ESC, 0x61, alignment);
    return this;
  }

  setFontSize(size: FontSize): this {
    this.buffer.push(GS, 0x21, size);
    return this;
  }

  bold(on: boolean): this {
    this.buffer.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  underline(on: boolean): this {
    this.buffer.push(ESC, 0x2D, on ? 1 : 0);
    return this;
  }

  inverse(on: boolean): this {
    this.buffer.push(GS, 0x42, on ? 1 : 0);
    return this;
  }

  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.buffer.push(...bytes);
    return this;
  }

  line(str: string = ''): this {
    return this.text(str).newline();
  }

  newline(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  horizontalLine(char: string = '-'): this {
    return this.line(char.repeat(this.charsPerLine));
  }

  dottedLine(): this {
    return this.horizontalLine('.');
  }

  dashedLine(): this {
    return this.horizontalLine('-');
  }

  doubleLine(): this {
    return this.horizontalLine('=');
  }

  solidLine(): this {
    return this.horizontalLine('_');
  }

  rightDottedLine(width = 16): this {
    const spaces = this.charsPerLine - width;
    return this.line(' '.repeat(spaces) + '.'.repeat(width));
  }

  drawBoxRow(left: string, center: string, right: string): this {
    const width = this.charsPerLine;
    const contentWidth = width - 2; // for | |

    const half = Math.floor(contentWidth / 2);

    const leftText = centerText(left, half);
    const rightText = centerText(right, contentWidth - half);

    return this.line(`|${leftText} | ${rightText}|`);
  }

  drawBoxLine(): this {
    return this.line('+' + '_'.repeat(this.charsPerLine - 2) + '+');
  }

  twoColumns(left: string, right: string): this {
    const maxLeftWidth = this.charsPerLine - right.length - 1;
    const leftTrimmed = left.substring(0, maxLeftWidth);
    const spaces = this.charsPerLine - leftTrimmed.length - right.length;
    return this.line(leftTrimmed + ' '.repeat(Math.max(1, spaces)) + right);
  }

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

  fourColumns(col1: string, col2: string, col3: string, col4: string): this {
    const widths = this.paperWidth === '58mm'
      ? [16, 4, 5, 7]
      : this.paperWidth === '76mm'
        ? [24, 5, 6, 7]
        : [18, 4, 10, 12];


    const formatted = [
      col1.substring(0, widths[0]).padEnd(widths[0]),
      col2.substring(0, widths[1]).padStart(widths[1]),
      col3.substring(0, widths[2]).padStart(widths[2]),
      col4.substring(0, widths[3]).padStart(widths[3]),
    ].join(' ');

    return this.line(formatted);
  }

  feed(lines: number = 3): this {
    this.buffer.push(ESC, 0x64, lines);
    return this;
  }

  cut(): this {
    this.buffer.push(GS, 0x56, 0x00);
    return this;
  }

  partialCut(): this {
    this.buffer.push(GS, 0x56, 0x01);
    return this;
  }

  openCashDrawer(): this {
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xFA);
    return this;
  }

  setLineSpacing(n: number): this {
    this.buffer.push(ESC, 0x33, n);
    return this;
  }

  resetLineSpacing(): this {
    this.buffer.push(ESC, 0x32);
    return this;
  }

  beep(times: number = 1, duration: number = 100): this {
    this.buffer.push(ESC, 0x42, times, duration / 50);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toBase64(): string {
    const uint8Array = this.build();
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  reset(): this {
    this.buffer = [];
    return this.initialize();
  }

  getCharsPerLine(): number {
    return this.charsPerLine;
  }
}

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




