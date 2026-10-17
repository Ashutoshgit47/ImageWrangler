/**
 * ImageWrangler - Main Application Component
 * Orchestrates image upload, processing, batch download, and i18n
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageFile, ProcessOptions, ValidatedImage } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { ImageDropzone } from './ImageDropzone';
import { ImageCard } from './ImageCard';
import { FAQ } from './FAQ';
import { Header } from './Header';
import { processImageAsync } from '../lib/workerManager';
import { mergeImages } from '../lib/imageProcessor';
import { sanitizeFilename } from '../lib/fileValidation';
import { generateId, cn } from '../lib/utils';
import { Sparkles, Layers, FileDown, FolderDown, CheckSquare, Square, Trash2 } from './icons';
import JSZip from 'jszip';
import FloatingActionButton from './FloatingActionButton';

/** Output extension for a given format */
function outputExtension(format: ProcessOptions['format']): string {
    return format === 'jpeg' ? 'jpg' : format;
}

/** Sanitized base name (without extension) for downloads and ZIP entries */
function downloadBaseName(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    return sanitizeFilename(dot > 0 ? fileName.slice(0, dot) : fileName);
}

/** Pick a unique `<name>.<ext>` inside `usedNames` */
function uniqueOutputName(base: string, ext: string, usedNames: Set<string>): string {
    let finalName = base;
    let count = 0;
    while (usedNames.has(`${finalName}.${ext}`)) {
        count++;
        finalName = `${base}_${count}`;
    }
    usedNames.add(`${finalName}.${ext}`);
    return `${finalName}.${ext}`;
}

