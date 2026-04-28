'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as React from 'react';

export type RuntimeConfigDialogStatus = {
    apiKeyConfigured: boolean;
    apiKeySource: 'runtime' | 'env' | 'default' | 'none';
    maskedApiKey: string | null;
    baseURL: string;
    baseURLSource: 'runtime' | 'env' | 'default' | 'none';
    runtimeApiKeyConfigured: boolean;
    runtimeBaseURLConfigured: boolean;
    runtimeOverridesActive: boolean;
    runtimeConfigPath: string;
};

interface RuntimeConfigDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    status: RuntimeConfigDialogStatus | null;
    apiKeyValue: string;
    onApiKeyChange: (value: string) => void;
    baseURLValue: string;
    onBaseURLChange: (value: string) => void;
    onSave: () => void;
    onClearRuntimeApiKey: () => void;
    onResetToEnv: () => void;
    isLoading: boolean;
    isSaving: boolean;
    isPasswordProtected: boolean;
    error: string | null;
    success: string | null;
}

function formatConfigSource(source: RuntimeConfigDialogStatus['apiKeySource']): string {
    switch (source) {
        case 'runtime':
            return '运行时配置';
        case 'env':
            return '环境变量';
        case 'default':
            return '默认值';
        case 'none':
            return '未配置';
        default:
            return source;
    }
}

export function RuntimeConfigDialog({
    isOpen,
    onOpenChange,
    status,
    apiKeyValue,
    onApiKeyChange,
    baseURLValue,
    onBaseURLChange,
    onSave,
    onClearRuntimeApiKey,
    onResetToEnv,
    isLoading,
    isSaving,
    isPasswordProtected,
    error,
    success
}: RuntimeConfigDialogProps) {
    const isBusy = isLoading || isSaving;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='border-white/20 bg-black text-white sm:max-w-[560px]'>
                <DialogHeader>
                    <DialogTitle className='text-white'>API 设置</DialogTitle>
                    <DialogDescription className='text-white/60'>
                        运行时修改会立即作用于新的图片请求。API Key 输入框只用于写入，保存后不会回显明文。
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4'>
                    {!isPasswordProtected && (
                        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100'>
                            <code className='rounded bg-black/30 px-1 py-0.5 text-xs text-amber-50'>APP_PASSWORD</code>{' '}
                            未设置。任何能打开此页面的人都可以修改运行时 API 设置。
                        </div>
                    )}

                    {status && (
                        <div className='space-y-2 rounded-md border border-white/10 bg-white/5 p-4 text-sm'>
                            <p>
                                当前 API Key:{' '}
                                <span className='font-medium text-white'>{status.maskedApiKey ?? '未配置'}</span>
                            </p>
                            <p>
                                API Key 来源:{' '}
                                <span className='font-medium text-white'>{formatConfigSource(status.apiKeySource)}</span>
                            </p>
                            <p>
                                当前 Base URL:{' '}
                                <span className='font-medium text-white'>{status.baseURL || 'OpenAI 默认端点'}</span>
                            </p>
                            <p>
                                Base URL 来源:{' '}
                                <span className='font-medium text-white'>
                                    {formatConfigSource(status.baseURLSource)}
                                </span>
                            </p>
                            <p>
                                运行时配置路径:{' '}
                                <code className='rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/90'>
                                    {status.runtimeConfigPath}
                                </code>
                            </p>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label htmlFor='runtime-api-key' className='text-white'>
                            新 API Key
                        </Label>
                        <Input
                            id='runtime-api-key'
                            type='password'
                            value={apiKeyValue}
                            onChange={(e) => onApiKeyChange(e.target.value)}
                            placeholder='留空表示保留当前 Key'
                            disabled={isBusy}
                            className='border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                        />
                        <p className='text-xs text-white/50'>只有需要替换当前 Key 时才填写此项。</p>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='runtime-base-url' className='text-white'>
                            Base URL
                        </Label>
                        <Input
                            id='runtime-base-url'
                            value={baseURLValue}
                            onChange={(e) => onBaseURLChange(e.target.value)}
                            placeholder='https://api.openai.com/v1'
                            disabled={isBusy}
                            className='border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                        />
                        <p className='text-xs text-white/50'>
                            清空后保存，将回退到 `OPENAI_API_BASE_URL` 或 OpenAI 默认端点。
                        </p>
                    </div>

                    {(error || success) && (
                        <div
                            className={`rounded-md border p-3 text-sm ${
                                error
                                    ? 'border-red-500/40 bg-red-500/10 text-red-200'
                                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            }`}>
                            {error ?? success}
                        </div>
                    )}

                    <div className='flex flex-wrap gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClearRuntimeApiKey}
                            disabled={isBusy || !status?.runtimeApiKeyConfigured}
                            className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                            清除已保存的 API Key
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onResetToEnv}
                            disabled={isBusy || !status?.runtimeOverridesActive}
                            className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                            重置运行时覆盖
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type='button'
                        onClick={onSave}
                        disabled={isBusy}
                        className='bg-white px-6 text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'>
                        {isBusy ? '保存中...' : '保存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
