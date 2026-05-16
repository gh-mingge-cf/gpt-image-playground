'use client';

import type { HistoryMetadata } from '@/app/page';
import { getModelRates, type GptImageModel } from '@/lib/cost-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ImagePreviewDialog, type ImagePreviewItem } from '@/components/image-preview-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Copy,
    Check,
    Layers,
    DollarSign,
    Pencil,
    Sparkles as SparklesIcon,
    HardDrive,
    Database,
    FileImage,
    Trash2
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

type HistoryPanelProps = {
    history: HistoryMetadata[];
    onSelectImage: (item: HistoryMetadata) => void;
    onClearHistory: () => void;
    getImageSrc: (filename: string) => string | undefined;
    onDeleteItemRequest: (item: HistoryMetadata) => void;
    itemPendingDeleteConfirmation: HistoryMetadata | null;
    onConfirmDeletion: () => void;
    onCancelDeletion: () => void;
    deletePreferenceDialogValue: boolean;
    onDeletePreferenceDialogChange: (isChecked: boolean) => void;
};

const formatDuration = (ms: number): string => {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
};

const calculateCost = (value: number, rate: number): string => {
    const cost = value * rate;
    return isNaN(cost) ? '不可用' : cost.toFixed(4);
};

const formatSettingValue = (value: string | undefined): string => {
    switch (value) {
        case 'auto':
            return '自动';
        case 'low':
            return '低';
        case 'medium':
            return '中';
        case 'high':
            return '高';
        case 'opaque':
            return '不透明';
        case 'transparent':
            return '透明';
        default:
            return value || '未知';
    }
};

type ImageFileMetadata = {
    width: number;
    height: number;
    sizeBytes: number;
};

const imageMetadataCache = new Map<string, Promise<ImageFileMetadata | null>>();

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
};

const formatActualResolution = (metadata: ImageFileMetadata[] | null): string => {
    if (!metadata) {
        return '读取中...';
    }

    if (metadata.length === 0) {
        return '未知';
    }

    const uniqueDimensions = Array.from(new Set(metadata.map((image) => `${image.width} x ${image.height}`)));
    if (uniqueDimensions.length === 1) {
        return uniqueDimensions[0];
    }

    return `${uniqueDimensions[0]} 等 ${uniqueDimensions.length} 种`;
};

const formatRequestedSize = (requestedSize: string | undefined): string => {
    if (!requestedSize) {
        return '未记录';
    }

    return formatSettingValue(requestedSize);
};

const formatRequestedVsActualSize = (requestedSize: string | undefined, metadata: ImageFileMetadata[] | null): string => {
    return `${formatRequestedSize(requestedSize)} -> ${formatActualResolution(metadata)}`;
};

const formatBatchFileSize = (metadata: ImageFileMetadata[] | null, imageCount: number): string => {
    if (!metadata) {
        return '读取中...';
    }

    if (metadata.length === 0) {
        return '未知';
    }

    const totalBytes = metadata.reduce((sum, image) => sum + image.sizeBytes, 0);
    if (imageCount <= 1) {
        return formatFileSize(totalBytes);
    }

    return `${imageCount} 张，共 ${formatFileSize(totalBytes)}`;
};

const formatApiConfigName = (item: HistoryMetadata): string => {
    if (!('apiConfigProfileName' in item)) {
        return '未记录';
    }

    return item.apiConfigProfileName || '环境变量 / 默认值';
};

const loadImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => {
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight
            });
        };
        image.onerror = () => reject(new Error('无法读取图片尺寸。'));
        image.src = src;
    });
};

const loadImageFileMetadata = (src: string): Promise<ImageFileMetadata | null> => {
    const cached = imageMetadataCache.get(src);
    if (cached) {
        return cached;
    }

    const metadataPromise = Promise.all([loadImageDimensions(src), fetch(src).then((response) => response.blob())])
        .then(([dimensions, blob]) => ({
            ...dimensions,
            sizeBytes: blob.size
        }))
        .catch((error) => {
            console.warn('Failed to read image metadata:', error);
            return null;
        });

    imageMetadataCache.set(src, metadataPromise);

    return metadataPromise;
};

