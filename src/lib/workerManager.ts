/**
 * ImageWrangler - Worker Manager
 * Manages Web Worker lifecycle and provides a Promise-based API with request
 * queuing, concurrency limits, and a watchdog so a hung worker can never leave
 * callers waiting forever.
 */

import type { ProcessOptions, ValidationResult, WorkerMessage, WorkerResponse } from './types';
import { generateId } from './utils';

// Hard concurrency limit - process only 2 images at a time to save memory
// on potential 50MP images.
const MAX_CONCURRENCY = 2;

// Watchdog: if a job produces no response in this window, the worker is
// declared stuck, torn down, and every caller is failed instead of hanging.
const JOB_TIMEOUT_MS = 60_000;

let activeJobs = 0;
const jobQueue: Array<{
    job: () => void;
    reject: (error: Error) => void;
}> = [];

// Worker instance (lazy initialized)
let worker: Worker | null = null;

interface PendingOperation {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

// Pending operations map
const pendingOperations = new Map<string, PendingOperation>();

/**
 * Tear down the worker and fail everything queued or in flight
 */
function resetWorker(reason: Error): void {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    pendingOperations.forEach((pending) => {
        clearTimeout(pending.timer);
        pending.reject(reason);
    });
    pendingOperations.clear();

    jobQueue.forEach(({ reject }) => reject(reason));
    jobQueue.length = 0;

    activeJobs = 0;
}

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
            const { id, type, result, isValid, width, height, error } = event.data;
            const pending = pendingOperations.get(id);

            if (!pending) {
                console.warn(`Received response for unknown/cancelled operation: ${id}`);
                return;
            }

            clearTimeout(pending.timer);
            pendingOperations.delete(id);
            activeJobs--;
            processNextJob();

            if (type === 'PROCESS_ERROR') {
                pending.reject(new Error(error || 'Unknown processing error'));
            } else if (type === 'PROCESS_COMPLETE') {
                if (result) {
                    pending.resolve(result);
                } else {
                    pending.reject(new Error('Processing completed without output result'));
                }
            } else if (type === 'VALIDATE_RESULT') {
                const validation: ValidationResult = { isValid: isValid ?? false, width, height, error };
                pending.resolve(validation);
            } else {
                pending.reject(new Error(`Unexpected worker response type: ${type}`));
            }
        };

        worker.onerror = (error) => {
            console.error('Worker error:', error);
            resetWorker(new Error('Worker crashed'));
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
            nextJob.job();
        }
    }
}

/**
 * Enqueue a job to be sent to the worker
 */
function enqueueJob(
    message: WorkerMessage,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    resolve: (value: any) => void,
    reject: (error: Error) => void
) {
    const job = () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const w = getWorker();
            timer = setTimeout(() => {
                console.warn(`Worker job ${message.id} (${message.type}) timed out after ${JOB_TIMEOUT_MS}ms`);
                resetWorker(new Error(
                    message.type === 'VALIDATE' ? 'Image validation timed out' : 'Image processing timed out'
                ));
            }, JOB_TIMEOUT_MS);

            pendingOperations.set(message.id, { resolve, reject, timer });
            w.postMessage(message); // Heavy payload transfer happens here
        } catch (err) {
            // Clean up the watchdog + pending entry first: a failed postMessage must not
            // leave a stale 60s timer behind that later kills unrelated in-flight jobs.
            if (timer) clearTimeout(timer);
            pendingOperations.delete(message.id);
            activeJobs--; // Revert slot if synchronous fail (e.g. clone error)
            reject(err instanceof Error ? err : new Error(String(err)));
            processNextJob();
        }
    };

    jobQueue.push({ job, reject });
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
 * Validate an image file using the Web Worker.
 * Resolves with the validation verdict plus decoded dimensions (reusing the
 * decode the validator already performs).
 */
export function validateImageAsync(file: File): Promise<ValidationResult> {
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
 * Terminate the worker and reject everything still pending or queued
 */
export function terminateWorker(): void {
    resetWorker(new Error('Worker terminated'));
}
