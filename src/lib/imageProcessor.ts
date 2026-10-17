/**
 * ImageWrangler - Image Processing Utilities
 * Canvas-based image processing for compression, resize, format conversion, and crop
 * Designed to run in both main thread and Web Worker
 */

import { encodeBMP } from './bmpEncoder';
import { type ProcessOptions, SecurityConstants } from './types';

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas && typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    const qualityValue = quality !== undefined ? quality : 0.92;
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      qualityValue
    );
  });
}

function getCanvasContext(canvas: OffscreenCanvas | HTMLCanvasElement): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  return canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

/**
 * Process an image file with the given options
 * Uses OffscreenCanvas for worker compatibility
 * Enforces strict memory and security limits
 *
 * @param file - The source image file
 * @param options - Processing options (format, quality, dimensions, crop)
 * @returns Processed image as a Blob
 */
export async function processImage(file: File, options: ProcessOptions): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  try {
    const isCropped = !!(options.crop && options.crop.width > 0 && options.crop.height > 0);
    const targetWidth = Math.max(1, Math.min(Math.round(options.width), SecurityConstants.MAX_WIDTH));
    const targetHeight = Math.max(1, Math.min(Math.round(options.height), SecurityConstants.MAX_HEIGHT));
    const isResized = targetWidth !== bitmap.width || targetHeight !== bitmap.height;
    
    // Normalize file.type (e.g. 'image/jpeg') to match options.format
    let originalMime = (file.type || '').toLowerCase();
    if (originalMime === 'image/jpg' || originalMime === 'image/pjpeg') originalMime = 'image/jpeg';
    else if (originalMime === 'image/x-ms-bmp' || originalMime === 'image/x-bmp') originalMime = 'image/bmp';
    // Handle edge case where file type might be empty or different
    if (!originalMime) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'jpg' || ext === 'jpeg') originalMime = 'image/jpeg';
        else if (ext === 'png') originalMime = 'image/png';
        else if (ext === 'webp') originalMime = 'image/webp';
        else if (ext === 'bmp') originalMime = 'image/bmp';
        else if (ext === 'avif') originalMime = 'image/avif';
    }
    const isFormatChanged = originalMime !== `image/${options.format}`;

    const isQualityMax = !options.targetSizeKB && options.quality === 100;
    const isUnderTarget = !!options.targetSizeKB && file.size <= options.targetSizeKB * 1024;

    // If the user requested NO changes (no crop, no resize, no format change),
    // AND they either want 100% Quality (no target size) OR the file already fits the target size,
    // just return the original unaltered file.
    // This prevents pointless re-encoding that strips metadata or changes size unpredictably.
    if (!isCropped && !isResized && !isFormatChanged && (isQualityMax || isUnderTarget)) {
      return file;
    }

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;

    if (options.crop && options.crop.width > 0 && options.crop.height > 0) {
      sourceX = Math.round(options.crop.x);
      sourceY = Math.round(options.crop.y);
      sourceWidth = Math.round(options.crop.width);
      sourceHeight = Math.round(options.crop.height);
    }


    if (targetWidth * targetHeight > SecurityConstants.MAX_PIXELS) {
      throw new Error(`Output dimensions exceed safety limit (${Math.round(SecurityConstants.MAX_PIXELS / 1_000_000)} MP).`);
    }

    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = getCanvasContext(canvas);

    if (!ctx) {
      throw new Error('Could not get canvas 2D context');
    }

    const nonAlphaFormats = ['jpeg', 'bmp'];
    if (nonAlphaFormats.includes(options.format)) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    if (options.format === 'bmp') {
      // BMP is uncompressed — output is always larger than JPEG/PNG source by design.
      // No size guard here; user explicitly chose BMP.
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      return encodeBMP(imageData);
    }

    const mimeType = `image/${options.format}`;
    const isLossy = options.format === 'jpeg' || options.format === 'webp' || options.format === 'avif';
    const rawQuality = typeof options.quality === 'number' && !isNaN(options.quality) ? options.quality : 92;
    const quality = isLossy ? Math.max(0.01, Math.min(1.0, rawQuality / 100)) : undefined;

    // Helper to safely convert canvas to blob with AVIF support verification
    const safeConvertToBlob = async (c: OffscreenCanvas | HTMLCanvasElement, mime: string, q?: number): Promise<Blob> => {
      const b = await canvasToBlob(c, mime, q);
      if (mime === 'image/avif' && b.type !== 'image/avif' && !b.type.includes('avif')) {
        throw new Error('AVIF export is not supported in this browser. Please select WebP or JPEG.');
      }
      return b;
    };

    // Bug G fix: improved binary search (8 iterations → ±0.4% precision vs old 5 → ±3%)
    // Also warns via console when target KB goal cannot be achieved.
    if (options.targetSizeKB && options.targetSizeKB > 0 && isLossy) {
      const targetBytes = options.targetSizeKB * 1024;
      let minQ = 0.01;
      let maxQ = 1.0;
      let bestBlob: Blob | null = null;

      // Fast-path: if max quality already fits, return immediately
      const maxAttempt = await safeConvertToBlob(canvas, mimeType, maxQ);
      if (maxAttempt.size <= targetBytes) {
        // Size guard: only return original if user made no geometry or format edits
        if (!isResized && !isCropped && !isFormatChanged && maxAttempt.size > file.size && file.size <= targetBytes) {
          return file;
        }
        return maxAttempt;
      }

      for (let i = 0; i < 8; i++) {
        const midQ = (minQ + maxQ) / 2;
        const attempt = await safeConvertToBlob(canvas, mimeType, midQ);

        if (attempt.size <= targetBytes) {
          bestBlob = attempt;
          minQ = midQ; // Try higher quality
        } else {
          maxQ = midQ; // Too large, reduce quality
        }
      }

      if (bestBlob) return bestBlob;

      // Still no blob under target — return minimum quality with a warning
      const minAttempt = await safeConvertToBlob(canvas, mimeType, 0.01);
      console.warn(
        `[ImageWrangler] Target size ${options.targetSizeKB}KB cannot be achieved. ` +
        `Minimum output at quality=1% is ${Math.round(minAttempt.size / 1024)}KB.`
      );
      return minAttempt;
    }

    const blob = await safeConvertToBlob(canvas, mimeType, quality);

    // Size guard: only return original file if user did NOT resize, crop, or change format.
    // If user edited geometry or format, returning the original file corrupts their changes!
    if (!isResized && !isCropped && !isFormatChanged && blob.size > file.size) {
      return file;
    }

    return blob;

  } finally {
    bitmap.close();
  }
}

