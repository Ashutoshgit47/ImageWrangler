/**
 * ImageWrangler - Worker Manager
 * Manages Web Worker lifecycle and provides a Promise-based API
 * with request queuing and concurrency limits to prevent memory exhaustion.
 */

import type { ProcessOptions, WorkerMessage, WorkerResponse } from './types';
import { generateId } from './utils';

// Hard concurrency limit - process only 2 images at a time to save memory
// on potential 50MP images.
const MAX_CONCURRENCY = 2;
let activeJobs = 0;
const jobQueue: Array<() => void> = [];

// Worker instance (lazy initialized)
let worker: Worker | null = null;

// Pending operations map
const pendingOperations = new Map<string, {
    resolve: (value: Blob | boolean) => void;
    reject: (error: Error) => void;
}>();

/**
 * Get or create the worker instance
 */
function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(
            new URL('../workers/imageProcessor.worker.ts', import.meta.url),
            { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { id, type, result, isValid, error } = event.data;
            const pending = pendingOperations.get(id);

            // Job finished (success or failure), release slot
            if (pending) {
                pendingOperations.delete(id);
                activeJobs--;
                processNextJob();

                if (type === 'PROCESS_ERROR') {
                    pending.reject(new Error(error || 'Unknown processing error'));
                } else if (type === 'PROCESS_COMPLETE' && result) {
                    pending.resolve(result);
                } else if (type === 'VALIDATE_RESULT') {
                    pending.resolve(isValid ?? false);
                }
            } else {
                console.warn(`Received response for unknown/cancelled operation: ${id}`);
                // Even if unknown, we assume a slot frees up if it was a real message?
                // But we decrement on matching ID. If ID mismatch, maybe logical error.
                // Safety: ensure unrelated messages don't break logic.
            }
        };

        worker.onerror = (error) => {
            console.error('Worker error:', error);
            // Reject all pending operations
            pendingOperations.forEach((pending) => {
                pending.reject(new Error('Worker crashed'));
            });
            pendingOperations.clear();

            activeJobs = 0;
            jobQueue.length = 0; // Clear queue

            // Reset worker
            worker?.terminate();
            worker = null;
        };
    }

    return worker;
}

/**
 * Process the next job in the queue if concurrency slot allows
 */
function processNextJob() {
    if (activeJobs < MAX_CONCURRENCY && jobQueue.length > 0) {
        const nextJob = jobQueue.shift();
        if (nextJob) {
            activeJobs++;
            nextJob();
        }
    }
}

/**
 * Enqueue a job to be sent to the worker
 */
function enqueueJob(message: WorkerMessage, resolve: any, reject: any) {
    const job = () => {
        try {
            const w = getWorker();
            pendingOperations.set(message.id, { resolve, reject });
            w.postMessage(message); // Heavy payload transfer happens here
        } catch (err) {
            activeJobs--; // Revert slot if synchronous fail (e.g. clone error)
            reject(err);
            processNextJob();
        }
    };

    jobQueue.push(job);
    processNextJob();
}

/**
 * Process an image using the Web Worker with concurrency limiting
 * Returns a Promise that resolves to the processed Blob
 */
export function processImageAsync(file: File, options: ProcessOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const id = generateId();
        const message: WorkerMessage = {
            id,
            type: 'PROCESS',
            file,
            options,
        };
        enqueueJob(message, resolve, reject);
    });
}

/**
 * Validate an image file using the Web Worker
 * Returns a Promise that resolves to a boolean
 */
export function validateImageAsync(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const id = generateId();
        const message: WorkerMessage = {
            id,
            type: 'VALIDATE',
            file,
        };
        enqueueJob(message, resolve, reject);
    });
}

/**
 * Terminate the worker and clean up resources
 */
export function terminateWorker(): void {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    pendingOperations.clear();
    jobQueue.length = 0;
    activeJobs = 0;
}
