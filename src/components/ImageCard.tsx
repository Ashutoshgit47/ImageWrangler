/**
 * ImageWrangler - Image Card Component
 * Displays image preview and processing controls for a single image
 */

import React, { useState } from 'react';
import type { ImageFile, ProcessOptions, CropRegion } from '../lib/types';
import type { PixelCrop } from 'react-image-crop';
import { formatBytes, cn } from '../lib/utils';
import { CropTool } from './CropTool';
import {
    CheckCircle,
    Loader2,
    Trash2,
    XCircle,
    ChevronDown,
    Crop,
    Eye,
    Download,
    CheckSquare,
    Square,
} from 'lucide-react';

interface ImageCardProps {
    image: ImageFile;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
    onOptionsChange: (id: string, options: Partial<ProcessOptions>) => void;
    onRemove: (id: string) => void;
}

export function ImageCard({ image, isSelected, onToggleSelect, onOptionsChange, onRemove }: ImageCardProps) {
    const [showResize, setShowResize] = useState(false);
    const [showCrop, setShowCrop] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const handleOptionChange = <K extends keyof ProcessOptions>(
        key: K,
        value: ProcessOptions[K]
    ) => {
        onOptionsChange(image.id, { [key]: value });
    };

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') return; // Don't process with empty/zero width
        const newWidth = parseInt(val, 10);
        if (!isFinite(newWidth) || newWidth <= 0) return;

        if (image.options.keepAspectRatio) {
            const sourceWidth = image.options.crop?.width || image.originalWidth;
            const sourceHeight = image.options.crop?.height || image.originalHeight;
            
            if (sourceWidth <= 0 || sourceHeight <= 0) {
                onOptionsChange(image.id, { width: newWidth });
                return;
            }
            
            const newHeight = Math.round((newWidth / sourceWidth) * sourceHeight);
            onOptionsChange(image.id, { width: newWidth, height: Math.max(1, newHeight) });
        } else {
            onOptionsChange(image.id, { width: newWidth });
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') return; // Don't process with empty/zero height
        const newHeight = parseInt(val, 10);
        if (!isFinite(newHeight) || newHeight <= 0) return;

        if (image.options.keepAspectRatio) {
            const sourceWidth = image.options.crop?.width || image.originalWidth;
            const sourceHeight = image.options.crop?.height || image.originalHeight;
            
            if (sourceHeight <= 0 || sourceWidth <= 0) {
                onOptionsChange(image.id, { height: newHeight });
                return;
            }
            
            const newWidth = Math.round((newHeight / sourceHeight) * sourceWidth);
            onOptionsChange(image.id, { width: Math.max(1, newWidth), height: newHeight });
        } else {
            onOptionsChange(image.id, { height: newHeight });
        }
    };

    const handleCropComplete = (crop: CropRegion) => {
        // Adjust output dimensions proportionally if aspect ratio is locked
        let newWidth = image.options.width;
        let newHeight = image.options.height;

        if (image.options.keepAspectRatio) {
            const oldSourceWidth = image.options.crop?.width || image.originalWidth;
            const ratio = crop.width / oldSourceWidth;
            newWidth = Math.round(image.options.width * ratio);
            newHeight = Math.round(image.options.height * ratio);
        }

        const pixelCrop: PixelCrop = { ...crop, unit: 'px' };

        onOptionsChange(image.id, { crop: pixelCrop, width: newWidth, height: newHeight });
        setShowCrop(false);
    };

    const handleCropReset = () => {
        const oldCrop = image.options.crop;
        if (oldCrop && oldCrop.width > 0 && oldCrop.height > 0) {
            // Scale the output dimensions proportionally back to the full image.
            // ratio = how much bigger the full image is vs the cropped region.
            const ratioX = image.originalWidth / oldCrop.width;
            const ratioY = image.originalHeight / oldCrop.height;
            const ratio = Math.min(ratioX, ratioY);
            
            onOptionsChange(image.id, {
                crop: undefined,
                // Scale from the *output* dimensions, not original pixels
                width: Math.round(image.options.width * ratio),
                height: Math.round(image.options.height * ratio),
            });
        } else {
            onOptionsChange(image.id, {
                crop: undefined,
                width: image.originalWidth,
                height: image.originalHeight,
            });
        }
    };

    const estimatedSize = image.processedFile ? formatBytes(image.processedFile.size) : '...';
    const isQualitySupported = image.options.format === 'jpeg' || image.options.format === 'webp';
    // Quality slider is overridden by binary search when targetSizeKB is active
    const isQualityEffective = isQualitySupported && !image.options.targetSizeKB;

    const StatusBadge = () => {
        switch (image.status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
                        Pending
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded badge-info">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing
                    </span>
                );
            case 'done':
                return (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded badge-success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Done
                    </span>
                );
            case 'error':
                return (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded badge-error">
                        <XCircle className="mr-1 h-3 w-3" />
                        Error
                    </span>
                );
        }
    };

    return (
        <>
            <div className={cn(
                "flex flex-col rounded-lg border bg-card overflow-hidden transition-colors",
                isSelected ? "border-primary ring-1 ring-primary/30" : "border-border"
            )}>
                {/* Header */}
                <div className="flex items-start gap-2 px-3 py-3">
                    {onToggleSelect && (
                        <button
                            onClick={() => onToggleSelect(image.id)}
                            className="mt-0.5 flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                            title={isSelected ? "Deselect" : "Select"}
                        >
                            {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm">{image.file.name}</h3>
                        <p className="text-xs text-muted-foreground">{formatBytes(image.file.size)}</p>
                    </div>
                    <StatusBadge />
                </div>

                {/* Image Preview */}
                <div className="relative w-full aspect-video bg-muted overflow-hidden my-2.5">
                    <img
                        src={image.previewUrl}
                        alt={`Preview of ${image.file.name}`}
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                    {image.options.crop && (
                        <button
                            onClick={handleCropReset}
                            className="absolute bottom-2 right-2 z-10 px-2 py-1 text-[10px] rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1"
                        >
                            <XCircle className="h-3 w-3" />
                            Reset Crop
                        </button>
                    )}
                </div>

                {/* Controls */}
                <div className="px-3 py-3 space-y-3">
                    {/* Format & Quality */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label htmlFor={`format-${image.id}`} className="text-xs font-medium">
                                Format
                            </label>
                            <select
                                id={`format-${image.id}`}
                                value={image.options.format}
                                onChange={(e) => handleOptionChange('format', e.target.value as ProcessOptions['format'])}
                                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="jpeg">JPEG</option>
                                <option value="png">PNG</option>
                                <option value="webp">WebP</option>
                                <option value="bmp">BMP</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label
                                htmlFor={`quality-${image.id}`}
                                className={cn("text-xs font-medium", !isQualityEffective && "text-muted-foreground")}
                                title={image.options.targetSizeKB ? 'Quality is auto-adjusted by Target KB' : undefined}
                            >
                                Quality: {image.options.quality}
                                {image.options.targetSizeKB ? <span className="ml-1 text-[10px] text-primary">(auto)</span> : null}
                            </label>
                            <input
                                id={`quality-${image.id}`}
                                type="range"
                                min={1}
                                max={100}
                                step={1}
                                value={image.options.quality}
                                onChange={(e) => handleOptionChange('quality', parseInt(e.target.value, 10))}
                                disabled={!isQualityEffective}
                                className="w-full h-8 accent-primary disabled:opacity-50"
                                title={image.options.targetSizeKB ? 'Quality is auto-adjusted by Target KB' : undefined}
                            />
                        </div>
                    </div>

                    {/* Resize by Weight (Lossy only) */}
                    {isQualitySupported ? (
                        <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
                            <div className="flex-1 space-y-0.5">
                                <label htmlFor={`weight-${image.id}`} className="text-xs font-medium flex items-center gap-1">
                                    Target KB
                                </label>
                                <p className="text-[10px] text-muted-foreground">Auto-adjust quality</p>
                            </div>
                            <input
                                id={`weight-${image.id}`}
                                type="number"
                                min={10}
                                placeholder="500"
                                value={image.options.targetSizeKB || ''}
                                onChange={(e) => handleOptionChange('targetSizeKB', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                className="w-16 h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
                            <p className="text-[10px] text-muted-foreground italic">
                                {image.options.format === 'bmp' ? 'BMP' : 'PNG'} is lossless — use <span className="font-medium text-primary">Resize</span> to reduce file size
                            </p>
                        </div>
                    )}

                    {/* Resize Accordion */}
                    <div className="border-t border-border pt-2.5">
                        <button
                            onClick={() => setShowResize(!showResize)}
                            className="flex items-center gap-2 text-xs font-medium w-full hover:text-primary transition-colors"
                            aria-expanded={showResize}
                        >
                            <ChevronDown className={cn("h-3 w-3 transition-transform", showResize && "rotate-180")} />
                            Resize
                        </button>
                        {showResize && (
                            <div className="mt-2.5 space-y-2.5">
                                <div className="flex items-center justify-between p-2 rounded-md border border-border">
                                    <label htmlFor={`aspect-${image.id}`} className="flex flex-col gap-0.5">
                                        <span className="text-xs font-medium">Lock Aspect Ratio</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {image.options.crop ? image.options.crop.width : image.originalWidth} × {image.options.crop ? image.options.crop.height : image.originalHeight}
                                        </span>
                                    </label>
                                    <button
                                        id={`aspect-${image.id}`}
                                        role="switch"
                                        aria-checked={image.options.keepAspectRatio}
                                        onClick={() => handleOptionChange('keepAspectRatio', !image.options.keepAspectRatio)}
                                        className={cn(
                                            "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                            image.options.keepAspectRatio ? "bg-primary" : "bg-input"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-lg ring-0 transition-transform",
                                                image.options.keepAspectRatio ? "translate-x-3" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <label htmlFor={`width-${image.id}`} className="text-xs font-medium">Width</label>
                                        <input
                                            id={`width-${image.id}`}
                                            type="number"
                                            value={image.options.width || ''}
                                            onChange={handleWidthChange}
                                            min={1}
                                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor={`height-${image.id}`} className="text-xs font-medium">Height</label>
                                        <input
                                            id={`height-${image.id}`}
                                            type="number"
                                            value={image.options.height || ''}
                                            onChange={handleHeightChange}
                                            min={1}
                                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Crop Button */}
                    <button
                        onClick={() => setShowCrop(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors text-xs"
                    >
                        <Crop className="h-3 w-3" />
                        Crop Image
                    </button>


                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-3 border-t border-border">
                    <p className="text-xs font-medium">
                        {formatBytes(image.file.size)} <span className="text-muted-foreground mx-1">→</span> <span className="text-primary">{estimatedSize}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            title="Preview"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Preview</span>
                        </button>
                        <button
                            onClick={() => {
                                if (image.processedFile && image.processedUrl) {
                                    const originalName = image.file.name.substring(0, image.file.name.lastIndexOf('.'));
                                    const ext = image.options.format === 'jpeg' ? 'jpg' : image.options.format;
                                    const a = document.createElement('a');
                                    a.href = image.processedUrl;
                                    a.download = `${originalName}.${ext}`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }
                            }}
                            disabled={!image.processedFile}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-primary disabled:opacity-50"
                            title="Download"
                        >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                        </button>
                        <button
                            onClick={() => onRemove(image.id)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-destructive"
                            title="Remove"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Crop Modal */}
            {showCrop && (
                <CropTool
                    imageSrc={image.previewUrl}
                    originalWidth={image.originalWidth}
                    originalHeight={image.originalHeight}
                    initialCrop={image.options.crop}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setShowCrop(false)}
                />
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setShowPreview(false)}
                >
                    <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold">Preview</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-muted rounded-md"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            <div>
                                <h4 className="font-semibold mb-2 text-center">Original ({formatBytes(image.file.size)})</h4>
                                <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                                    <img src={image.previewUrl} alt="Before" className="absolute inset-0 w-full h-full object-contain" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2 text-center">
                                    {image.processedFile ? `Processed (${formatBytes(image.processedFile.size)})` : 'Unchanged'}
                                </h4>
                                <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                                    <img src={image.processedUrl || image.previewUrl} alt="After" className="absolute inset-0 w-full h-full object-contain" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ImageCard;
