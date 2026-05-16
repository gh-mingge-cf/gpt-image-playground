'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, ScanLine } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

export type ImagePreviewItem = {
    path: string;
    filename: string;
    width?: number;
    height?: number;
};

type ImagePreviewDialogProps = {
    images: ImagePreviewItem[];
    initialIndex: number;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

function clampZoom(value: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function formatResolution(image: ImagePreviewItem | undefined, dimensions?: { width: number; height: number }): string {
    const width = image?.width ?? dimensions?.width;
    const height = image?.height ?? dimensions?.height;

    if (!width || !height) {
        return '分辨率未知';
    }

    return `${width} x ${height}`;
}

export function ImagePreviewDialog({ images, initialIndex, isOpen, onOpenChange }: ImagePreviewDialogProps) {
    const [activeIndex, setActiveIndex] = React.useState(initialIndex);
    const [isFitToScreen, setIsFitToScreen] = React.useState(true);
    const [zoom, setZoom] = React.useState(1);
    const [measuredDimensions, setMeasuredDimensions] = React.useState<Record<string, { width: number; height: number }>>(
        {}
    );

    const activeImage = images[activeIndex];
    const activeMeasuredDimensions = activeImage ? measuredDimensions[activeImage.filename] : undefined;
    const activeDimensions = activeImage
        ? {
              width: activeImage.width ?? activeMeasuredDimensions?.width ?? 1024,
              height: activeImage.height ?? activeMeasuredDimensions?.height ?? 1024
          }
        : { width: 1024, height: 1024 };

    const goToImage = React.useCallback(
        (nextIndex: number) => {
            if (!images.length) {
                return;
            }

            setActiveIndex((nextIndex + images.length) % images.length);
            setIsFitToScreen(true);
            setZoom(1);
        },
        [images.length]
    );

    const zoomIn = React.useCallback(() => {
        setIsFitToScreen(false);
        setZoom((currentZoom) => clampZoom(currentZoom * 1.25));
    }, []);

    const zoomOut = React.useCallback(() => {
        setIsFitToScreen(false);
        setZoom((currentZoom) => clampZoom(currentZoom / 1.25));
    }, []);

    const fitToScreen = React.useCallback(() => {
        setIsFitToScreen(true);
        setZoom(1);
    }, []);

    const showActualSize = React.useCallback(() => {
        setIsFitToScreen(false);
        setZoom(1);
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
            setIsFitToScreen(true);
            setZoom(1);
        }
    }, [images.length, initialIndex, isOpen]);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToImage(activeIndex - 1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToImage(activeIndex + 1);
            } else if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                zoomIn();
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                zoomOut();
            } else if (event.key === '0') {
                event.preventDefault();
                fitToScreen();
            } else if (event.key === '1') {
                event.preventDefault();
                showActualSize();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeIndex, fitToScreen, goToImage, isOpen, showActualSize, zoomIn, zoomOut]);

    if (!activeImage) {
        return null;
    }

    const renderedWidth = isFitToScreen ? activeDimensions.width : Math.round(activeDimensions.width * zoom);
    const renderedHeight = isFitToScreen ? activeDimensions.height : Math.round(activeDimensions.height * zoom);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] border-white/20 bg-black p-0 text-white sm:max-w-[calc(100vw-2rem)]'>
                <DialogHeader className='sr-only'>
                    <DialogTitle>图片预览</DialogTitle>
                    <DialogDescription>可缩放查看图片。</DialogDescription>
                </DialogHeader>

                <div className='flex h-full min-h-0 flex-col'>
                    <div className='flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 pr-12'>
                        <div className='min-w-0'>
                            <p className='truncate text-sm font-medium text-white'>{activeImage.filename}</p>
                            <p className='text-xs text-white/50'>
                                {formatResolution(activeImage, activeMeasuredDimensions)}
                                {images.length > 1 ? ` · ${activeIndex + 1}/${images.length}` : ''}
                            </p>
                        </div>

                        <div className='flex shrink-0 items-center gap-1'>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={zoomOut}
                                className='text-white/75 hover:bg-white/10 hover:text-white'
                                title='缩小'>
                                <Minus className='h-4 w-4' />
                            </Button>
                            <div className='w-14 text-center text-xs text-white/60'>
                                {isFitToScreen ? '适配' : `${Math.round(zoom * 100)}%`}
                            </div>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={zoomIn}
                                className='text-white/75 hover:bg-white/10 hover:text-white'
                                title='放大'>
                                <Plus className='h-4 w-4' />
                            </Button>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={fitToScreen}
                                className='text-white/75 hover:bg-white/10 hover:text-white'
                                title='适配屏幕'>
                                <Maximize2 className='h-4 w-4' />
                            </Button>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={showActualSize}
                                className='text-white/75 hover:bg-white/10 hover:text-white'
                                title='实际大小'>
                                <ScanLine className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    <div className='relative min-h-0 flex-1 overflow-auto bg-neutral-950'>
                        {images.length > 1 && (
                            <>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => goToImage(activeIndex - 1)}
                                    className='absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-black/70 text-white hover:bg-white/15 hover:text-white'
                                    title='上一张'>
                                    <ChevronLeft className='h-5 w-5' />
                                </Button>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => goToImage(activeIndex + 1)}
                                    className='absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-black/70 text-white hover:bg-white/15 hover:text-white'
                                    title='下一张'>
                                    <ChevronRight className='h-5 w-5' />
                                </Button>
                            </>
                        )}

                        <div
                            className={`flex min-h-full min-w-full items-center justify-center p-6 ${
                                isFitToScreen ? 'h-full' : ''
                            }`}>
                            <Image
                                key={activeImage.filename}
                                src={activeImage.path}
                                alt='预览图片'
                                width={activeDimensions.width}
                                height={activeDimensions.height}
                                className={isFitToScreen ? 'max-h-full max-w-full object-contain' : 'object-contain'}
                                style={
                                    isFitToScreen
                                        ? undefined
                                        : {
                                              width: `${renderedWidth}px`,
                                              height: `${renderedHeight}px`,
                                              maxWidth: 'none',
                                              maxHeight: 'none'
                                          }
                                }
                                onLoad={(event) => {
                                    const target = event.currentTarget;
                                    setMeasuredDimensions((currentDimensions) => ({
                                        ...currentDimensions,
                                        [activeImage.filename]: {
                                            width: target.naturalWidth,
                                            height: target.naturalHeight
                                        }
                                    }));
                                }}
                                onDoubleClick={() => {
                                    if (isFitToScreen) {
                                        showActualSize();
                                    } else {
                                        fitToScreen();
                                    }
                                }}
                                unoptimized
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
