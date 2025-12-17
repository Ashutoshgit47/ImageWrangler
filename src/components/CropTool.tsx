/**
 * ImageWrangler - Crop Tool Component
 * Interactive canvas-based image cropping tool with touch support
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { CropRegion } from '../lib/types';
import { cn } from '../lib/utils';
import { RotateCcw, X } from 'lucide-react';

interface CropToolProps {
    imageSrc: string;
    originalWidth: number;
    originalHeight: number;
    initialCrop?: CropRegion;
    onCropComplete: (crop: CropRegion) => void;
    onCancel: () => void;
}

const ASPECT_RATIOS = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
];

type DragType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function CropTool({
    imageSrc,
    originalWidth,
    originalHeight,
    initialCrop,
    onCropComplete,
    onCancel,
}: CropToolProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [displayScale, setDisplayScale] = useState(1);
    const [crop, setCrop] = useState<CropRegion>(
        initialCrop || {
            x: originalWidth * 0.1,
            y: originalHeight * 0.1,
            width: originalWidth * 0.8,
            height: originalHeight * 0.8,
        }
    );
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<DragType>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const requestRef = useRef<number | undefined>(undefined);

    // Calculate display scale to fit image in container
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth - 32;
                const maxHeight = window.innerHeight * 0.55;
                const scaleX = containerWidth / originalWidth;
                const scaleY = maxHeight / originalHeight;
                setDisplayScale(Math.min(scaleX, scaleY, 1));
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [originalWidth, originalHeight]);

    // Get client position from mouse or touch event
    const getClientPos = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if ('clientX' in e) {
            return { x: e.clientX, y: e.clientY };
        }
        return { x: 0, y: 0 };
    };

    // Start drag handler
    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, type: DragType) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragType(type);
        const pos = getClientPos(e);
        setDragStart(pos);
    }, []);

    // Drag move handler - Optimized with requestAnimationFrame
    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragType) return;

        // Throttle updates using requestAnimationFrame
        if (requestRef.current) return;

        requestRef.current = requestAnimationFrame(() => {
            const pos = getClientPos(e);

            // Calculate delta in ORIGINAL image pixels
            const dx = (pos.x - dragStart.x) / displayScale;
            // pos.y - dragStart.y gives screen delta. divided by scale gives original image delta.
            const dy = (pos.y - dragStart.y) / displayScale;

            setCrop((prev) => {
                let { x, y, width, height } = prev;

                if (dragType === 'move') {
                    x = Math.max(0, Math.min(originalWidth - width, x + dx));
                    y = Math.max(0, Math.min(originalHeight - height, y + dy));
                } else {
                    let newX = x, newY = y, newW = width, newH = height;

                    if (dragType === 'se') {
                        newW = Math.max(50, width + dx);
                        if (aspectRatio) newH = newW / aspectRatio;
                        else newH = Math.max(50, height + dy);

                        if (newX + newW > originalWidth) {
                            newW = originalWidth - newX;
                            if (aspectRatio) newH = newW / aspectRatio;
                        }
                        if (newY + newH > originalHeight) {
                            newH = originalHeight - newY;
                            if (aspectRatio) newW = newH * aspectRatio;
                        }

                    } else if (dragType === 'sw') {
                        newW = Math.max(50, width - dx);
                        if (aspectRatio) newH = newW / aspectRatio;
                        else newH = Math.max(50, height + dy);

                        if (newY + newH > originalHeight) {
                            newH = originalHeight - newY;
                            if (aspectRatio) newW = newH * aspectRatio;
                        }

                        const rightEdge = x + width;
                        newX = rightEdge - newW;
                        if (newX < 0) {
                            newX = 0;
                            newW = rightEdge;
                            if (aspectRatio) newH = newW / aspectRatio;
                        }

                    } else if (dragType === 'ne') {
                        newW = Math.max(50, width + dx);
                        if (aspectRatio) newH = newW / aspectRatio;
                        else newH = Math.max(50, height - dy);

                        if (newX + newW > originalWidth) {
                            newW = originalWidth - newX;
                            if (aspectRatio) newH = newW / aspectRatio;
                        }

                        const bottomEdge = y + height;
                        newY = bottomEdge - newH;
                        if (newY < 0) {
                            newY = 0;
                            newH = bottomEdge;
                            if (aspectRatio) newW = newH * aspectRatio;
                        }

                    } else if (dragType === 'nw') {
                        newW = Math.max(50, width - dx);
                        if (aspectRatio) newH = newW / aspectRatio;
                        else newH = Math.max(50, height - dy);

                        const rightEdge = x + width;
                        const bottomEdge = y + height;
                        newX = rightEdge - newW;
                        newY = bottomEdge - newH;

                        if (newX < 0) {
                            newX = 0;
                            newW = rightEdge;
                            if (aspectRatio) newH = newW / aspectRatio;
                        }
                        if (newY < 0) {
                            newY = 0;
                            newH = bottomEdge;
                            if (aspectRatio) newW = newH * aspectRatio;
                        }

                    } else if (dragType === 'e') {
                        newW = Math.max(50, width + dx);

                        if (newX + newW > originalWidth) {
                            newW = originalWidth - newX;
                        }
                        if (aspectRatio) {
                            newH = newW / aspectRatio;
                            // Check bounds - standard is expanding centered or keeping top fixed?
                            // Here simplified: changes height based on ratio, checks bounds.
                            if (newY + newH > originalHeight) {
                                newH = originalHeight - newY;
                                newW = newH * aspectRatio;
                            }
                        }

                    } else if (dragType === 'w') {
                        newW = Math.max(50, width - dx);
                        const rightEdge = x + width;
                        newX = rightEdge - newW;

                        if (newX < 0) {
                            newX = 0;
                            newW = rightEdge;
                        }
                        if (aspectRatio) {
                            newH = newW / aspectRatio;
                            if (newY + newH > originalHeight) {
                                newH = originalHeight - newY;
                                newW = newH * aspectRatio;
                                newX = rightEdge - newW;
                            }
                        }

                    } else if (dragType === 's') {
                        newH = Math.max(50, height + dy);

                        if (newY + newH > originalHeight) {
                            newH = originalHeight - newY;
                        }
                        if (aspectRatio) {
                            newW = newH * aspectRatio;
                            if (newX + newW > originalWidth) {
                                newW = originalWidth - newX;
                                newH = newW / aspectRatio;
                            }
                        }

                    } else if (dragType === 'n') {
                        newH = Math.max(50, height - dy);
                        const bottomEdge = y + height;
                        newY = bottomEdge - newH;

                        if (newY < 0) {
                            newY = 0;
                            newH = bottomEdge;
                        }
                        if (aspectRatio) {
                            newW = newH * aspectRatio;
                            if (newX + newW > originalWidth) {
                                newW = originalWidth - newX;
                                newH = newW / aspectRatio;
                                newY = bottomEdge - newH;
                            }
                        }
                    }

                    // Final Bound Clamp safety
                    if (newX < 0) { newW += newX; newX = 0; }
                    if (newY < 0) { newH += newY; newY = 0; }
                    if (newX + newW > originalWidth) newW = originalWidth - newX;
                    if (newY + newH > originalHeight) newH = originalHeight - newY;

                    x = newX; y = newY; width = newW; height = newH;
                }

                return { x, y, width, height };
            });

            setDragStart(pos);
            requestRef.current = undefined;
        });
    }, [isDragging, dragType, dragStart, displayScale, originalWidth, originalHeight, aspectRatio]);

    // End drag handler
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        setDragType(null);
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = undefined;
        }
    }, []);

    // Attach global event listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
            return () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
                window.removeEventListener('touchmove', handleDragMove);
                window.removeEventListener('touchend', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Apply aspect ratio
    const applyAspectRatio = (ratio: number | null) => {
        setAspectRatio(ratio);
        if (ratio) {
            setCrop((prev) => {
                let newWidth = prev.width;
                let newHeight = newWidth / ratio;

                if (prev.y + newHeight > originalHeight) {
                    newHeight = originalHeight - prev.y;
                    newWidth = newHeight * ratio;
                }
                if (prev.x + newWidth > originalWidth) {
                    newWidth = originalWidth - prev.x;
                    newHeight = newWidth / ratio;
                }

                return { ...prev, width: newWidth, height: newHeight };
            });
        }
    };

    // Reset crop to full image
    const resetCrop = () => {
        setCrop({
            x: 0,
            y: 0,
            width: originalWidth,
            height: originalHeight,
        });
        setAspectRatio(null);
    };

    const handleSave = () => {
        onCropComplete({
            x: Math.round(crop.x),
            y: Math.round(crop.y),
            width: Math.round(crop.width),
            height: Math.round(crop.height),
        });
    };

    // Corner handle styles
    const handleClass = "absolute w-4 h-4 bg-primary rounded-sm border-2 border-background shadow-md touch-none";
    // Edge handle styles (invisible but touchable area)
    const edgeClass = "absolute bg-transparent touch-none";

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-card rounded-lg w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border">
                    <h3 className="text-base font-semibold">Crop Image</h3>
                    <button onClick={onCancel} className="p-1 rounded hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Aspect Ratio Buttons */}
                <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
                    {ASPECT_RATIOS.map((ar) => (
                        <button
                            key={ar.label}
                            onClick={() => applyAspectRatio(ar.value)}
                            className={cn(
                                "px-2 py-1 text-xs rounded transition-colors",
                                aspectRatio === ar.value
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background hover:bg-muted border border-border"
                            )}
                        >
                            {ar.label}
                        </button>
                    ))}
                    <button
                        onClick={resetCrop}
                        className="px-2 py-1 text-xs rounded bg-background hover:bg-muted border border-border flex items-center gap-1"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </button>
                </div>

                {/* Crop Area */}
                <div ref={containerRef} className="flex-1 relative p-4 flex justify-center items-center overflow-hidden bg-black/50">
                    <div
                        className="relative"
                        style={{
                            width: originalWidth * displayScale,
                            height: originalHeight * displayScale,
                        }}
                    >
                        {/* Original Image (dimmed) */}
                        <img
                            src={imageSrc}
                            alt="Original"
                            className="absolute inset-0 w-full h-full object-contain opacity-30 select-none"
                            draggable={false}
                        />

                        {/* Crop Overlay (visible portion) */}
                        <div
                            className="absolute border-2 border-primary cursor-move overflow-hidden shadow-lg select-none"
                            style={{
                                left: crop.x * displayScale,
                                top: crop.y * displayScale,
                                width: crop.width * displayScale,
                                height: crop.height * displayScale,
                            }}
                            onMouseDown={(e) => handleDragStart(e, 'move')}
                            onTouchStart={(e) => handleDragStart(e, 'move')}
                        >
                            <img
                                src={imageSrc}
                                alt="Crop preview"
                                className="absolute pointer-events-none select-none"
                                style={{
                                    left: -crop.x * displayScale,
                                    top: -crop.y * displayScale,
                                    width: originalWidth * displayScale,
                                    height: originalHeight * displayScale,
                                }}
                                draggable={false}
                            />

                            {/* Grid overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                    {[...Array(9)].map((_, i) => (
                                        <div key={i} className="border border-white/20" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* EDGE HANDLES (Hit areas) */}
                        {/* Top */}
                        <div
                            className={cn(edgeClass, "cursor-ns-resize h-4 w-full -translate-y-1/2")}
                            style={{ left: crop.x * displayScale, top: crop.y * displayScale, width: crop.width * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'n')}
                            onTouchStart={(e) => handleDragStart(e, 'n')}
                        />
                        {/* Bottom */}
                        <div
                            className={cn(edgeClass, "cursor-ns-resize h-4 w-full translate-y-[-50%]")}
                            style={{ left: crop.x * displayScale, top: (crop.y + crop.height) * displayScale, width: crop.width * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 's')}
                            onTouchStart={(e) => handleDragStart(e, 's')}
                        />
                        {/* Left */}
                        <div
                            className={cn(edgeClass, "cursor-ew-resize w-4 h-full -translate-x-1/2")}
                            style={{ left: crop.x * displayScale, top: crop.y * displayScale, height: crop.height * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'w')}
                            onTouchStart={(e) => handleDragStart(e, 'w')}
                        />
                        {/* Right */}
                        <div
                            className={cn(edgeClass, "cursor-ew-resize w-4 h-full translate-x-[-50%]")}
                            style={{ left: (crop.x + crop.width) * displayScale, top: crop.y * displayScale, height: crop.height * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'e')}
                            onTouchStart={(e) => handleDragStart(e, 'e')}
                        />

                        {/* CORNER HANDLES */}
                        <div
                            className={cn(handleClass, "cursor-nw-resize -translate-x-1/2 -translate-y-1/2")}
                            style={{ left: crop.x * displayScale, top: crop.y * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'nw')}
                            onTouchStart={(e) => handleDragStart(e, 'nw')}
                        />
                        <div
                            className={cn(handleClass, "cursor-ne-resize translate-x-[-50%] -translate-y-1/2")}
                            style={{ left: (crop.x + crop.width) * displayScale, top: crop.y * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'ne')}
                            onTouchStart={(e) => handleDragStart(e, 'ne')}
                        />
                        <div
                            className={cn(handleClass, "cursor-sw-resize -translate-x-1/2 translate-y-[-50%]")}
                            style={{ left: crop.x * displayScale, top: (crop.y + crop.height) * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'sw')}
                            onTouchStart={(e) => handleDragStart(e, 'sw')}
                        />
                        <div
                            className={cn(handleClass, "cursor-se-resize translate-x-[-50%] translate-y-[-50%]")}
                            style={{ left: (crop.x + crop.width) * displayScale, top: (crop.y + crop.height) * displayScale }}
                            onMouseDown={(e) => handleDragStart(e, 'se')}
                            onTouchStart={(e) => handleDragStart(e, 'se')}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                        {Math.round(crop.width)} × {Math.round(crop.height)} px
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="px-3 py-1.5 text-sm rounded bg-muted hover:bg-muted/80 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CropTool;
