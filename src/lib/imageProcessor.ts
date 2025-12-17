/**
 * ImageWrangler - Image Processing Utilities
 * Canvas-based image processing for compression, resize, format conversion, and crop
 * Designed to run in both main thread and Web Worker
 */

import { encodeBMP } from './bmpEncoder';
import { type ProcessOptions, type CropRegion, SecurityConstants } from './types';

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
    // Create ImageBitmap from file
    const bitmap = await createImageBitmap(file);

    try {
        // Determine source region (full image or crop area)
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

        // Target dimensions - Sanitize inputs
        const targetWidth = Math.max(1, Math.min(Math.round(options.width), SecurityConstants.MAX_WIDTH));
        const targetHeight = Math.max(1, Math.min(Math.round(options.height), SecurityConstants.MAX_HEIGHT));

        // SECURITY CHECK: Decompression bomb protection
        // Verify output dimensions verify strict limits
        if (targetWidth * targetHeight > SecurityConstants.MAX_PIXELS) {
            throw new Error(`Output dimensions exceed safety limit (${SecurityConstants.MAX_PIXELS} pixels).`);
        }

        // Create canvas (OffscreenCanvas for worker support)
        // Hard limit check before allocation
        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        let ctx: OffscreenCanvasRenderingContext2D | null = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas 2D context');
        }

        // When converting to JPEG or BMP (non-alpha), fill background with white
        const nonAlphaFormats = ['jpeg', 'bmp'];
        if (nonAlphaFormats.includes(options.format)) {
            // Check if source has transparency potential
            const hasAlpha = file.type === 'image/png' || file.type === 'image/webp'; // BMP inputs might, but unlikely to be handled here without header check
            // Always fill white for safety for non-alpha outputs
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // Draw image with crop and resize
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

        // --- Export Logic ---

        // 1. BMP Export (Custom)
        if (options.format === 'bmp') {
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const bmpBlob = encodeBMP(imageData);
            ctx = null; // cleanup
            return bmpBlob;
        }

        // 2. Standard Export (JPEG, PNG, WebP)
        const mimeType = `image/${options.format}`;
        let quality = (options.format === 'jpeg' || options.format === 'webp')
            ? options.quality / 100
            : undefined;

        // Resize by Weight Logic (Binary Search for Quality)
        if (options.targetSizeKB && options.targetSizeKB > 0 && (options.format === 'jpeg' || options.format === 'webp')) {
            const targetBytes = options.targetSizeKB * 1024;
            let minQ = 0.01;
            let maxQ = 1.0;
            let bestBlob: Blob | null = null;

            // Try max quality first
            let attempt = await canvas.convertToBlob({ type: mimeType, quality: maxQ });
            if (attempt.size <= targetBytes) {
                return attempt;
            }

            // Binary search (5 iterations is usually enough)
            for (let i = 0; i < 5; i++) {
                const midQ = (minQ + maxQ) / 2;
                attempt = await canvas.convertToBlob({ type: mimeType, quality: midQ });

                if (attempt.size < targetBytes) {
                    bestBlob = attempt;
                    minQ = midQ; // Try higher
                } else {
                    maxQ = midQ; // Too big, lower quality
                }
            }

            if (bestBlob) return bestBlob;
            // If still failing, return lowest quality result
            return await canvas.convertToBlob({ type: mimeType, quality: 0.01 });
        }
        /**
         * Check if AVIF format is supported in current browser
         */
        // Removed AVIF check

        // Normal export
        let blob: Blob | null = null;
        try {
            blob = await canvas.convertToBlob({ type: mimeType, quality });
        } catch (e) {
            console.error("Canvas export failed", e);
            throw e;
        }

        ctx = null; // cleanup

        if (!blob) {
            throw new Error('Failed to convert canvas to blob');
        }

        return blob;

    } finally {
        // Always close bitmap to prevent memory leaks
        bitmap.close();
    }
}

/**
 * Merge multiple images into a single grid
 */
export async function mergeImages(files: (File | Blob)[]): Promise<Blob> {
    if (files.length === 0) throw new Error("No images to merge");

    // Decoded bitmaps
    const bitmaps: ImageBitmap[] = [];
    let totalArea = 0;

    // Limits
    const MAX_MERGE_PIXELS = SecurityConstants.MAX_PIXELS; // 50MP limit for output

    try {
        // Decode all images
        for (const file of files) {
            const bmp = await createImageBitmap(file);
            bitmaps.push(bmp);
            totalArea += bmp.width * bmp.height;
        }

        // Calculate grid
        const count = bitmaps.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        // Find max cell dimensions (simple grid)
        // Or packed? Simple grid is safer for now.
        const maxCellW = Math.max(...bitmaps.map(b => b.width));
        const maxCellH = Math.max(...bitmaps.map(b => b.height));

        const canvasWidth = maxCellW * cols;
        const canvasHeight = maxCellH * rows;

        // Security Check
        if (canvasWidth * canvasHeight > MAX_MERGE_PIXELS) {
            throw new Error(`Merged image size (${canvasWidth}x${canvasHeight}) exceeds safety limits.`);
        }

        // Draw
        const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Failed to create canvas context");

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        bitmaps.forEach((bmp, index) => {
            const r = Math.floor(index / cols);
            const c = index % cols;
            const x = c * maxCellW + (maxCellW - bmp.width) / 2; // Center in cell
            const y = r * maxCellH + (maxCellH - bmp.height) / 2;
            ctx.drawImage(bmp, x, y);
        });

        // Convert to Blob (JPEG default for merge)
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
        if (!blob) throw new Error("Failed to export merged image");

        return blob;

    } finally {
        bitmaps.forEach(b => b.close());
    }
}

/**
 * Get image dimensions from a File
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file);
        return { width: bitmap.width, height: bitmap.height };
    } finally {
        if (bitmap) bitmap.close();
    }
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export function calculateAspectRatioDimensions(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    lockAspect: boolean,
    changedDimension: 'width' | 'height'
): { width: number; height: number } {
    if (!lockAspect) {
        return { width: targetWidth, height: targetHeight };
    }

    const aspectRatio = sourceWidth / sourceHeight;

    if (changedDimension === 'width') {
        return {
            width: targetWidth,
            height: Math.round(targetWidth / aspectRatio),
        };
    } else {
        return {
            width: Math.round(targetHeight * aspectRatio),
            height: targetHeight,
        };
    }
}

/**
 * Create a crop region that covers the full image at a given aspect ratio
 */
export function createCenteredCrop(
    imageWidth: number,
    imageHeight: number,
    aspectRatio?: number
): CropRegion {
    if (!aspectRatio) {
        // Free crop - return full image
        return {
            x: 0,
            y: 0,
            width: imageWidth,
            height: imageHeight,
        };
    }

    let cropWidth: number;
    let cropHeight: number;

    if (imageWidth / imageHeight > aspectRatio) {
        // Image is wider than target aspect ratio
        cropHeight = imageHeight;
        cropWidth = cropHeight * aspectRatio;
    } else {
        // Image is taller than target aspect ratio
        cropWidth = imageWidth;
        cropHeight = cropWidth / aspectRatio;
    }

    return {
        x: (imageWidth - cropWidth) / 2,
        y: (imageHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
    };
}
