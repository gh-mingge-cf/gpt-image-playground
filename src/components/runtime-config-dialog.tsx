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
import { Check, CheckCircle2, PencilLine, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import * as React from 'react';

export type RuntimeConfigDialogProfileStatus = {
    id: string;
    name: string;
    apiKeyConfigured: boolean;
    maskedApiKey: string | null;
    baseURL: string;
    isActive: boolean;
};

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
    activeProfileId: string | null;
    activeProfileName: string | null;
    profiles: RuntimeConfigDialogProfileStatus[];
};

interface RuntimeConfigDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    status: RuntimeConfigDialogStatus | null;
    selectedProfileId: string | null;
    onSelectProfile: (profileId: string | null) => void;
    onCreateProfile: () => void;
    profileNameValue: string;
    onProfileNameChange: (value: string) => void;
    apiKeyValue: string;
    onApiKeyChange: (value: string) => void;
    baseURLValue: string;
    onBaseURLChange: (value: string) => void;
    onSaveProfile: () => void;
    onDeleteProfile: () => void;
    onActivateProfile: (profileId: string) => void;
    onClearProfileApiKey: () => void;
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
    selectedProfileId,
    onSelectProfile,
    onCreateProfile,
    profileNameValue,
    onProfileNameChange,
    apiKeyValue,
    onApiKeyChange,
    baseURLValue,
    onBaseURLChange,
    onSaveProfile,
    onDeleteProfile,
    onActivateProfile,
    onClearProfileApiKey,
    onResetToEnv,
    isLoading,
    isSaving,
    isPasswordProtected,
    error,
    success
}: RuntimeConfigDialogProps) {
    const isBusy = isLoading || isSaving;
    const profiles = status?.profiles ?? [];
    const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
    const isEditingExistingProfile = Boolean(selectedProfile);
    const canClearProfileApiKey = Boolean(selectedProfile?.apiKeyConfigured);
    const canActivateSelectedProfile = Boolean(selectedProfile && !selectedProfile.isActive);
    const activeProfile = profiles.find((profile) => profile.isActive) ?? null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='max-h-[90vh] overflow-y-auto border-white/20 bg-black text-white sm:max-w-[880px]'>
                <DialogHeader>
                    <DialogTitle className='text-white'>API 设置</DialogTitle>
                    <DialogDescription className='text-white/60'>
                        这里可以保存多个 API 配置并切换当前使用的密钥与端点。保存后，新请求会立即使用当前启用的配置。
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
                        <div className='grid gap-3 rounded-md border border-white/10 bg-white/5 p-4 text-sm sm:grid-cols-2'>
                            <p className='min-w-0'>
                                当前启用:{' '}
                                <span className='font-medium text-white'>
                                    {status.activeProfileName ?? '环境变量 / 默认值'}
                                </span>
                            </p>
                            <p className='min-w-0'>
                                API Key 来源:{' '}
                                <span className='font-medium text-white'>
                                    {formatConfigSource(status.apiKeySource)}
                                </span>
                            </p>
                            <p className='min-w-0'>
                                当前 Base URL:{' '}
                                <span className='font-medium text-white'>{status.baseURL || 'OpenAI 默认端点'}</span>
                            </p>
                            <p className='min-w-0'>
                                Base URL 来源:{' '}
                                <span className='font-medium text-white'>
                                    {formatConfigSource(status.baseURLSource)}
                                </span>
                            </p>
                            <p className='min-w-0'>
                                运行时配置路径:{' '}
                                <code className='rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/90'>
                                    {status.runtimeConfigPath}
                                </code>
                            </p>
                            <p className='min-w-0'>
                                已保存配置:{' '}
                                <span className='font-medium text-white'>{profiles.length || 0}</span>
                            </p>
                        </div>
                    )}

                    <div className='flex flex-wrap gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onResetToEnv}
                            disabled={isBusy || !status?.runtimeOverridesActive}
                            className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                            <RefreshCcw className='h-4 w-4' />
                            重置所有运行时配置
                        </Button>
                    </div>

                    <div className='grid gap-4 lg:grid-cols-[1fr_1.4fr]'>
                        <div className='space-y-3'>
                            <div className='flex items-center justify-between gap-2'>
                                <div>
                                    <p className='text-sm font-medium text-white'>配置列表</p>
                                    <p className='text-xs text-white/50'>选择一个配置进行编辑，或切换当前启用的配置。</p>
                                </div>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={onCreateProfile}
                                    disabled={isBusy}
                                    className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                                    <Plus className='h-4 w-4' />
                                    新建
                                </Button>
                            </div>

                            <div className='space-y-2'>
                                {profiles.length === 0 ? (
                                    <div className='rounded-md border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/60'>
                                        还没有保存任何配置。点击“新建”开始添加第一组 API 和密钥。
                                    </div>
                                ) : (
                                    profiles.map((profile) => {
                                        const isSelected = profile.id === selectedProfileId;

                                        return (
                                            <div
                                                key={profile.id}
                                                className={`rounded-md border p-3 ${
                                                    isSelected
                                                        ? 'border-white bg-white/10'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                }`}>
                                                <div className='flex items-start justify-between gap-3'>
                                                    <button
                                                        type='button'
                                                        onClick={() => onSelectProfile(profile.id)}
                                                        className='min-w-0 flex-1 text-left'>
                                                        <div className='flex items-center gap-2'>
                                                            <p className='truncate font-medium text-white'>{profile.name}</p>
                                                            {profile.isActive ? (
                                                                <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200'>
                                                                    <CheckCircle2 className='h-3.5 w-3.5' />
                                                                    当前使用
                                                                </span>
                                                            ) : (
                                                                <span className='text-xs text-white/40'>未启用</span>
                                                            )}
                                                        </div>
                                                        <p className='mt-1 truncate text-xs text-white/50'>
                                                            Base URL: {profile.baseURL || 'OpenAI 默认端点'}
                                                        </p>
                                                        <p className='mt-1 truncate text-xs text-white/50'>
                                                            API Key: {profile.maskedApiKey ?? '未配置'}
                                                        </p>
                                                    </button>

                                                    <div className='flex shrink-0 items-center gap-1'>
                                                        {!profile.isActive && (
                                                            <Button
                                                                type='button'
                                                                variant='ghost'
                                                                size='icon'
                                                                onClick={() => onActivateProfile(profile.id)}
                                                                disabled={isBusy}
                                                                className='text-white hover:bg-white/10 hover:text-white'
                                                                title='启用此配置'>
                                                                <Check className='h-4 w-4' />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type='button'
                                                            variant='ghost'
                                                            size='icon'
                                                            onClick={() => onSelectProfile(profile.id)}
                                                            disabled={isBusy}
                                                            className='text-white hover:bg-white/10 hover:text-white'
                                                            title='编辑此配置'>
                                                            <PencilLine className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className='space-y-4 rounded-md border border-white/10 bg-white/5 p-4'>
                            <div className='flex items-start justify-between gap-3'>
                                <div>
                                    <p className='text-sm font-medium text-white'>
                                        {isEditingExistingProfile ? '编辑配置' : '新建配置'}
                                    </p>
                                    <p className='text-xs text-white/50'>
                                        API Key 不会回显明文。留空时，已有密钥会保留不变。
                                    </p>
                                </div>
                                {selectedProfile?.isActive ? (
                                    <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200'>
                                        <CheckCircle2 className='h-3.5 w-3.5' />
                                        当前使用
                                    </span>
                                ) : null}
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='runtime-profile-name' className='text-white'>
                                    配置名称
                                </Label>
                                <Input
                                    id='runtime-profile-name'
                                    value={profileNameValue}
                                    onChange={(e) => onProfileNameChange(e.target.value)}
                                    placeholder='例如 OpenAI / 兼容接口'
                                    disabled={isBusy}
                                    className='border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='runtime-api-key' className='text-white'>
                                    API Key
                                </Label>
                                <Input
                                    id='runtime-api-key'
                                    type='password'
                                    value={apiKeyValue}
                                    onChange={(e) => onApiKeyChange(e.target.value)}
                                    placeholder={
                                        isEditingExistingProfile
                                            ? '留空则保留现有密钥'
                                            : '输入新配置的 API Key'
                                    }
                                    disabled={isBusy}
                                    className='border-white/20 bg-black text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/50'
                                />
                                <p className='text-xs text-white/50'>
                                    {isEditingExistingProfile
                                        ? '如果要替换现有密钥，请直接输入新值；如果要保留当前密钥，保持留空。'
                                        : '创建新配置时可以先不填，之后再补充。'}
                                </p>
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
                                <p className='text-xs text-white/50'>清空后会回退到环境变量或 OpenAI 默认端点。</p>
                            </div>

                            <div className='flex flex-wrap gap-2 pt-1'>
                                <Button
                                    type='button'
                                    onClick={onSaveProfile}
                                    disabled={isBusy}
                                    className='bg-white px-6 text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'>
                                    {isBusy ? '处理中...' : isEditingExistingProfile ? '保存配置' : '创建配置'}
                                </Button>

                                {selectedProfile && canActivateSelectedProfile && (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={() => onActivateProfile(selectedProfile.id)}
                                        disabled={isBusy}
                                        className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                                        <Check className='h-4 w-4' />
                                        设为当前使用
                                    </Button>
                                )}

                                {selectedProfile && (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={onClearProfileApiKey}
                                        disabled={isBusy || !canClearProfileApiKey}
                                        className='border-white/20 bg-black text-white hover:bg-white/10 hover:text-white'>
                                        清除密钥
                                    </Button>
                                )}

                                {selectedProfile && (
                                    <Button
                                        type='button'
                                        variant='destructive'
                                        onClick={onDeleteProfile}
                                        disabled={isBusy}
                                        className='shadow-none'>
                                        <Trash2 className='h-4 w-4' />
                                        删除配置
                                    </Button>
                                )}
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
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <div className='text-xs text-white/40'>
                        当前启用: {activeProfile?.name ?? '环境变量 / 默认值'}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
