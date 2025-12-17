/**
 * ImageWrangler - BMP Encoder
 * Lightweight client-side BMP encoder (24-bit RGB)
 * Used because browser canvas.convertToBlob('image/bmp') is unreliable/unsupported across browsers.
 */

/**
 * Encodes an ImageData object to a BMP Blob
 * @param imageData - The ImageData to encode
 * @returns Blob containing BMP data
 */
export function encodeBMP(imageData: ImageData): Blob {
    const { width, height, data } = imageData;
    const padding = (4 - (width * 3) % 4) % 4;
    const fileSize = 54 + (width * 3 + padding) * height; // Header + Data

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // --- Bitmap File Header (14 bytes) ---
    view.setUint16(0, 0x424D, false); // "BM" signature
    view.setUint32(2, fileSize, true); // File size
    view.setUint16(6, 0, true); // Reserved
    view.setUint16(8, 0, true); // Reserved
    view.setUint32(10, 54, true); // Offset to pixel data

    // --- DIB Header (BITMAPINFOHEADER) (40 bytes) ---
    view.setUint32(14, 40, true); // Header size
    view.setInt32(18, width, true); // Width
    view.setInt32(22, -height, true); // Height (negative for top-down)
    view.setUint16(26, 1, true); // Planes
    view.setUint16(28, 24, true); // Bits per pixel (24-bit RGB)
    view.setUint32(30, 0, true); // Compression (RGB = 0)
    view.setUint32(34, 0, true); // Image size (can be 0 for RGB)
    view.setInt32(38, 2835, true); // X pixels/meter (72 DPI)
    view.setInt32(42, 2835, true); // Y pixels/meter (72 DPI)
    view.setUint32(46, 0, true); // Colors used
    view.setUint32(50, 0, true); // Important colors

    // --- Pixel Data ---
    let offset = 54;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // BMP is BGR, not RGB
            view.setUint8(offset++, data[i + 2]); // B
            view.setUint8(offset++, data[i + 1]); // G
            view.setUint8(offset++, data[i]);     // R
            // Alpha is ignored in 24-bit BMP
        }
        // Padding
        for (let p = 0; p < padding; p++) {
            view.setUint8(offset++, 0);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}
