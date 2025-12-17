/**
 * ImageWrangler - TypeScript Type Definitions
 * All types for image processing, options, and state management
 */


import type { PixelCrop } from 'react-image-crop';

/** Supported output image formats */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'bmp';

export const SecurityConstants = {
  MAX_WIDTH: 15000,
  MAX_HEIGHT: 15000,
  MAX_PIXELS: 50_000_000, // 50MP limit for decompression bomb protection
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB input limit
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
};


/** Crop region coordinates and dimensions */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Processing options for a single image */
export interface ProcessOptions {
  format: ImageFormat;
  quality: number;        // 1-100, only applies to lossy formats
  width: number;          // Target width in pixels
  height: number;         // Target height in pixels
  keepAspectRatio: boolean;

  crop?: PixelCrop;
  targetSizeKB?: number; // For "Resize by Weight"
}

/** Status of image processing */
export type ImageStatus = 'pending' | 'processing' | 'done' | 'error';

/** Represents a single image file in the app */
export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  options: ProcessOptions;
  status: ImageStatus;
  processedFile?: Blob;
  processedUrl?: string;
  error?: string;
}

/** Message sent to the image processing worker */
export interface WorkerMessage {
  id: string;
  type: 'PROCESS' | 'VALIDATE';
  file?: File;
  options?: ProcessOptions;
}

/** Response from the image processing worker */
export interface WorkerResponse {
  id: string;
  type: 'PROCESS_COMPLETE' | 'PROCESS_ERROR' | 'VALIDATE_RESULT';
  result?: Blob;
  isValid?: boolean;
  error?: string;
}

/** File validation result */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: string;
}
