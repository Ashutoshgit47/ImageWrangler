/**
 * ImageWrangler - Main Application Component
 * Orchestrates image upload, processing, and batch download
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ImageFile, ProcessOptions } from '../lib/types';
import { ImageDropzone } from './ImageDropzone';
import { ImageCard } from './ImageCard';
import { FAQ } from './FAQ';
import { processImageAsync } from '../lib/workerManager';
import { mergeImages } from '../lib/imageProcessor';
import { formatBytes, debounce, generateId, cn } from '../lib/utils';
import { Download, Trash2, Sparkles, Layers, FileDown, FolderDown, CheckSquare, Square } from 'lucide-react';
import JSZip from 'jszip';

export function ImageWrangler() {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isZipping, setIsZipping] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Track object URLs for cleanup
    const objectUrls = useRef(new Set<string>());

    // Cleanup object URLs on unmount
    useEffect(() => {
        const urls = objectUrls.current;
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Process a single image
    const processSingleImage = useCallback(async (image: ImageFile) => {
        try {
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, status: 'processing' } : img
            ));

            const processedBlob = await processImageAsync(image.file, image.options);
            const processedUrl = URL.createObjectURL(processedBlob);
            objectUrls.current.add(processedUrl);

            setImages(prev => prev.map(img => {
                if (img.id === image.id) {
                    // Revoke old processed URL if exists
                    if (img.processedUrl && img.processedUrl !== img.previewUrl) {
                        URL.revokeObjectURL(img.processedUrl);
                        objectUrls.current.delete(img.processedUrl);
                    }
                    return { ...img, status: 'done', processedFile: processedBlob, processedUrl };
                }
                return img;
            }));
        } catch (error) {
            console.error('Processing error:', error);
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, status: 'error', error: 'Failed to process' } : img
            ));
            showToast(`Failed to process ${image.file.name}`);
        }
    }, []);

    // Debounced processing for option changes
    const debouncedProcessRef = useRef(debounce((image: ImageFile) => {
        processSingleImage(image);
    }, 500));

    // Handle new files added
    const handleFilesAdded = useCallback(async (newFiles: File[]) => {
        const newImageFilesPromises = newFiles.map(async (file): Promise<ImageFile> => {
            const bitmap = await createImageBitmap(file);
            const { width, height } = bitmap;
            bitmap.close();

            const type = file.type.split('/')[1] || 'jpeg';
            const format = (['jpeg', 'png', 'webp', 'bmp'].includes(type) ? type : 'jpeg') as ProcessOptions['format'];

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
                    quality: 80,
                    width,
                    height,
                    keepAspectRatio: true,
                },
            };
        });

        const newImageFiles = await Promise.all(newImageFilesPromises);

        setImages(prev => {
            const updated = [...prev, ...newImageFiles];
            // Process new images
            newImageFiles.forEach(img => processSingleImage(img));
            return updated;
        });
    }, [processSingleImage]);

    // Handle validation errors
    const handleValidationError = useCallback((invalidFiles: string[]) => {
        showToast(`Skipped ${invalidFiles.length} invalid file(s): ${invalidFiles.join(', ')}`);
    }, []);

    // Handle options change
    const handleOptionsChange = useCallback((id: string, options: Partial<ProcessOptions>) => {
        setImages(prev => {
            const newImages = prev.map(img =>
                img.id === id ? { ...img, options: { ...img.options, ...options }, status: 'pending' as const } : img
            );
            const changedImage = newImages.find(img => img.id === id);
            if (changedImage) {
                debouncedProcessRef.current(changedImage);
            }
            return newImages;
        });
    }, []);

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
            return prev.filter(img => img.id !== id);
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
        setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
        setSelectedIds(new Set());
    }, [images, selectedIds]);

    // Download selected/all as ZIP
    const handleDownloadZip = async (onlySelected: boolean = false) => {
        setIsZipping(true);
        const zip = new JSZip();
        let imagesToDownload = images.filter(img => img.status === 'done' && img.processedFile);

        if (onlySelected && selectedIds.size > 0) {
            imagesToDownload = imagesToDownload.filter(img => selectedIds.has(img.id));
        }

        if (imagesToDownload.length === 0) {
            showToast('No processed images to download');
            setIsZipping(false);
            return;
        }

        imagesToDownload.forEach(image => {
            if (image.processedFile) {
                const originalName = image.file.name.substring(0, image.file.name.lastIndexOf('.'));
                const ext = image.options.format === 'jpeg' ? 'jpg' : image.options.format;
                zip.file(`${originalName}.${ext}`, image.processedFile);
            }
        });

        try {
            const content = await zip.generateAsync({ type: 'blob' });

            // Download using native approach
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
            showToast('Failed to create ZIP file');
        }

        setIsZipping(false);
    };

    // Download selected/all individually
    const handleDownloadIndividual = (onlySelected: boolean = false) => {
        let imagesToDownload = images.filter(img => img.status === 'done' && img.processedFile && img.processedUrl);

        if (onlySelected && selectedIds.size > 0) {
            imagesToDownload = imagesToDownload.filter(img => selectedIds.has(img.id));
        }

        if (imagesToDownload.length === 0) {
            showToast('No processed images to download');
            return;
        }

        imagesToDownload.forEach((image, index) => {
            setTimeout(() => {
                if (image.processedUrl) {
                    const originalName = image.file.name.substring(0, image.file.name.lastIndexOf('.'));
                    const ext = image.options.format === 'jpeg' ? 'jpg' : image.options.format;
                    const a = document.createElement('a');
                    a.href = image.processedUrl;
                    a.download = `${originalName}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }, index * 200); // Stagger downloads
        });

        showToast(`Downloading ${imagesToDownload.length} image(s)...`);
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


    // Handle Merge All
    const handleMergeAll = useCallback(async () => {
        if (images.length < 2) {
            showToast("Need at least 2 images to merge.");
            return;
        }

        try {
            showToast("Merging all images...");
            // Use processed files if available, else original
            const sources = images.map(img => (img.status === 'done' && img.processedFile) ? img.processedFile : img.file);

            const mergedBlob = await mergeImages(sources);
            const mergedUrl = URL.createObjectURL(mergedBlob);
            objectUrls.current.add(mergedUrl);

            // Add merged result as new image
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

            setImages(prev => [newImage, ...prev]); // Add to top
            showToast("Images merged successfully!");

        } catch (e) {
            console.error(e);
            showToast("Merge failed: " + (e instanceof Error ? e.message : "Unknown error"));
        }
    }, [images]);

    // Toast helper
    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const allDone = images.length > 0 && images.every(img => img.status === 'done' || img.status === 'error');

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
                {/* Inline Branding */}
                <div className="flex items-center gap-2 mb-6">
                    <img src="/favicon.svg" alt="ImageWrangler Logo" className="h-7 w-7" />
                    <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        ImageWrangler
                    </h1>
                </div>

                <div className="space-y-6">
                    <div className={cn("transition-all duration-300", images.length > 0 && "lg:mb-32")}>
                        <ImageDropzone
                            onFilesAdded={handleFilesAdded}
                            onValidationError={handleValidationError}
                        />
                    </div>

                    {images.length > 0 ? (
                        <div className="space-y-10 mt-12">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="text-xl sm:text-2xl font-bold">Your Images ({images.length})</h2>
                                    {selectedIds.size > 0 && (
                                        <span className="text-sm text-primary font-medium">
                                            {selectedIds.size} selected
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons - Responsive Grid */}
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                                    {/* Select All */}
                                    <button
                                        onClick={handleSelectAll}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors text-xs sm:text-sm"
                                    >
                                        {selectedIds.size === images.length ? (
                                            <CheckSquare className="h-4 w-4 text-primary" />
                                        ) : (
                                            <Square className="h-4 w-4" />
                                        )}
                                        <span className="hidden sm:inline">{selectedIds.size === images.length ? 'Deselect All' : 'Select All'}</span>
                                        <span className="sm:hidden">{selectedIds.size === images.length ? 'Deselect' : 'Select'}</span>
                                    </button>

                                    {/* Download Individual */}
                                    <button
                                        onClick={() => handleDownloadIndividual(selectedIds.size > 0)}
                                        disabled={!allDone || images.length === 0}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                    >
                                        <FileDown className="h-4 w-4" />
                                        <span className="hidden sm:inline">
                                            {selectedIds.size > 0 ? `Download (${selectedIds.size})` : 'Download All'}
                                        </span>
                                        <span className="sm:hidden">
                                            {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
                                        </span>
                                    </button>

                                    {/* Download as ZIP */}
                                    <button
                                        onClick={() => handleDownloadZip(selectedIds.size > 0)}
                                        disabled={!allDone || isZipping || images.length === 0}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                    >
                                        <FolderDown className="h-4 w-4" />
                                        <span className="hidden sm:inline">
                                            {isZipping ? 'Zipping...' : selectedIds.size > 0 ? `ZIP (${selectedIds.size})` : 'ZIP All'}
                                        </span>
                                        <span className="sm:hidden">
                                            {isZipping ? '...' : 'ZIP'}
                                        </span>
                                    </button>

                                    {/* Merge All */}
                                    <button
                                        onClick={handleMergeAll}
                                        disabled={images.length < 2 || isZipping}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                    >
                                        <Layers className="h-4 w-4" />
                                        <span className="hidden sm:inline">Merge All</span>
                                        <span className="sm:hidden">Merge</span>
                                    </button>

                                    {/* Clear Selected - only show when items are selected */}
                                    {selectedIds.size > 0 && (
                                        <button
                                            onClick={handleClearSelected}
                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-xs sm:text-sm"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="hidden sm:inline">Clear ({selectedIds.size})</span>
                                            <span className="sm:hidden">({selectedIds.size})</span>
                                        </button>
                                    )}

                                    {/* Clear All */}
                                    <button
                                        onClick={handleClearAll}
                                        disabled={images.length === 0}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="hidden sm:inline">Clear All</span>
                                        <span className="sm:hidden">All</span>
                                    </button>
                                </div>
                            </div>

                            <div className={cn(
                                "grid gap-8",
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
                        <div className="max-w-2xl mx-auto p-4 rounded-lg border border-dashed border-border">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                    <h3 className="font-semibold">Ready to Go!</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Drop some images above to get started. All processing happens securely in your browser.
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
                <p>© {new Date().getFullYear()} ImageWrangler. All Rights Reserved. Your files never leave your device.</p>
            </footer>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg bg-elevated text-foreground border border-border shadow-lg">
                    {toastMessage}
                </div>
            )}
        </div>
    );
}

export default ImageWrangler;
