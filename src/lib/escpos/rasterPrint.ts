/**
 * Raster Bitmap Converter for ESC/POS Thermal Printers
 * Converts a canvas to monochrome bitmap and wraps in GS v 0 raster command
 *
 * Target: POSYTUDE YHD-8330 (80mm, 203 DPI, 576 dots width)
 */

const ESC = 0x1b;
const GS = 0x1d;

/**
 * Convert an HTMLCanvasElement to ESC/POS raster image bytes.
 *
 * Uses the GS v 0 command:
 *   GS v 0 m xL xH yL yH d1…dk
 * where each row is packed 1-bit-per-pixel, MSB-first, 1 = black.
 */
export function canvasToRasterCommands(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot get 2D context from canvas');
  }

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data; // RGBA flat array

  // Width in bytes (8 pixels per byte, padded to next byte)
  const byteWidth = Math.ceil(width / 8);

  // Convert to 1-bit monochrome
  const bitmapData = new Uint8Array(byteWidth * height);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < byteWidth; col++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = col * 8 + bit;
        if (x < width) {
          const idx = (row * width + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          // ITU-R BT.601 luminance; threshold 128
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < 128) {
            byte |= 0x80 >> bit; // MSB-first, 1 = black dot
          }
        }
      }
      bitmapData[row * byteWidth + col] = byte;
    }
  }

  // ── Build command buffer ──
  // ESC @ — initialise printer
  const init = new Uint8Array([ESC, 0x40]);

  // GS v 0 — raster bit image
  const xL = byteWidth & 0xff;
  const xH = (byteWidth >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  const header = new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

  // Feed + partial cut
  const footer = new Uint8Array([
    ESC, 0x64, 0x04, // ESC d 4 — feed 4 lines
    GS, 0x56, 0x01,  // GS V 1  — partial cut
  ]);

  // Concatenate
  const total = new Uint8Array(
    init.length + header.length + bitmapData.length + footer.length
  );
  let offset = 0;
  total.set(init, offset); offset += init.length;
  total.set(header, offset); offset += header.length;
  total.set(bitmapData, offset); offset += bitmapData.length;
  total.set(footer, offset);

  return total;
}
