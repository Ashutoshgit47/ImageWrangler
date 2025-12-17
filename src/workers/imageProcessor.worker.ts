/**
 * ImageWrangler - Web Worker for Image Processing
 * Handles all CPU-intensive image operations off the main thread
 * 
 * Supported operations:
 * - PROCESS: Compress, resize, convert, and crop images
 * - VALIDATE: Check if a file is a valid image
 */

import { processImage } from '../lib/imageProcessor';
import { validateImageFile } from '../lib/fileValidation';
import type { WorkerMessage, WorkerResponse } from '../lib/types';

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { id, type, file, options } = event.data;

    try {
        switch (type) {
            case 'PROCESS': {
                if (!file || !options) {
                    throw new Error('Missing file or options for PROCESS operation');
                }

                const result = await processImage(file, options);

                const response: WorkerResponse = {
                    id,
                    type: 'PROCESS_COMPLETE',
                    result,
                };

                self.postMessage(response);
                break;
            }

            case 'VALIDATE': {
                if (!file) {
                    throw new Error('Missing file for VALIDATE operation');
                }

                const validationResult = await validateImageFile(file);

                const response: WorkerResponse = {
                    id,
                    type: 'VALIDATE_RESULT',
                    isValid: validationResult.isValid,
                    error: validationResult.error,
                };

                self.postMessage(response);
                break;
            }

            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        const response: WorkerResponse = {
            id,
            type: 'PROCESS_ERROR',
            error: errorMessage,
        };

        self.postMessage(response);
    }
};

// Export empty object for TypeScript module compatibility
export { };
