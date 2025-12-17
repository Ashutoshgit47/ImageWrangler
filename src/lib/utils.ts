/**
 * ImageWrangler - Utility Functions
 * Common utilities for class merging and formatting
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 * Handles conditional classes and deduplication
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generate a unique ID for tracking images
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simple debounce function
 */
export function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
): (...args: Parameters<F>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>) => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };
}
