import fs from 'fs/promises';
import path from 'path';

export type OpenAIConfigSource = 'runtime' | 'env' | 'default' | 'none';

export type StoredRuntimeConfig = {
    apiKey?: string;
    baseURL?: string;
};

export type EffectiveOpenAIConfig = {
    apiKey?: string;
    baseURL?: string;
    apiKeySource: OpenAIConfigSource;
    baseURLSource: OpenAIConfigSource;
};

export type RuntimeConfigStatus = {
    apiKeyConfigured: boolean;
    apiKeySource: OpenAIConfigSource;
    maskedApiKey: string | null;
    baseURL: string;
    baseURLSource: OpenAIConfigSource;
    runtimeApiKeyConfigured: boolean;
    runtimeBaseURLConfigured: boolean;
    runtimeOverridesActive: boolean;
    runtimeConfigPath: string;
};

const runtimeConfigPath = process.env.RUNTIME_CONFIG_PATH?.trim()
    ? path.resolve(process.env.RUNTIME_CONFIG_PATH)
    : path.resolve(process.cwd(), 'data', 'runtime-config.json');

function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function maskSecret(secret: string): string {
    if (secret.length <= 8) {
        return `${secret.slice(0, 2)}***`;
    }

    return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

async function ensureRuntimeConfigDirExists() {
    await fs.mkdir(path.dirname(runtimeConfigPath), { recursive: true });
}

export async function readRuntimeConfig(): Promise<StoredRuntimeConfig> {
    try {
        const contents = await fs.readFile(runtimeConfigPath, 'utf8');
        const parsed = JSON.parse(contents) as StoredRuntimeConfig;

        return {
            apiKey: normalizeOptionalString(parsed.apiKey),
            baseURL: normalizeOptionalString(parsed.baseURL)
        };
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return {};
        }

        throw error;
    }
}

export async function writeRuntimeConfig(config: StoredRuntimeConfig): Promise<void> {
    const normalizedConfig: StoredRuntimeConfig = {
        apiKey: normalizeOptionalString(config.apiKey),
        baseURL: normalizeOptionalString(config.baseURL)
    };

    if (!normalizedConfig.apiKey && !normalizedConfig.baseURL) {
        await clearRuntimeConfig();
        return;
    }

    await ensureRuntimeConfigDirExists();

    const tempPath = `${runtimeConfigPath}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, runtimeConfigPath);
}

export async function clearRuntimeConfig(): Promise<void> {
    try {
        await fs.unlink(runtimeConfigPath);
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return;
        }

        throw error;
    }
}

export async function getEffectiveOpenAIConfig(): Promise<EffectiveOpenAIConfig> {
    const runtimeConfig = await readRuntimeConfig();
    const envApiKey = normalizeOptionalString(process.env.OPENAI_API_KEY);
    const envBaseURL = normalizeOptionalString(process.env.OPENAI_API_BASE_URL);

    const apiKey = runtimeConfig.apiKey ?? envApiKey;
    const baseURL = runtimeConfig.baseURL ?? envBaseURL;

    return {
        apiKey,
        baseURL,
        apiKeySource: runtimeConfig.apiKey ? 'runtime' : envApiKey ? 'env' : 'none',
        baseURLSource: runtimeConfig.baseURL ? 'runtime' : envBaseURL ? 'env' : 'default'
    };
}

export async function getRuntimeConfigStatus(): Promise<RuntimeConfigStatus> {
    const runtimeConfig = await readRuntimeConfig();
    const effectiveConfig = await getEffectiveOpenAIConfig();

    return {
        apiKeyConfigured: Boolean(effectiveConfig.apiKey),
        apiKeySource: effectiveConfig.apiKeySource,
        maskedApiKey: effectiveConfig.apiKey ? maskSecret(effectiveConfig.apiKey) : null,
        baseURL: effectiveConfig.baseURL ?? '',
        baseURLSource: effectiveConfig.baseURLSource,
        runtimeApiKeyConfigured: Boolean(runtimeConfig.apiKey),
        runtimeBaseURLConfigured: Boolean(runtimeConfig.baseURL),
        runtimeOverridesActive: Boolean(runtimeConfig.apiKey || runtimeConfig.baseURL),
        runtimeConfigPath
    };
}
