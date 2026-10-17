/**
 * ImageWrangler - TypeScript Type Definitions
 * All types for image processing, options, and state management
 */


/** Supported output image formats as const tuple */
export const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'bmp', 'avif'] as const;
export type ImageFormat = (typeof SUPPORTED_FORMATS)[number];

export const SecurityConstants = {
  MAX_WIDTH: 15000,
  MAX_HEIGHT: 15000,
  MAX_PIXELS: 50_000_000, // 50MP limit for decompression bomb protection
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB input limit
} as const;


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

  crop?: CropRegion;
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

/** A file that passed worker-side validation, carrying its decoded dimensions */
export interface ValidatedImage {
  file: File;
  width: number;
  height: number;
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
  width?: number;
  height?: number;
  error?: string;
}

/** File validation result */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: string;
  width?: number;
  height?: number;
}
