/**
 * ImageWrangler - Main Application Component
 * Orchestrates image upload, processing, batch download, i18n, and developer info
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ImageFile, ProcessOptions } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { ImageDropzone } from './ImageDropzone';
import { ImageCard } from './ImageCard';
import { FAQ } from './FAQ';
import { Header } from './Header';
import { AboutDev } from './AboutDev';
import { processImageAsync } from '../lib/workerManager';
import { mergeImages } from '../lib/imageProcessor';
import { formatBytes, generateId, cn } from '../lib/utils';
import { Sparkles, Layers, FileDown, FolderDown, CheckSquare, Square, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import FloatingActionButton from './FloatingActionButton';

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

    // Keep imagesRef synchronized
    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    // Cleanup object URLs on unmount
    useEffect(() => {
        const urls = objectUrls.current;
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Toast helper
    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 5000);
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
            processSingleImage(id);
        }, 500);
        
        debounceTimeoutRef.current.set(id, timeout);
    }, [processSingleImage]);

    // Handle new files added
    const handleFilesAdded = useCallback(async (newFiles: File[]) => {
        const newImageFilesPromises = newFiles.map(async (file): Promise<ImageFile> => {
            const bitmap = await createImageBitmap(file);
            const { width, height } = bitmap;
            bitmap.close();

            const rawType = file.type.split('/')[1]?.toLowerCase() || 'jpeg';
            const supported = ['jpeg', 'png', 'webp', 'bmp', 'avif'];
            const format = (supported.includes(rawType) ? rawType : 'jpeg') as ProcessOptions['format'];

            const previewUrl = URL.createObjectURL(file);
            objectUrls.current.add(previewUrl);

            return {
                id: generateId(),
                file,
                previewUrl,
                originalWidth: width,
                originalHeight: height,
                status: 'pending',
                options: {
                    format,
                    quality: 100, // Default to 100% to preserve original quality on ingest
                    width,
                    height,
                    keepAspectRatio: true,
                },
            };
        });

        const newImageFiles = await Promise.all(newImageFilesPromises);

        setImages(prev => {
            const updated = [...prev, ...newImageFiles];
            imagesRef.current = updated;
            return updated;
        });

        // Trigger processing immediately for new images
        setTimeout(() => {
            newImageFiles.forEach(img => processSingleImage(img.id, img));
        }, 0);
    }, [processSingleImage]);

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
    }, []);

    // Clear all images
    const handleClearAll = useCallback(() => {
        images.forEach(image => {
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
    }, [images]);

    // Clear only selected images
    const handleClearSelected = useCallback(() => {
        if (selectedIds.size === 0) return;

        images.forEach(image => {
            if (selectedIds.has(image.id)) {
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
    }, [images, selectedIds]);

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
                const originalName = image.file.name.includes('.') 
                    ? image.file.name.substring(0, image.file.name.lastIndexOf('.')) 
                    : image.file.name || 'image';
                
                const ext = image.options.format === 'jpeg' ? 'jpg' : image.options.format;
                
                let finalName = originalName;
                let count = 0;
                while (usedNames.has(`${finalName}.${ext}`)) {
                    count++;
                    finalName = `${originalName}_${count}`;
                }
                usedNames.add(`${finalName}.${ext}`);

                zip.file(`${finalName}.${ext}`, image.processedFile);
            }
        });

        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ImageWrangler.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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
                    const originalName = image.file.name.includes('.') 
                        ? image.file.name.substring(0, image.file.name.lastIndexOf('.')) 
                        : image.file.name || 'image';

                    const ext = image.options.format === 'jpeg' ? 'jpg' : image.options.format;
                    
                    let finalName = originalName;
                    let count = 0;
                    while (usedNames.has(`${finalName}.${ext}`)) {
                        count++;
                        finalName = `${originalName}_${count}`;
                    }
                    usedNames.add(`${finalName}.${ext}`);

                    const a = document.createElement('a');
                    a.href = image.processedUrl;
                    a.download = `${finalName}.${ext}`;
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
                    </div>

                    {/* Image Cards & Batch Action Bar */}
                    {images.length > 0 ? (
                        <div className="space-y-8 mt-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl sm:text-2xl font-bold">
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
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors min-h-[40px]"
                                        >
                                            {selectedIds.size === images.length ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                                            <span className="max-sm:hidden">
                                                {selectedIds.size === images.length ? t('btn_deselect_all') : t('btn_select_all')}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleDownloadIndividual(selectedIds.size > 0)}
                                            disabled={!allDone}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-colors shadow-sm min-h-[40px]"
                                        >
                                            <FileDown className="h-4 w-4" />
                                            <span className="max-sm:hidden">{t('btn_download_all')}</span>
                                        </button>
                                        <button
                                            onClick={() => handleDownloadZip(selectedIds.size > 0)}
                                            disabled={!allDone || isZipping}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50 transition-colors min-h-[40px]"
                                        >
                                            <FolderDown className="h-4 w-4" />
                                            <span className="max-sm:hidden">{isZipping ? t('zipping') : t('btn_zip_all')}</span>
                                        </button>
                                        <button
                                            onClick={handleMergeAll}
                                            disabled={images.length < 2 || isZipping}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-accent hover:bg-accent/80 text-accent-foreground disabled:opacity-50 transition-colors min-h-[40px]"
                                        >
                                            <Layers className="h-4 w-4" />
                                            <span className="max-sm:hidden">{t('btn_merge_all')}</span>
                                        </button>
                                        <button
                                            onClick={selectedIds.size > 0 ? handleClearSelected : handleClearAll}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors min-h-[40px]"
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
                        <div className="max-w-2xl mx-auto p-6 rounded-xl border border-dashed border-border bg-card/40">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-base">{t('ready_title')}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t('ready_desc')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* About Developer Section */}
                <AboutDev />

                {/* Separator */}
                <hr className="my-12 md:my-16 border-border" />

                {/* FAQ Section */}
                <FAQ />
            </main>

            {/* Footer with Developer attribution */}
            <footer className="py-8 border-t border-border/60 bg-card/30 text-center text-xs text-muted-foreground space-y-2">
                <p>{t('footer_text', { year: new Date().getFullYear() })}</p>
                <p className="flex items-center justify-center gap-1">
                    <span>{t('footer_dev')}:</span>
                    <a
                        href="https://github.com/Ashutoshgit47"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                    >
                        GitHub
                    </a>
                    <span>•</span>
                    <a
                        href="https://ashutosh47.pages.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                    >
                        Portfolio
                    </a>
                </p>
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