function HistoryImageDetails({
    item,
    getImageSrc
}: {
    item: HistoryMetadata;
    getImageSrc: (filename: string) => string | undefined;
}) {
    const [metadata, setMetadata] = React.useState<ImageFileMetadata[] | null>(null);

    React.useEffect(() => {
        let isCancelled = false;
        const originalStorageMode = item.storageModeUsed || 'fs';

        setMetadata(null);

        Promise.all(
            item.images.map(async (image) => {
                const src =
                    originalStorageMode === 'indexeddb'
                        ? getImageSrc(image.filename)
                        : `/api/image/${image.filename}`;

                if (!src) {
                    return null;
                }

                return loadImageFileMetadata(src);
            })
        ).then((loadedMetadata) => {
            if (!isCancelled) {
                setMetadata(loadedMetadata.filter((image): image is ImageFileMetadata => Boolean(image)));
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [getImageSrc, item.images, item.storageModeUsed]);

    return (
        <>
            <p>
                <span className='font-medium text-white/80'>时间：</span>{' '}
                {new Date(item.timestamp).toLocaleString()}
            </p>
            <p>
                <span className='font-medium text-white/80'>耗时：</span> {formatDuration(item.durationMs)}
            </p>
            <p>
                <span className='font-medium text-white/80'>尺寸：</span>{' '}
                {formatRequestedVsActualSize(item.requestedSize, metadata)}
            </p>
            <p>
                <span className='font-medium text-white/80'>文件：</span>{' '}
                {formatBatchFileSize(metadata, item.images.length)}
            </p>
            <p title={formatApiConfigName(item)}>
                <span className='font-medium text-white/80'>API 配置：</span>{' '}
                <span className='break-all'>{formatApiConfigName(item)}</span>
            </p>
        </>
    );
}

function HistoryPanelImpl({
    history,
    onSelectImage,
    onClearHistory,
    getImageSrc,
    onDeleteItemRequest,
    itemPendingDeleteConfirmation,
    onConfirmDeletion,
    onCancelDeletion,
    deletePreferenceDialogValue,
    onDeletePreferenceDialogChange
}: HistoryPanelProps) {
    const [openPromptDialogTimestamp, setOpenPromptDialogTimestamp] = React.useState<number | null>(null);
    const [openCostDialogTimestamp, setOpenCostDialogTimestamp] = React.useState<number | null>(null);
    const [isTotalCostDialogOpen, setIsTotalCostDialogOpen] = React.useState(false);
    const [copiedTimestamp, setCopiedTimestamp] = React.useState<number | null>(null);
    const [previewImages, setPreviewImages] = React.useState<ImagePreviewItem[]>([]);
    const [previewInitialIndex, setPreviewInitialIndex] = React.useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    const { totalCost, totalImages } = React.useMemo(() => {
        let cost = 0;
        let images = 0;
        history.forEach((item) => {
            if (item.costDetails) {
                cost += item.costDetails.estimated_cost_usd;
            }
            images += item.images?.length ?? 0;
        });

        return { totalCost: Math.round(cost * 10000) / 10000, totalImages: images };
    }, [history]);

    const averageCost = totalImages > 0 ? totalCost / totalImages : 0;

    const handleCopy = async (text: string | null | undefined, timestamp: number) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedTimestamp(timestamp);
            setTimeout(() => setCopiedTimestamp(null), 1500);
        } catch (err) {
            console.error('复制文本失败：', err);
        }
    };

    const openImagePreview = (item: HistoryMetadata, initialIndex = 0) => {
        const originalStorageMode = item.storageModeUsed || 'fs';
        const images = item.images.reduce<ImagePreviewItem[]>((previewItems, image) => {
            const path =
                originalStorageMode === 'indexeddb' ? getImageSrc(image.filename) : `/api/image/${image.filename}`;

            if (!path) {
                return previewItems;
            }

            previewItems.push({
                path,
                filename: image.filename
            });

            return previewItems;
        }, []);

        if (images.length === 0) {
            return;
        }

        setPreviewImages(images);
        setPreviewInitialIndex(Math.min(Math.max(initialIndex, 0), images.length - 1));
        setIsPreviewOpen(true);
    };

    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black'>
            <ImagePreviewDialog
                images={previewImages}
                initialIndex={previewInitialIndex}
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
            />

            <CardHeader className='flex flex-row items-center justify-between gap-4 border-b border-white/10 px-4 py-3'>
                <div className='flex items-center gap-2'>
                    <CardTitle className='text-lg font-medium text-white'>历史记录</CardTitle>
                    {totalCost > 0 && (
                        <Dialog open={isTotalCostDialogOpen} onOpenChange={setIsTotalCostDialogOpen}>
                            <DialogTrigger asChild>
                                <button
                                    className='mt-0.5 flex items-center gap-1 rounded-full bg-green-600/80 px-1.5 py-0.5 text-[12px] text-white transition-colors hover:bg-green-500/90'
                                    aria-label='查看总成本汇总'>
                                    总成本：${totalCost.toFixed(4)}
                                </button>
                            </DialogTrigger>
                            <DialogContent className='border-neutral-700 bg-neutral-900 text-white sm:max-w-[450px]'>
                                <DialogHeader>
                                    <DialogTitle className='text-white'>总成本汇总</DialogTitle>
                                    <DialogDescription className='sr-only'>
                                        历史记录中所有生成图片的预计总成本汇总。
                                    </DialogDescription>
                                </DialogHeader>
                                <div className='space-y-1 pt-1 text-xs text-neutral-400'>
                                    <p className='font-medium'>gpt-image-2:</p>
                                    <ul className='list-disc pl-4'>
                                        <li>文本输入：$5 / 100 万 tokens</li>
                                        <li>图片输入：$8 / 100 万 tokens</li>
                                        <li>图片输出：$30 / 100 万 tokens</li>
                                    </ul>
                                    <p className='mt-2 font-medium'>gpt-image-1.5:</p>
                                    <ul className='list-disc pl-4'>
                                        <li>文本输入：$5 / 100 万 tokens</li>
                                        <li>图片输入：$8 / 100 万 tokens</li>
                                        <li>图片输出：$32 / 100 万 tokens</li>
                                    </ul>
                                    <p className='mt-2 font-medium'>gpt-image-1:</p>
                                    <ul className='list-disc pl-4'>
                                        <li>文本输入：$5 / 100 万 tokens</li>
                                        <li>图片输入：$10 / 100 万 tokens</li>
                                        <li>图片输出：$40 / 100 万 tokens</li>
                                    </ul>
                                    <p className='mt-2 font-medium'>gpt-image-1-mini:</p>
                                    <ul className='list-disc pl-4'>
                                        <li>文本输入：$2 / 100 万 tokens</li>
                                        <li>图片输入：$2.50 / 100 万 tokens</li>
                                        <li>图片输出：$8 / 100 万 tokens</li>
                                    </ul>
                                </div>
                                <div className='space-y-2 py-4 text-sm text-neutral-300'>
                                    <div className='flex justify-between'>
                                        <span>生成图片总数：</span> <span>{totalImages.toLocaleString()}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>单张平均成本：</span> <span>${averageCost.toFixed(4)}</span>
                                    </div>
                                    <hr className='my-2 border-neutral-700' />
                                    <div className='flex justify-between font-medium text-white'>
                                        <span>预计总成本：</span>
                                        <span>${totalCost.toFixed(4)}</span>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type='button'
                                            variant='secondary'
                                            size='sm'
                                            className='bg-neutral-700 text-neutral-200 hover:bg-neutral-600'>
                                            关闭
                                        </Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {history.length > 0 && (
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={onClearHistory}
                        className='h-auto rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white'>
                        清空
                    </Button>
                )}
            </CardHeader>
            <CardContent className='flex-grow overflow-y-auto p-4'>
                {history.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-white/40'>
                        <p>生成的图片会显示在这里。</p>
                    </div>
                ) : (
                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                        {[...history].map((item) => {
                            const firstImage = item.images?.[0];
                            const imageCount = item.images?.length ?? 0;
                            const isMultiImage = imageCount > 1;
                            const itemKey = item.timestamp;
                            const originalStorageMode = item.storageModeUsed || 'fs';
                            const outputFormat = item.output_format || 'png';

                            let thumbnailUrl: string | undefined;
                            if (firstImage) {
                                if (originalStorageMode === 'indexeddb') {
                                    thumbnailUrl = getImageSrc(firstImage.filename);
                                } else {
                                    thumbnailUrl = `/api/image/${firstImage.filename}`;
                                }
                            }

                            return (
                                <div key={itemKey} className='flex flex-col'>
                                    <div className='group relative'>
                                        <button
                                            onClick={() => onSelectImage(item)}
                                            onDoubleClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                openImagePreview(item);
                                            }}
                                            className='relative block aspect-square w-full overflow-hidden rounded-t-md border border-white/20 transition-all duration-150 group-hover:border-white/40 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black focus:outline-none'
                                            aria-label={`查看 ${new Date(item.timestamp).toLocaleString()} 的图片批次`}>
                                            {thumbnailUrl ? (
                                                <Image
                                                    src={thumbnailUrl}
                                                    alt={`${new Date(item.timestamp).toLocaleString()} 生成批次的预览`}
                                                    width={150}
                                                    height={150}
                                                    className='h-full w-full object-cover'
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className='flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-500'>
                                                    ?
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    'pointer-events-none absolute top-1 left-1 z-10 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] text-white',
                                                    item.mode === 'edit' ? 'bg-orange-600/80' : 'bg-blue-600/80'
                                                )}>
                                                {item.mode === 'edit' ? (
                                                    <Pencil size={12} />
                                                ) : (
                                                    <SparklesIcon size={12} />
                                                )}
                                                {item.mode === 'edit' ? '编辑' : '生成'}
                                            </div>
                                            {isMultiImage && (
                                                <div className='pointer-events-none absolute right-1 bottom-1 z-10 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[12px] text-white'>
                                                    <Layers size={16} />
                                                    {imageCount}
                                                </div>
                                            )}
                                            <div className='pointer-events-none absolute bottom-1 left-1 z-10 flex items-center gap-1'>
                                                <div className='flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/80 px-1 py-0.5 text-[11px] text-white/70'>
                                                    {originalStorageMode === 'fs' ? (
                                                        <HardDrive size={12} className='text-neutral-400' />
                                                    ) : (
                                                        <Database size={12} className='text-blue-400' />
                                                    )}
                                                    <span>{originalStorageMode === 'fs' ? '文件' : '数据库'}</span>
                                                </div>
                                                {item.output_format && (
                                                    <div className='flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/80 px-1 py-0.5 text-[11px] text-white/70'>
                                                        <FileImage size={12} className='text-neutral-400' />
                                                        <span>{outputFormat.toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                        {item.costDetails && (
                                            <Dialog
                                                open={openCostDialogTimestamp === itemKey}
                                                onOpenChange={(isOpen) => !isOpen && setOpenCostDialogTimestamp(null)}>
                                                <DialogTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenCostDialogTimestamp(itemKey);
                                                        }}
                                                        className='absolute top-1 right-1 z-20 flex items-center gap-0.5 rounded-full bg-green-600/80 px-1.5 py-0.5 text-[11px] text-white transition-colors hover:bg-green-500/90'
                                                        aria-label='查看成本明细'>
                                                        <DollarSign size={12} />
                                                        {item.costDetails.estimated_cost_usd.toFixed(4)}
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className='border-neutral-700 bg-neutral-900 text-white sm:max-w-[450px]'>
                                                    <DialogHeader>
                                                        <DialogTitle className='text-white'>成本明细</DialogTitle>
                                                        <DialogDescription className='sr-only'>
                                                            本次图片生成的预计成本明细。
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    {(() => {
                                                        const modelForRates: GptImageModel = (item.model ||
                                                            'gpt-image-1') as GptImageModel;
                                                        const rates = getModelRates(modelForRates);
                                                        return (
                                                            <>
                                                                <div className='space-y-1 pt-1 text-xs text-neutral-400'>
                                                                    <p>{modelForRates} 价格：</p>
                                                                    <ul className='list-disc pl-4'>
                                                                        <li>
                                                                            文本输入：${rates.textInputPerMillion} /
                                                                            100 万 tokens
                                                                        </li>
                                                                        <li>
                                                                            图片输入：${rates.imageInputPerMillion} /
                                                                            100 万 tokens
                                                                        </li>
                                                                        <li>
                                                                            图片输出：$
                                                                            {rates.imageOutputPerMillion} / 100 万 tokens
                                                                        </li>
                                                                    </ul>
                                                                </div>
                                                                <div className='space-y-2 py-4 text-sm text-neutral-300'>
                                                                    <div className='flex justify-between'>
                                                                        <span>文本输入 tokens：</span>{' '}
                                                                        <span>
                                                                            {item.costDetails.text_input_tokens.toLocaleString()}{' '}
                                                                            (~$
                                                                            {calculateCost(
                                                                                item.costDetails.text_input_tokens,
                                                                                rates.textInputPerToken
                                                                            )}
                                                                            )
                                                                        </span>
                                                                    </div>
                                                                    {item.costDetails.image_input_tokens > 0 && (
                                                                        <div className='flex justify-between'>
                                                                            <span>图片输入 tokens：</span>{' '}
                                                                            <span>
                                                                                {item.costDetails.image_input_tokens.toLocaleString()}{' '}
                                                                                (~$
                                                                                {calculateCost(
                                                                                    item.costDetails
                                                                                        .image_input_tokens,
                                                                                    rates.imageInputPerToken
                                                                                )}
                                                                                )
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div className='flex justify-between'>
                                                                        <span>图片输出 tokens：</span>{' '}
                                                                        <span>
                                                                            {item.costDetails.image_output_tokens.toLocaleString()}{' '}
                                                                            (~$
                                                                            {calculateCost(
                                                                                item.costDetails.image_output_tokens,
                                                                                rates.imageOutputPerToken
                                                                            )}
                                                                            )
                                                                        </span>
                                                                    </div>
                                                                    <hr className='my-2 border-neutral-700' />
                                                                    <div className='flex justify-between font-medium text-white'>
                                                                        <span>预计总成本：</span>
                                                                        <span>
                                                                            ${item.costDetails.estimated_cost_usd.toFixed(4)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    <DialogFooter>
                                                        <DialogClose asChild>
                                                            <Button
                                                                type='button'
                                                                variant='secondary'
                                                                size='sm'
                                                                className='bg-neutral-700 text-neutral-200 hover:bg-neutral-600'>
                                                                关闭
                                                            </Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>

                                    <div className='space-y-1 rounded-b-md border border-t-0 border-neutral-700 bg-black p-2 text-xs text-white/60'>
                                        <HistoryImageDetails item={item} getImageSrc={getImageSrc} />
                                        <p>
                                            <span className='font-medium text-white/80'>模型：</span>{' '}
                                            {item.model || 'gpt-image-1'}
                                        </p>
                                        <p>
                                            <span className='font-medium text-white/80'>质量：</span>{' '}
                                            {formatSettingValue(item.quality)}
                                        </p>
                                        <p>
                                            <span className='font-medium text-white/80'>背景：</span>{' '}
                                            {formatSettingValue(item.background)}
                                        </p>
                                        <p>
                                            <span className='font-medium text-white/80'>审核：</span>{' '}
                                            {formatSettingValue(item.moderation)}
                                        </p>
                                        <div className='mt-2 flex items-center gap-1'>
                                            <Dialog
                                                open={openPromptDialogTimestamp === itemKey}
                                                onOpenChange={(isOpen) =>
                                                    !isOpen && setOpenPromptDialogTimestamp(null)
                                                }>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        className='h-6 flex-grow border-white/20 px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white'
                                                        onClick={() => setOpenPromptDialogTimestamp(itemKey)}>
                                                        查看提示词
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className='border-neutral-700 bg-neutral-900 text-white sm:max-w-[625px]'>
                                                    <DialogHeader>
                                                        <DialogTitle className='text-white'>提示词</DialogTitle>
                                                        <DialogDescription className='sr-only'>
                                                            用于生成此图片批次的完整提示词。
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className='max-h-[400px] overflow-y-auto rounded-md border border-neutral-600 bg-neutral-800 p-3 py-4 text-sm text-neutral-300'>
                                                        {item.prompt || '未记录提示词。'}
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            variant='outline'
                                                            size='sm'
                                                            onClick={() => handleCopy(item.prompt, itemKey)}
                                                            className='border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-white'>
                                                            {copiedTimestamp === itemKey ? (
                                                                <Check className='mr-2 h-4 w-4 text-green-400' />
                                                            ) : (
                                                                <Copy className='mr-2 h-4 w-4' />
                                                            )}
                                                            {copiedTimestamp === itemKey ? '已复制' : '复制'}
                                                        </Button>
                                                        <DialogClose asChild>
                                                            <Button
                                                                type='button'
                                                                variant='secondary'
                                                                size='sm'
                                                                className='bg-neutral-700 text-neutral-200 hover:bg-neutral-600'>
                                                                关闭
                                                            </Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                            <Dialog
                                                open={itemPendingDeleteConfirmation?.timestamp === item.timestamp}
                                                onOpenChange={(isOpen) => {
                                                    if (!isOpen) onCancelDeletion();
                                                }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        className='h-6 w-6 bg-red-700/60 text-white hover:bg-red-600/60'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteItemRequest(item);
                                                        }}
                                                        aria-label='删除历史记录项'>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className='border-neutral-700 bg-neutral-900 text-white sm:max-w-md'>
                                                    <DialogHeader>
                                                        <DialogTitle className='text-white'>
                                                            确认删除
                                                        </DialogTitle>
                                                        <DialogDescription className='pt-2 text-neutral-300'>
                                                            确定要删除这条历史记录吗？这会移除 {item.images.length}{' '}
                                                            张图片，且无法撤销。
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className='flex items-center space-x-2 py-2'>
                                                        <Checkbox
                                                            id={`dont-ask-${item.timestamp}`}
                                                            checked={deletePreferenceDialogValue}
                                                            onCheckedChange={(checked) =>
                                                                onDeletePreferenceDialogChange(!!checked)
                                                            }
                                                            className='border-neutral-400 bg-white data-[state=checked]:border-neutral-700 data-[state=checked]:bg-white data-[state=checked]:text-black dark:border-neutral-500 dark:!bg-white'
                                                        />
                                                        <label
                                                            htmlFor={`dont-ask-${item.timestamp}`}
                                                            className='text-sm leading-none font-medium text-neutral-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                                                            不再询问
                                                        </label>
                                                    </div>
                                                    <DialogFooter className='gap-2 sm:justify-end'>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            onClick={onCancelDeletion}
                                                            className='border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-white'>
                                                            取消
                                                        </Button>
                                                        <Button
                                                            type='button'
                                                            variant='destructive'
                                                            size='sm'
                                                            onClick={onConfirmDeletion}
                                                            className='bg-red-600 text-white hover:bg-red-500'>
                                                            删除
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export const HistoryPanel = React.memo(HistoryPanelImpl);
