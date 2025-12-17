/**
 * ImageWrangler - Image Dropzone Component
 * Handles drag & drop, file picker, and clipboard paste for image uploads
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { validateImageFile } from '../lib/fileValidation';

interface ImageDropzoneProps {
    onFilesAdded: (files: File[]) => void;
    onValidationError?: (invalidFiles: string[]) => void;
}

export function ImageDropzone({ onFilesAdded, onValidationError }: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files);
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        // Validate each file
        for (const file of imageFiles) {
            const result = await validateImageFile(file);
            if (result.isValid) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
                console.warn(`Invalid file: ${file.name} - ${result.error}`);
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
        if (event.clipboardData && event.clipboardData.files.length > 0) {
            await handleFiles(event.clipboardData.files);
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
                "relative flex flex-col items-center justify-center w-full p-8 lg:p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out transform",
                isDragging
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-xl"
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
            aria-label="Upload images by clicking, dragging files, or pasting from clipboard"
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                aria-hidden="true"
            />
            <div className="flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in zoom-in duration-500">
                <div className={cn(
                    "p-4 rounded-full bg-background/50 ring-1 ring-border/50 transition-all duration-300",
                    isDragging ? "bg-primary/20 ring-primary/50 scale-110" : ""
                )}>
                    <UploadCloud
                        className={cn(
                            "w-10 h-10 text-muted-foreground transition-colors duration-300",
                            isDragging && "text-primary"
                        )}
                    />
                </div>
                <div>
                    <p className="text-xl font-semibold mb-1">
                        Drag & drop images here
                    </p>
                    <p className="text-sm text-muted-foreground">
                        or click to select from your device
                    </p>
                </div>
                <p className="text-xs text-muted-foreground/60 pt-2 max-w-xs mx-auto">
                    Secure client-side processing. Your photos never leave your device.
                </p>
            </div>
        </div>
    );
}

export default ImageDropzone;
