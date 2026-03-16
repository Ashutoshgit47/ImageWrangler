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
import FloatingActionButton from './FloatingActionButton';

export function ImageWrangler() {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isZipping, setIsZipping] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Track object URLs for cleanup
    const objectUrls = useRef(new Set<string>());
    
    // Add version tracking for processing race conditions
    const processingVersionRef = useRef(new Map<string, number>());
    const debounceTimeoutRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    const imagesRef = useRef<ImageFile[]>([]);

    // Sync imagesRef with state
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

    // Process a single image
    const processSingleImage = useCallback(async (id: string, initialImage?: ImageFile) => {
        // Increment processing version
        const currentVersion = (processingVersionRef.current.get(id) || 0) + 1;
        processingVersionRef.current.set(id, currentVersion);

        // Get freshest image state
        const targetImage = initialImage || imagesRef.current.find(img => img.id === id);
        if (!targetImage) return;

        setImages(prev => prev.map(img =>
            img.id === id ? { ...img, status: 'processing' } : img
        ));

        try {
            const processedBlob = await processImageAsync(targetImage.file, targetImage.options);
            
            // Check if a newer process has started
            if (processingVersionRef.current.get(id) !== currentVersion) {
                return; // Another process started, discard this result
            }

            const processedUrl = URL.createObjectURL(processedBlob);
            objectUrls.current.add(processedUrl);

            setImages(prev => prev.map(img => {
                if (img.id === id) {
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
            if (processingVersionRef.current.get(id) !== currentVersion) return;

            setImages(prev => prev.map(img =>
                img.id === id ? { ...img, status: 'error', error: 'Failed' } : img
            ));
            showToast(`Failed to process image`);
        }
    }, []);

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
                    quality: 100, // Fixed: default quality is 100 to avoid auto-compression
                    width,
                    height,
                    keepAspectRatio: true,
                },
            };
        });

        const newImageFiles = await Promise.all(newImageFilesPromises);

        setImages(prev => {
            const updated = [...prev, ...newImageFiles];
            imagesRef.current = updated; // Sync immediately
            return updated;
        });

        // Process new images
        setTimeout(() => {
            newImageFiles.forEach(img => processSingleImage(img.id, img));
        }, 0);
    }, [processSingleImage]);

    // Handle validation errors
    const handleValidationError = useCallback((invalidFiles: string[]) => {
        showToast(`Skipped ${invalidFiles.length} invalid file(s): ${invalidFiles.join(', ')}`);
    }, []);

    // Handle options change
    const handleOptionsChange = useCallback((id: string, options: Partial<ProcessOptions>) => {
        setImages(prev => prev.map(img =>
            img.id === id ? { ...img, options: { ...img.options, ...options }, status: 'pending' } : img
        ));
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
            imagesRef.current = next; // Sync immediately
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
        imagesRef.current = []; // Sync immediately
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
            imagesRef.current = next; // Sync immediately
            return next;
        });
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

        const usedNames = new Set<string>();

        imagesToDownload.forEach(image => {
            if (image.processedFile) {
                // Bug #8 fix: safe original name extraction
                let originalName = image.file.name.includes('.') 
                    ? image.file.name.substring(0, image.file.name.lastIndexOf('.')) 
                    : image.file.name || 'image';
                
                // Bug #6 fix: ZIP deduplication (Set-based to handle manual collision edge cases)
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

        const usedNames = new Set<string>();

        imagesToDownload.forEach((image, index) => {
            setTimeout(() => {
                if (image.processedUrl) {
                    // Bug #8 fix: safe original name extraction
                    let originalName = image.file.name.includes('.') 
                        ? image.file.name.substring(0, image.file.name.lastIndexOf('.')) 
                        : image.file.name || 'image';

                    const ext = image.options.format === 'jpeg' ? 'jpg' : image.options.format;
                    
                    // Bug #6 fix: Filename deduplication (Set-based)
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
                    {/* Removed lg:mb-32 to reduce blank space per user request */}
                    <div className="transition-all duration-300">
                        <ImageDropzone
                            onFilesAdded={handleFilesAdded}
                            onValidationError={handleValidationError}
                        />
                        {/* Donation Buttons */}
                        <div className="mt-8 flex flex-row items-center justify-center gap-4 flex-wrap">
                            <a href="https://ko-fi.com/Y8Y11V9RQ2" target="_blank" rel="noopener noreferrer">
                                <img height="36" style={{ border: '0px', height: '36px' }} src="https://storage.ko-fi.com/cdn/kofi3.png?v=6" alt="Buy Me a Coffee at ko-fi.com" />
                            </a>
                            <a href="https://buymeachai.ezee.li/ashutosh47" target="_blank" rel="noopener noreferrer">
                                <img src="https://buymeachai.ezee.li/assets/images/buymeachai-button.png" alt="Buy Me A Chai" style={{ height: '36px', width: 'auto' }} />
                            </a>
                        </div>
                    </div>

                    {images.length > 0 ? (
                        <div className="space-y-10 mt-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl sm:text-2xl font-bold">Your Images ({images.length})</h2>
                                    {selectedIds.size > 0 && (
                                        <span className="text-sm text-primary font-medium">
                                            {selectedIds.size} selected
                                        </span>
                                    )}
                                    {/* Action bar aligned right via sm:ml-auto */}
                                    <div className="flex flex-wrap items-center sm:ml-auto gap-2">
                                        <button onClick={handleSelectAll} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors">
                                            {selectedIds.size === images.length ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                                            <span className="max-sm:hidden">{selectedIds.size === images.length ? 'Deselect All' : 'Select All'}</span>
                                        </button>
                                        <button onClick={() => handleDownloadIndividual(selectedIds.size > 0)} disabled={!allDone} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-colors">
                                            <FileDown className="h-4 w-4" />
                                            <span className="max-sm:hidden">Download All</span>
                                        </button>
                                        <button onClick={() => handleDownloadZip(selectedIds.size > 0)} disabled={!allDone || isZipping} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50 transition-colors">
                                            <FolderDown className="h-4 w-4" />
                                            <span className="max-sm:hidden">{isZipping ? 'Zipping...' : 'ZIP All'}</span>
                                        </button>
                                        <button onClick={handleMergeAll} disabled={images.length < 2 || isZipping} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-accent hover:bg-accent/80 text-accent-foreground disabled:opacity-50 transition-colors">
                                            <Layers className="h-4 w-4" />
                                            <span className="max-sm:hidden">Merge All</span>
                                        </button>
                                        <button onClick={selectedIds.size > 0 ? handleClearSelected : handleClearAll} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="max-sm:hidden">{selectedIds.size > 0 ? 'Clear Selected' : 'Clear All'}</span>
                                        </button>
                                    </div>
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
