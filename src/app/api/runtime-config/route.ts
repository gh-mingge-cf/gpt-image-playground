import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
    clearRuntimeConfig,
    getRuntimeConfigStatus,
    readRuntimeConfig,
    writeRuntimeConfig,
    type RuntimeConfigProfile,
    type StoredRuntimeConfig
} from '@/lib/server/runtime-config';
import { validatePasswordHash } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

type SaveRuntimeProfileRequest = {
    id?: string;
    name?: string;
    apiKey?: string | null;
    baseURL?: string | null;
    keepApiKey?: boolean;
};

type UpdateRuntimeConfigRequestBody = {
    passwordHash?: string;
    resetToEnv?: boolean;
    saveProfile?: SaveRuntimeProfileRequest;
    deleteProfileId?: string;
    activateProfileId?: string;
    clearProfileApiKeyId?: string;
};

function unauthorizedResponse(message: string) {
    return NextResponse.json({ error: message }, { status: 401 });
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '发生未知错误。';
}

function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function isRuntimeProfile(profile: RuntimeConfigProfile | undefined): profile is RuntimeConfigProfile {
    return Boolean(profile);
}

export async function GET(request: NextRequest) {
    const authError = validatePasswordHash(request.headers.get('x-password-hash'));
    if (authError) {
        return unauthorizedResponse(authError);
    }

    try {
        return NextResponse.json(await getRuntimeConfigStatus());
    } catch (error: unknown) {
        console.error('Failed to read runtime configuration:', error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    let requestBody: UpdateRuntimeConfigRequestBody;

    try {
        requestBody = await request.json();
    } catch (error: unknown) {
        console.error('Failed to parse runtime config request body:', error);
        return NextResponse.json({ error: '请求体无效：必须是 JSON。' }, { status: 400 });
    }

    if (typeof requestBody !== 'object' || requestBody === null || Array.isArray(requestBody)) {
        return NextResponse.json({ error: '请求体无效：必须是 JSON 对象。' }, { status: 400 });
    }

    const authError = validatePasswordHash(requestBody.passwordHash);
    if (authError) {
        return unauthorizedResponse(authError);
    }

    try {
        if (requestBody.resetToEnv) {
            await clearRuntimeConfig();
            return NextResponse.json(await getRuntimeConfigStatus());
        }

        const currentConfig = await readRuntimeConfig();
        const currentProfiles = [...(currentConfig.profiles ?? [])];

        if (requestBody.saveProfile) {
            const profileName = normalizeOptionalString(requestBody.saveProfile.name);
            if (!profileName) {
                return NextResponse.json({ error: '配置名称不能为空。' }, { status: 400 });
            }

            const profileId = normalizeOptionalString(requestBody.saveProfile.id) ?? randomUUID();
            const existingIndex = currentProfiles.findIndex((profile) => profile.id === profileId);
            const existingProfile = existingIndex >= 0 ? currentProfiles[existingIndex] : undefined;
            const hasBaseURLField = typeof requestBody.saveProfile.baseURL === 'string';
            const nextApiKey = normalizeOptionalString(requestBody.saveProfile.apiKey);
            const nextBaseURL = hasBaseURLField ? normalizeOptionalString(requestBody.saveProfile.baseURL) : undefined;

            const nextProfile: RuntimeConfigProfile = {
                id: existingProfile?.id ?? profileId,
                name: profileName,
                ...(hasBaseURLField
                    ? { baseURL: nextBaseURL }
                    : isRuntimeProfile(existingProfile)
                      ? existingProfile.baseURL
                        ? { baseURL: existingProfile.baseURL }
                        : {}
                      : {}),
                ...(nextApiKey !== undefined
                    ? { apiKey: nextApiKey }
                    : requestBody.saveProfile.keepApiKey && isRuntimeProfile(existingProfile) && existingProfile.apiKey
                      ? { apiKey: existingProfile.apiKey }
                      : {})
            };

            if (existingIndex >= 0) {
                currentProfiles[existingIndex] = nextProfile;
            } else {
                currentProfiles.push(nextProfile);
            }

            const nextConfig: StoredRuntimeConfig = {
                ...currentConfig,
                profiles: currentProfiles,
                activeProfileId: currentConfig.activeProfileId && currentProfiles.some((profile) => profile.id === currentConfig.activeProfileId)
                    ? currentConfig.activeProfileId
                    : currentProfiles[0]?.id
            };

            await writeRuntimeConfig(nextConfig);

            return NextResponse.json({
                ...(await getRuntimeConfigStatus()),
                savedProfileId: nextProfile.id
            });
        }

        if (requestBody.deleteProfileId) {
            const profileId = normalizeOptionalString(requestBody.deleteProfileId);
            if (!profileId) {
                return NextResponse.json({ error: '缺少要删除的配置 ID。' }, { status: 400 });
            }

            const nextProfiles = currentProfiles.filter((profile) => profile.id !== profileId);
            if (nextProfiles.length === currentProfiles.length) {
                return NextResponse.json({ error: '未找到要删除的配置。' }, { status: 404 });
            }

            if (nextProfiles.length === 0) {
                await clearRuntimeConfig();
                return NextResponse.json(await getRuntimeConfigStatus());
            }

            const nextActiveProfileId = currentConfig.activeProfileId === profileId || !nextProfiles.some((profile) => profile.id === currentConfig.activeProfileId)
                ? nextProfiles[0].id
                : currentConfig.activeProfileId;

            await writeRuntimeConfig({
                ...currentConfig,
                profiles: nextProfiles,
                activeProfileId: nextActiveProfileId
            });

            return NextResponse.json(await getRuntimeConfigStatus());
        }

        if (requestBody.activateProfileId) {
            const profileId = normalizeOptionalString(requestBody.activateProfileId);
            if (!profileId) {
                return NextResponse.json({ error: '缺少要启用的配置 ID。' }, { status: 400 });
            }

            if (!currentProfiles.some((profile) => profile.id === profileId)) {
                return NextResponse.json({ error: '未找到要启用的配置。' }, { status: 404 });
            }

            await writeRuntimeConfig({
                ...currentConfig,
                profiles: currentProfiles,
                activeProfileId: profileId
            });

            return NextResponse.json(await getRuntimeConfigStatus());
        }

        if (requestBody.clearProfileApiKeyId) {
            const profileId = normalizeOptionalString(requestBody.clearProfileApiKeyId);
            if (!profileId) {
                return NextResponse.json({ error: '缺少要清除的配置 ID。' }, { status: 400 });
            }

            const profileIndex = currentProfiles.findIndex((profile) => profile.id === profileId);
            if (profileIndex < 0) {
                return NextResponse.json({ error: '未找到要清除密钥的配置。' }, { status: 404 });
            }

            currentProfiles[profileIndex] = {
                ...currentProfiles[profileIndex],
                apiKey: undefined
            };

            await writeRuntimeConfig({
                ...currentConfig,
                profiles: currentProfiles,
                activeProfileId:
                    currentConfig.activeProfileId && currentProfiles.some((profile) => profile.id === currentConfig.activeProfileId)
                        ? currentConfig.activeProfileId
                        : currentProfiles[0]?.id
            });

            return NextResponse.json(await getRuntimeConfigStatus());
        }

        return NextResponse.json({ error: '请求体未包含可执行的配置操作。' }, { status: 400 });
    } catch (error: unknown) {
        console.error('Failed to update runtime configuration:', error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