export function ImageWrangler() {
    const { t } = useTranslation();
    const [images, setImages] = useState<ImageFile[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isZipping, setIsZipping] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Track object URLs for memory leak prevention
    const objectUrls = useRef(new Set<string>());

    // Concurrency and race-condition tracking
    const processingVersionRef = useRef(new Map<string, number>());
    const debounceTimeoutRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    const imagesRef = useRef<ImageFile[]>([]);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep imagesRef synchronized
    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    // Cleanup object URLs and pending timers on unmount
    useEffect(() => {
        const urls = objectUrls.current;
        const timers = debounceTimeoutRef.current;
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
            timers.forEach(clearTimeout);
            timers.clear();
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    // Toast helper — a single tracked timer, so a new toast never gets
    // dismissed early by a previous toast's timeout.
    const showToast = useCallback((message: string) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(message);
        toastTimeoutRef.current = setTimeout(() => {
            toastTimeoutRef.current = null;
            setToastMessage(null);
        }, 5000);
    }, []);

    // Cancel any debounced work and discard in-flight results for an image
    const cancelImageWork = useCallback((id: string) => {
        const timeout = debounceTimeoutRef.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            debounceTimeoutRef.current.delete(id);
        }
        // Dropping the version entry makes any in-flight worker result stale
        processingVersionRef.current.delete(id);
    }, []);

    // Process a single image
    const processSingleImage = useCallback(async (id: string, initialImage?: ImageFile) => {
        const currentVersion = (processingVersionRef.current.get(id) || 0) + 1;
        processingVersionRef.current.set(id, currentVersion);

        const targetImage = initialImage || imagesRef.current.find(img => img.id === id);
        if (!targetImage) return;

        setImages(prev => {
            const next = prev.map(img =>
                img.id === id ? { ...img, status: 'processing' as const } : img
            );
            imagesRef.current = next;
            return next;
        });

        try {
            const processedBlob = await processImageAsync(targetImage.file, targetImage.options);

            // Discard stale async completions
            if (processingVersionRef.current.get(id) !== currentVersion) {
                return;
            }

            const processedUrl = URL.createObjectURL(processedBlob);
            objectUrls.current.add(processedUrl);

            setImages(prev => {
                const next = prev.map(img => {
                    if (img.id === id) {
                        if (img.processedUrl && img.processedUrl !== img.previewUrl) {
                            URL.revokeObjectURL(img.processedUrl);
                            objectUrls.current.delete(img.processedUrl);
                        }
                        return { ...img, status: 'done' as const, processedFile: processedBlob, processedUrl };
                    }
                    return img;
                });
                imagesRef.current = next;
                return next;
            });
        } catch (error) {
            console.error('Processing error:', error);
            if (processingVersionRef.current.get(id) !== currentVersion) return;

            setImages(prev => {
                const next = prev.map(img =>
                    img.id === id ? { ...img, status: 'error' as const, error: error instanceof Error ? error.message : 'Failed' } : img
                );
                imagesRef.current = next;
                return next;
            });
            showToast(error instanceof Error ? error.message : t('toast_process_failed'));
        }
    }, [showToast, t]);

    // Per-image debouncing
    const debouncedProcess = useCallback((id: string) => {
        const currentTimeout = debounceTimeoutRef.current.get(id);
        if (currentTimeout) {
            clearTimeout(currentTimeout);
        }

        const timeout = setTimeout(() => {
            debounceTimeoutRef.current.delete(id);
            processSingleImage(id);
        }, 500);

        debounceTimeoutRef.current.set(id, timeout);
    }, [processSingleImage]);

    // Handle new files that already passed worker validation
    const handleFilesAdded = useCallback(async (newFiles: ValidatedImage[]) => {
        const accepted: ImageFile[] = [];
        const rejected: string[] = [];

        for (const { file, width, height } of newFiles) {
            try {
                // Validation decodes in the worker and hands back dimensions;
                // only fall back to a main-thread decode if they are missing.
                let safeWidth = width;
                let safeHeight = height;
                if (!safeWidth || !safeHeight) {
                    const bitmap = await createImageBitmap(file);
                    safeWidth = bitmap.width;
                    safeHeight = bitmap.height;
                    bitmap.close();
                }

                let format: ProcessOptions['format'] = 'jpeg';
                const ext = file.name.split('.').pop()?.toLowerCase();
                const mime = file.type.toLowerCase();
                if (mime === 'image/png' || ext === 'png') format = 'png';
                else if (mime === 'image/webp' || ext === 'webp') format = 'webp';
                else if (mime === 'image/avif' || ext === 'avif') format = 'avif';
                else if (mime.includes('bmp') || ext === 'bmp') format = 'bmp';

                const previewUrl = URL.createObjectURL(file);
                objectUrls.current.add(previewUrl);

                accepted.push({
                    id: generateId(),
                    file,
                    previewUrl,
                    originalWidth: safeWidth,
                    originalHeight: safeHeight,
                    status: 'pending',
                    options: {
                        format,
                        quality: 100, // Default to 100% to preserve original quality on ingest
                        width: safeWidth,
                        height: safeHeight,
                        keepAspectRatio: true,
                    },
                });
            } catch (error) {
                // One unreadable file must not take down the rest of the batch
                console.warn(`Could not read ${file.name}:`, error);
                rejected.push(file.name);
            }
        }

        if (accepted.length > 0) {
            setImages(prev => {
                const updated = [...prev, ...accepted];
                imagesRef.current = updated;
                return updated;
            });

            // Trigger processing immediately for new images
            setTimeout(() => {
                accepted.forEach(img => processSingleImage(img.id, img));
            }, 0);
        }

        if (rejected.length > 0) {
            showToast(t('toast_skipped_invalid', { count: rejected.length, files: rejected.join(', ') }));
        }
    }, [processSingleImage, showToast, t]);

    // Handle validation errors
    const handleValidationError = useCallback((invalidFiles: string[]) => {
        showToast(t('toast_skipped_invalid', { count: invalidFiles.length, files: invalidFiles.join(', ') }));
    }, [showToast, t]);

    // Handle options change
    const handleOptionsChange = useCallback((id: string, options: Partial<ProcessOptions>) => {
        setImages(prev => {
            const next = prev.map(img =>
                img.id === id ? { ...img, options: { ...img.options, ...options }, status: 'pending' as const } : img
            );
            imagesRef.current = next;
            return next;
        });
        debouncedProcess(id);
    }, [debouncedProcess]);

    // Remove image
    const handleRemoveImage = useCallback((id: string) => {
        cancelImageWork(id);
        setSelectedIds(prev => {
            if (prev.has(id)) {
                const next = new Set(prev);
                next.delete(id);
                return next;
            }
            return prev;
        });
        setImages(prev => {
            const imageToRemove = prev.find(img => img.id === id);
            if (imageToRemove) {
                if (imageToRemove.previewUrl) {
                    URL.revokeObjectURL(imageToRemove.previewUrl);
                    objectUrls.current.delete(imageToRemove.previewUrl);
                }
                if (imageToRemove.processedUrl && imageToRemove.processedUrl !== imageToRemove.previewUrl) {
                    URL.revokeObjectURL(imageToRemove.processedUrl);
                    objectUrls.current.delete(imageToRemove.processedUrl);
                }
            }
            const next = prev.filter(img => img.id !== id);
            imagesRef.current = next;
            return next;
        });
    }, [cancelImageWork]);

    // Clear all images
    const handleClearAll = useCallback(() => {
        images.forEach(image => {
            cancelImageWork(image.id);
            if (image.previewUrl) {
                URL.revokeObjectURL(image.previewUrl);
                objectUrls.current.delete(image.previewUrl);
            }
            if (image.processedUrl && image.processedUrl !== image.previewUrl) {
                URL.revokeObjectURL(image.processedUrl);
                objectUrls.current.delete(image.processedUrl);
            }
        });
        setImages([]);
        imagesRef.current = [];
        setSelectedIds(new Set());
    }, [images, cancelImageWork]);

    // Clear only selected images
    const handleClearSelected = useCallback(() => {
        if (selectedIds.size === 0) return;

        images.forEach(image => {
            if (selectedIds.has(image.id)) {
                cancelImageWork(image.id);
                if (image.previewUrl) {
                    URL.revokeObjectURL(image.previewUrl);
                    objectUrls.current.delete(image.previewUrl);
                }
                if (image.processedUrl && image.processedUrl !== image.previewUrl) {
                    URL.revokeObjectURL(image.processedUrl);
                    objectUrls.current.delete(image.processedUrl);
                }
            }
        });
        setImages(prev => {
            const next = prev.filter(img => !selectedIds.has(img.id));
            imagesRef.current = next;
            return next;
        });
        setSelectedIds(new Set());
    }, [images, selectedIds, cancelImageWork]);

    // Download selected or all as ZIP
    const handleDownloadZip = async (onlySelected: boolean = false) => {
        setIsZipping(true);
        const zip = new JSZip();
        let imagesToDownload = images.filter(img => img.status === 'done' && img.processedFile);

        if (onlySelected && selectedIds.size > 0) {
            imagesToDownload = imagesToDownload.filter(img => selectedIds.has(img.id));
        }

        if (imagesToDownload.length === 0) {
            showToast(t('toast_no_images'));
            setIsZipping(false);
            return;
        }

        const usedNames = new Set<string>();

        imagesToDownload.forEach(image => {
            if (image.processedFile) {
                const base = downloadBaseName(image.file.name);
                const entryName = uniqueOutputName(base, outputExtension(image.options.format), usedNames);
                zip.file(entryName, image.processedFile);
            }
        });

        try {
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ImageWrangler.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            console.error(e);
            showToast(t('toast_zip_failed'));
        }

        setIsZipping(false);
    };

    // Download individually with staggered timer to avoid browser popup blocks
    const handleDownloadIndividual = (onlySelected: boolean = false) => {
        let imagesToDownload = images.filter(img => img.status === 'done' && img.processedFile && img.processedUrl);

        if (onlySelected && selectedIds.size > 0) {
            imagesToDownload = imagesToDownload.filter(img => selectedIds.has(img.id));
        }

        if (imagesToDownload.length === 0) {
            showToast(t('toast_no_images'));
            return;
        }

        const usedNames = new Set<string>();

        imagesToDownload.forEach((image, index) => {
            setTimeout(() => {
                if (image.processedUrl) {
                    const a = document.createElement('a');
                    a.href = image.processedUrl;
                    a.download = uniqueOutputName(
                        downloadBaseName(image.file.name),
                        outputExtension(image.options.format),
                        usedNames
                    );
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }, index * 200);
        });

        showToast(t('toast_downloading', { count: imagesToDownload.length }));
    };

    // Selection handlers
    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === images.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(images.map(img => img.id)));
        }
    }, [images, selectedIds.size]);

    // Handle Merge All into grid
    const handleMergeAll = useCallback(async () => {
        if (images.length < 2) {
            showToast(t('toast_merge_need_two'));
            return;
        }

        try {
            showToast(t('toast_merging'));
            const sources = images.map(img => (img.status === 'done' && img.processedFile) ? img.processedFile : img.file);

            const mergedBlob = await mergeImages(sources);
            const mergedUrl = URL.createObjectURL(mergedBlob);
            objectUrls.current.add(mergedUrl);

            const mergedFile = new File([mergedBlob], "merged_output.jpg", { type: "image/jpeg" });
            const bitmap = await createImageBitmap(mergedBlob);

            const newImage: ImageFile = {
                id: generateId(),
                file: mergedFile,
                previewUrl: mergedUrl,
                processedUrl: mergedUrl,
                processedFile: mergedBlob,
                originalWidth: bitmap.width,
                originalHeight: bitmap.height,
                status: 'done',
                options: {
                    format: 'jpeg',
                    quality: 90,
                    width: bitmap.width,
                    height: bitmap.height,
                    keepAspectRatio: true,
                }
            };
            bitmap.close();

            setImages(prev => {
                const next = [newImage, ...prev];
                imagesRef.current = next;
                return next;
            });
            showToast(t('toast_merge_success'));

        } catch (e) {
            console.error(e);
            showToast(t('toast_merge_failed', { error: e instanceof Error ? e.message : "Unknown error" }));
        }
    }, [images, showToast, t]);

    const allDone = images.length > 0 && images.every(img => img.status === 'done' || img.status === 'error');

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header with multi-language selector and navigation */}
            <Header />

            <main className="flex-1 container mx-auto px-4 pt-20 pb-12 md:pb-16">
                <div className="space-y-8">
                    {/* Hero dropzone area */}
                    <div className="transition-all duration-300">
                        <ImageDropzone
                            onFilesAdded={handleFilesAdded}
                            onValidationError={handleValidationError}
                        />
                        {/* Support Buttons (locally hosted badges) */}
                        <div className="mt-8 flex flex-row items-center justify-center gap-4 flex-wrap">
                            <a href="https://ko-fi.com/Y8Y11V9RQ2" target="_blank" rel="noopener noreferrer">
                                <img height="36" style={{ border: '0px', height: '36px' }} src="/kofi-button.png" alt="Buy Me a Coffee at ko-fi.com" />
                            </a>
                            <a href="https://buymeachai.ezee.li/ashutosh47" target="_blank" rel="noopener noreferrer">
                                <img src="/buymeachai-button.svg" alt="Buy Me A Chai" style={{ height: '36px', width: 'auto' }} />
                            </a>
                        </div>
                    </div>

                    {/* Image Cards & Batch Action Bar */}
                    {images.length > 0 ? (
                        <div className="space-y-8 mt-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                                        {t('your_images')} ({images.length})
                                    </h2>
                                    {selectedIds.size > 0 && (
                                        <span className="text-sm text-primary font-medium">
                                            {selectedIds.size} {t('selected_count')}
                                        </span>
                                    )}

                                    {/* Action Bar */}
                                    <div className="flex flex-wrap items-center sm:ml-auto gap-2">
                                        <button
                                            onClick={handleSelectAll}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-secondary hover:bg-elevated text-secondary-foreground transition-colors min-h-[40px]"
                                        >
                                            {selectedIds.size === images.length ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                                            <span className="max-sm:hidden">
                                                {selectedIds.size === images.length ? t('btn_deselect_all') : t('btn_select_all')}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleDownloadIndividual(selectedIds.size > 0)}
                                            disabled={!allDone}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-50 transition-colors shadow-sm min-h-[40px]"
                                        >
                                            <FileDown className="h-4 w-4" />
                                            <span className="max-sm:hidden">{t('btn_download_all')}</span>
                                        </button>
                                        <button
                                            onClick={() => handleDownloadZip(selectedIds.size > 0)}
                                            disabled={!allDone || isZipping}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-secondary hover:bg-elevated text-secondary-foreground disabled:opacity-50 transition-colors min-h-[40px]"
                                        >
                                            <FolderDown className="h-4 w-4" />
                                            <span className="max-sm:hidden">{isZipping ? t('zipping') : t('btn_zip_all')}</span>
                                        </button>
                                        <button
                                            onClick={handleMergeAll}
                                            disabled={images.length < 2 || isZipping}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-accent hover:bg-accent-soft text-accent-foreground disabled:opacity-50 transition-colors min-h-[40px]"
                                        >
                                            <Layers className="h-4 w-4" />
                                            <span className="max-sm:hidden">{t('btn_merge_all')}</span>
                                        </button>
                                        <button
                                            onClick={selectedIds.size > 0 ? handleClearSelected : handleClearAll}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-destructive hover:bg-destructive-hover text-destructive-foreground transition-colors min-h-[40px]"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="max-sm:hidden">{selectedIds.size > 0 ? t('btn_clear_selected') : t('btn_clear_all')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={cn(
                                "grid gap-6 sm:gap-8",
                                images.length === 1
                                    ? "grid-cols-1 max-w-sm mx-auto"
                                    : images.length === 2
                                        ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            )}>
                                {images.map(image => (
                                    <ImageCard
                                        key={image.id}
                                        image={image}
                                        isSelected={selectedIds.has(image.id)}
                                        onToggleSelect={handleToggleSelect}
                                        onOptionsChange={handleOptionsChange}
                                        onRemove={handleRemoveImage}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto p-6 rounded-xl border border-dashed border-border bg-card">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="font-display text-lg font-medium">{t('ready_title')}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t('ready_desc')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Separator */}
                <hr className="my-12 md:my-20 border-border" />

                {/* FAQ Section */}
                <FAQ />
            </main>

            <footer className="py-6 text-center text-sm text-muted-foreground">
                <p>{t('footer_text', { year: new Date().getFullYear() })}</p>
            </footer>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg bg-elevated text-foreground border border-border shadow-xl text-sm animate-in fade-in slide-in-from-bottom-2">
                    {toastMessage}
                </div>
            )}

            {/* Mobile Floating Action Button */}
            <FloatingActionButton
                imagesCount={images.length}
                selectedCount={selectedIds.size}
                isZipping={isZipping}
                allDone={allDone}
                onSelectAll={handleSelectAll}
                onDownloadAll={() => handleDownloadIndividual(selectedIds.size > 0)}
                onZipAll={() => handleDownloadZip(selectedIds.size > 0)}
                onMergeAll={handleMergeAll}
                onClearAll={selectedIds.size > 0 ? handleClearSelected : handleClearAll}
                onAddImages={() => {
                    const input = document.getElementById('hidden-file-input') as HTMLInputElement | null;
                    input?.click();
                }}
            />
        </div>
    );
}

export default ImageWrangler;
