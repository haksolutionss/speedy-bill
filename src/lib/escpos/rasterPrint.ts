const PRINTER_DPI = 203;
const PRINTABLE_MM = 72;
const DOT_WIDTH = Math.floor((PRINTABLE_MM / 25.4) * PRINTER_DPI);

export function canvasToRasterCommands(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d')!;

  const scaledCanvas = document.createElement('canvas');
  const scaledCtx = scaledCanvas.getContext('2d')!;

  const targetWidth = DOT_WIDTH;
  const targetHeight = Math.floor((canvas.height / canvas.width) * targetWidth);

  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;

  scaledCtx.fillStyle = '#FFFFFF';
  scaledCtx.fillRect(0, 0, targetWidth, targetHeight);
  scaledCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  const imageData = scaledCtx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imageData.data;

  const bwBitmap = convertToBlackWhite(pixels, targetWidth, targetHeight);
  const rasterData = packBitmap(bwBitmap, targetWidth, targetHeight);

  return buildRasterCommand(rasterData, targetWidth, targetHeight);
}

function convertToBlackWhite(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const bitmap = new Uint8Array(width * height);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);

    const pixelIndex = i / 4;
    bitmap[pixelIndex] = gray < 128 ? 1 : 0;
  }

  return bitmap;
}

function packBitmap(bitmap: Uint8Array, width: number, height: number): Uint8Array {
  const bytesPerLine = Math.ceil(width / 8);
  const totalBytes = bytesPerLine * height;

  const packed = new Uint8Array(totalBytes);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const pixel = bitmap[pixelIndex];

      if (pixel === 1) {
        const byteIndex = y * bytesPerLine + Math.floor(x / 8);
        const bitPosition = 7 - (x % 8);
        packed[byteIndex] |= (1 << bitPosition);
      }
    }
  }

  return packed;
}

function buildRasterCommand(
  rasterData: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const bytesPerLine = Math.ceil(width / 8);

  const commands: number[] = [];

  commands.push(0x1B, 0x40);

  commands.push(0x1B, 0x33, 0x00);

  commands.push(0x1D, 0x76, 0x30, 0x00);

  commands.push(bytesPerLine & 0xFF);
  commands.push((bytesPerLine >> 8) & 0xFF);

  commands.push(height & 0xFF);
  commands.push((height >> 8) & 0xFF);

  for (let i = 0; i < rasterData.length; i++) {
    commands.push(rasterData[i]);
  }

  commands.push(0x1B, 0x64, 0x04);

  commands.push(0x1D, 0x56, 0x01);

  return new Uint8Array(commands);
}

export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

export function getBitmapStats(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
  blackPixels: number;
  whitePixels: number;
  blackPercentage: number;
} {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let blackCount = 0;
  let whiteCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);

    if (gray < 128) {
      blackCount++;
    } else {
      whiteCount++;
    }
  }

  const total = blackCount + whiteCount;

  return {
    width: canvas.width,
    height: canvas.height,
    blackPixels: blackCount,
    whitePixels: whiteCount,
    blackPercentage: (blackCount / total) * 100,
  };
}