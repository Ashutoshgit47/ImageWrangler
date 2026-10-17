/**
 * ImageWrangler - Image Dropzone Component
 * Handles drag & drop, file picker, and clipboard paste for image uploads
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadCloud } from './icons';
import { cn } from '../lib/utils';
import { validateImageAsync } from '../lib/workerManager';
import type { ValidatedImage } from '../lib/types';
import { useTranslation } from '../lib/i18n';

interface ImageDropzoneProps {
    onFilesAdded: (files: ValidatedImage[]) => void;
    onValidationError?: (invalidFiles: string[]) => void;
}

/** True when the paste target is a text field, so clipboard pasting keeps working there */
function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function ImageDropzone({ onFilesAdded, onValidationError }: ImageDropzoneProps) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // A drop that lands outside the dropzone would otherwise make the browser
    // navigate to the dropped file and discard the current session.
    useEffect(() => {
        const preventNavigation = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
        };
        window.addEventListener('dragover', preventNavigation);
        window.addEventListener('drop', preventNavigation);
        return () => {
            window.removeEventListener('dragover', preventNavigation);
            window.removeEventListener('drop', preventNavigation);
        };
    }, []);

    const handleFiles = useCallback(async (files: FileList | File[] | null) => {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files);
        const validFiles: ValidatedImage[] = [];
        const invalidFiles: string[] = [];

        // Validate one file at a time in the worker: a single decode in flight,
        // no memory spikes, and a bad file cannot reject the whole batch.
        for (const file of imageFiles) {
            try {
                const result = await validateImageAsync(file);
                if (result.isValid) {
                    validFiles.push({ file, width: result.width ?? 0, height: result.height ?? 0 });
                } else {
                    invalidFiles.push(file.name);
                    console.warn(`Invalid file: ${file.name} - ${result.error}`);
                }
            } catch (error) {
                invalidFiles.push(file.name);
                console.warn(`Validation failed for ${file.name}:`, error);
            }
        }

        if (validFiles.length > 0) {
            onFilesAdded(validFiles);
        }

        if (invalidFiles.length > 0) {
            onValidationError?.(invalidFiles);
        }
    }, [onFilesAdded, onValidationError]);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear isDragging if the cursor left the dropzone entirely,
        // not when moving over a child element inside it.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        // Never hijack a paste aimed at a text field
        if (isEditableTarget(event.target) || !event.clipboardData) return;

        const pastedFiles: File[] = [];

        if (event.clipboardData.files && event.clipboardData.files.length > 0) {
            for (let i = 0; i < event.clipboardData.files.length; i++) {
                pastedFiles.push(event.clipboardData.files[i]);
            }
        } else if (event.clipboardData.items) {
            for (let i = 0; i < event.clipboardData.items.length; i++) {
                const item = event.clipboardData.items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) pastedFiles.push(file);
                }
            }
        }

        if (pastedFiles.length > 0) {
            event.preventDefault();
            await handleFiles(pastedFiles);
        }
    }, [handleFiles]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handlePaste]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full p-6 sm:p-8 lg:p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out transform",
                isDragging
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                    : "border-border/50 hover:border-primary/50 hover:bg-muted/30 hover:scale-[1.01]"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={t('dropzone_aria')}
        >
            <input
                id="hidden-file-input"
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/bmp,image/avif"
                className="hidden"
                onChange={(e) => {
                    handleFiles(e.target.files);
                    // Reset value so picking the same file again triggers onChange
                    e.target.value = '';
                }}
                aria-hidden="true"
            />
            <div className="flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5">
                <div className={cn(
                    "p-3.5 sm:p-4 rounded-full bg-card ring-1 ring-border/50 transition-all duration-300",
                    isDragging ? "bg-primary/10 ring-primary/50 scale-110" : ""
                )}>
                    <UploadCloud
                        className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground transition-colors duration-300",
                            isDragging && "text-primary"
                        )}
                    />
                </div>
                <div>
                    <p className="font-display text-xl sm:text-2xl font-medium tracking-tight mb-1">
                        {t('dropzone_title')}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {t('dropzone_subtitle')}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground/60 pt-2 max-w-xs mx-auto">
                    {t('dropzone_privacy')}
                </p>
            </div>
        </div>
    );
}

export default ImageDropzone;