/**
 * Merge multiple images into a single grid
 */
export async function mergeImages(files: (File | Blob)[]): Promise<Blob> {
  if (files.length === 0) throw new Error("No images to merge");

  const bitmaps: ImageBitmap[] = [];

  const MAX_MERGE_PIXELS = SecurityConstants.MAX_PIXELS;

  try {
    for (const file of files) {
      const bmp = await createImageBitmap(file);
      bitmaps.push(bmp);
    }

    const count = bitmaps.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const maxCellW = Math.max(...bitmaps.map(b => b.width));
    const maxCellH = Math.max(...bitmaps.map(b => b.height));

    let cellW = maxCellW;
    let cellH = maxCellH;
    let canvasWidth = cellW * cols;
    let canvasHeight = cellH * rows;

    if (canvasWidth * canvasHeight > MAX_MERGE_PIXELS) {
      const scale = Math.sqrt(MAX_MERGE_PIXELS / (canvasWidth * canvasHeight));
      cellW = Math.max(1, Math.floor(maxCellW * scale));
      cellH = Math.max(1, Math.floor(maxCellH * scale));
      canvasWidth = cellW * cols;
      canvasHeight = cellH * rows;
    }

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = getCanvasContext(canvas);
    if (!ctx) throw new Error("Failed to create canvas context");

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    bitmaps.forEach((bmp, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const aspect = bmp.width / bmp.height;
      let drawW = cellW;
      let drawH = Math.round(drawW / aspect);
      if (drawH > cellH) {
        drawH = cellH;
        drawW = Math.round(drawH * aspect);
      }
      const x = Math.round(c * cellW + (cellW - drawW) / 2);
      const y = Math.round(r * cellH + (cellH - drawH) / 2);
      ctx.drawImage(bmp, x, y, drawW, drawH);
    });

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
    return blob;

  } finally {
    bitmaps.forEach(b => b.close());
  }
}

