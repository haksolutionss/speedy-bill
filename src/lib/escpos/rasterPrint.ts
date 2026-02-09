/**
 * Convert canvas to ESC/POS raster commands for thermal printer
 * POSYTUDE YHD-8330 (203 DPI, 80mm)
 * 
 * CRITICAL: Uses pure black/white thresholding (no grayscale)
 * Prevents faded/washed-out prints on thermal printers
 */

const PRINTER_DPI = 203;
const PRINTABLE_MM = 72;
const DOT_WIDTH = Math.floor((PRINTABLE_MM / 25.4) * PRINTER_DPI);  // ≈ 576

/**
 * Convert canvas to ESC/POS GS v 0 raster bitmap commands
 * 
 * Algorithm:
 * 1. Extract image data from canvas
 * 2. Convert to pure black/white (threshold @ 160)
 * 3. Pack bits into bytes (8 pixels per byte)
 * 4. Build ESC/POS command sequence
 */
export function canvasToRasterCommands(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d')!;

  // Get scaled dimensions
  const scaledWidth = canvas.width;
  const scaledHeight = canvas.height;

  // Calculate actual printer dimensions (scale down 2×)
  const printerWidth = scaledWidth / 2;
  const printerHeight = scaledHeight / 2;

  // Create downscaled canvas for actual print size
  const printCanvas = document.createElement('canvas');
  printCanvas.width = printerWidth;
  printCanvas.height = printerHeight;
  const printCtx = printCanvas.getContext('2d')!;

  // Draw scaled-down image
  printCtx.drawImage(canvas, 0, 0, printerWidth, printerHeight);

  // Extract pixel data
  const imageData = printCtx.getImageData(0, 0, printerWidth, printerHeight);
  const pixels = imageData.data;

  // Convert to black/white bitmap with thresholding
  const bwBitmap = convertToBlackWhite(pixels, printerWidth, printerHeight);

  // Pack into raster bytes
  const rasterData = packBitmap(bwBitmap, printerWidth, printerHeight);

  // Build ESC/POS command
  return buildRasterCommand(rasterData, printerWidth, printerHeight);
}

/**
 * Convert RGBA pixel data to pure black/white bitmap
 * 
 * Threshold: gray < 160 → black, otherwise → white
 * This prevents thermal printer from rendering gray as faded/incomplete
 */
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

    // Convert to grayscale
    const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);

    // Apply threshold: < 160 is black (1), >= 160 is white (0)
    // Lower threshold = more black pixels (bolder output)
    const pixelIndex = i / 4;
    bitmap[pixelIndex] = gray < 160 ? 1 : 0;
  }

  return bitmap;
}

/**
 * Pack black/white bitmap into byte array
 * 8 pixels per byte (MSB first)
 */
function packBitmap(bitmap: Uint8Array, width: number, height: number): Uint8Array {
  // Calculate bytes per line (round up to nearest byte)
  const bytesPerLine = Math.ceil(width / 8);
  const totalBytes = bytesPerLine * height;

  const packed = new Uint8Array(totalBytes);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const pixel = bitmap[pixelIndex];

      if (pixel === 1) {
        const byteIndex = y * bytesPerLine + Math.floor(x / 8);
        const bitPosition = 7 - (x % 8);  // MSB first
        packed[byteIndex] |= (1 << bitPosition);
      }
    }
  }

  return packed;
}

/**
 * Build ESC/POS raster bitmap command
 * 
 * Format: GS v 0 m xL xH yL yH [data]
 * - GS v 0: Print raster bitmap
 * - m: Mode (0 = normal, 1 = double width, 2 = double height, 3 = quadruple)
 * - xL xH: Width in bytes (little-endian)
 * - yL yH: Height in dots (little-endian)
 * - [data]: Bitmap data
 */
function buildRasterCommand(
  rasterData: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const bytesPerLine = Math.ceil(width / 8);

  // Build command sequence
  const commands: number[] = [];

  // Initialize printer
  commands.push(0x1B, 0x40);  // ESC @ - Initialize

  // Set line spacing to 0 (compact)
  commands.push(0x1B, 0x33, 0x00);  // ESC 3 n

  // GS v 0 m xL xH yL yH [data]
  commands.push(0x1D, 0x76, 0x30, 0x00);  // GS v 0 (normal mode)

  // Width in bytes (little-endian)
  commands.push(bytesPerLine & 0xFF);
  commands.push((bytesPerLine >> 8) & 0xFF);

  // Height in dots (little-endian)
  commands.push(height & 0xFF);
  commands.push((height >> 8) & 0xFF);

  // Raster data
  for (let i = 0; i < rasterData.length; i++) {
    commands.push(rasterData[i]);
  }

  // Feed paper
  commands.push(0x1B, 0x64, 0x04);  // ESC d n - Feed 4 lines

  // Partial cut
  commands.push(0x1D, 0x56, 0x01);  // GS V m - Partial cut

  return new Uint8Array(commands);
}

/**
 * Debug: Export canvas as base64 PNG for inspection
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Debug: Get bitmap statistics
 */
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

    if (gray < 160) {
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