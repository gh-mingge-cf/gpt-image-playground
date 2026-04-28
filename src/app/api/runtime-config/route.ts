import { NextRequest, NextResponse } from 'next/server';
import {
    clearRuntimeConfig,
    getRuntimeConfigStatus,
    readRuntimeConfig,
    writeRuntimeConfig,
    type StoredRuntimeConfig
} from '@/lib/server/runtime-config';
import { validatePasswordHash } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

type UpdateRuntimeConfigRequestBody = {
    passwordHash?: string;
    apiKey?: string;
    baseURL?: string;
    clearApiKey?: boolean;
    resetToEnv?: boolean;
};

function unauthorizedResponse(message: string) {
    return NextResponse.json({ error: message }, { status: 401 });
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '发生未知错误。';
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
        const nextConfig: StoredRuntimeConfig = { ...currentConfig };

        if (requestBody.clearApiKey) {
            delete nextConfig.apiKey;
        }

        if (typeof requestBody.apiKey === 'string' && requestBody.apiKey.trim()) {
            nextConfig.apiKey = requestBody.apiKey.trim();
        }

        if ('baseURL' in requestBody) {
            const normalizedBaseURL = requestBody.baseURL?.trim();
            nextConfig.baseURL = normalizedBaseURL || undefined;
        }

        await writeRuntimeConfig(nextConfig);

        return NextResponse.json(await getRuntimeConfigStatus());
    } catch (error: unknown) {
        console.error('Failed to update runtime configuration:', error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
