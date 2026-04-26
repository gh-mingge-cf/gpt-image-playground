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
                    <DialogTitle className='text-white'>API Settings</DialogTitle>
                    <DialogDescription className='text-white/60'>
                        Runtime changes apply to new image requests immediately. API key input is write-only and will
                        not be shown after saving.
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4'>
                    {!isPasswordProtected && (
                        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100'>
                            <code className='rounded bg-black/30 px-1 py-0.5 text-xs text-amber-50'>APP_PASSWORD</code>{' '}
                            is not set. Anyone who can open this UI can change the runtime API settings.
                        </div>
                    )}

                    {status && (
                        <div className='space-y-2 rounded-md border border-white/10 bg-white/5 p-4 text-sm'>
                            <p>
                                Active API key: <span className='font-medium text-white'>{status.maskedApiKey ?? 'Not configured'}</span>
                            </p>
                            <p>
                                API key source: <span className='font-medium text-white'>{status.apiKeySource}</span>
                            </p>
                            <p>
                                Active base URL:{' '}
                                <span className='font-medium text-white'>{status.baseURL || 'OpenAI default'}</span>
                            </p>
                            <p>
                                Base URL source: <span className='font-medium text-white'>{status.baseURLSource}</span>
                            </p>
                            <p>
                                Runtime config path:{' '}
                                <code className='rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/90'>
                                    {status.runtimeConfigPath}
                                </code>
                            </p>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label htmlFor='runtime-api-key' className='text-white'>
                            New API key
                        </Label>
                        <Input
                            id='runtime-api-key'
                            type='password'
                            value={apiKeyValue}
                            onChange={(e) => onApiKeyChange(e.target.value)}
                            placeholder='Leave blank to keep the current key'
                            disabled={isBusy}
                            className='border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                        />
                        <p className='text-xs text-white/50'>Only enter this when you want to replace the active key.</p>
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
                            Clear this field and save to fall back to `OPENAI_API_BASE_URL` or the OpenAI default.
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
                            Clear Saved API Key
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onResetToEnv}
                            disabled={isBusy || !status?.runtimeOverridesActive}
                            className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                            Reset Runtime Overrides
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type='button'
                        onClick={onSave}
                        disabled={isBusy}
                        className='bg-white px-6 text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'>
                        {isBusy ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
