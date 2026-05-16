import fs from 'fs/promises';
import path from 'path';

export type OpenAIConfigSource = 'runtime' | 'env' | 'default' | 'none';

export type RuntimeConfigProfile = {
    id: string;
    name: string;
    apiKey?: string;
    baseURL?: string;
};

export type StoredRuntimeConfig = {
    version?: 2;
    activeProfileId?: string;
    profiles?: RuntimeConfigProfile[];
    apiKey?: string;
    baseURL?: string;
};

export type EffectiveOpenAIConfig = {
    apiKey?: string;
    baseURL?: string;
    apiKeySource: OpenAIConfigSource;
    baseURLSource: OpenAIConfigSource;
    activeProfileId: string | null;
    activeProfileName: string | null;
};

export type RuntimeConfigProfileStatus = {
    id: string;
    name: string;
    apiKeyConfigured: boolean;
    maskedApiKey: string | null;
    baseURL: string;
    isActive: boolean;
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
    activeProfileId: string | null;
    activeProfileName: string | null;
    profiles: RuntimeConfigProfileStatus[];
};

const RUNTIME_CONFIG_VERSION = 2;
const runtimeConfigPath = process.env.RUNTIME_CONFIG_PATH?.trim()
    ? path.resolve(process.env.RUNTIME_CONFIG_PATH)
    : path.resolve(process.cwd(), 'data', 'runtime-config.json');

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

function normalizeProfileId(value: unknown, index: number): string {
    const normalized = normalizeOptionalString(value);
    return normalized || `profile-${index + 1}`;
}

function normalizeProfileName(value: unknown, index: number): string {
    return normalizeOptionalString(value) || `配置 ${index + 1}`;
}

function normalizeStoredProfile(value: unknown, index: number): RuntimeConfigProfile | null {
    if (!isRecord(value)) {
        return null;
    }

    const apiKey = normalizeOptionalString(value.apiKey);
    const baseURL = normalizeOptionalString(value.baseURL);

    return {
        id: normalizeProfileId(value.id, index),
        name: normalizeProfileName(value.name, index),
        ...(apiKey ? { apiKey } : {}),
        ...(baseURL ? { baseURL } : {})
    };
}

function normalizeStoredRuntimeConfig(config: unknown): StoredRuntimeConfig {
    if (!isRecord(config)) {
        return {};
    }

    const rawProfiles = Array.isArray(config.profiles) ? config.profiles : [];
    const profiles = rawProfiles
        .map((profile, index) => normalizeStoredProfile(profile, index))
        .filter((profile): profile is RuntimeConfigProfile => Boolean(profile));

    if (profiles.length > 0) {
        const activeProfileId = normalizeOptionalString(config.activeProfileId);
        return {
            version: RUNTIME_CONFIG_VERSION,
            activeProfileId: activeProfileId && profiles.some((profile) => profile.id === activeProfileId)
                ? activeProfileId
                : profiles[0].id,
            profiles
        };
    }

    const apiKey = normalizeOptionalString(config.apiKey);
    const baseURL = normalizeOptionalString(config.baseURL);

    if (!apiKey && !baseURL) {
        return {};
    }

    return {
        version: RUNTIME_CONFIG_VERSION,
        activeProfileId: 'profile-1',
        profiles: [
            {
                id: 'profile-1',
                name: '默认配置',
                ...(apiKey ? { apiKey } : {}),
                ...(baseURL ? { baseURL } : {})
            }
        ]
    };
}

function getActiveProfile(config: StoredRuntimeConfig): RuntimeConfigProfile | null {
    if (!config.profiles?.length) {
        return null;
    }

    if (config.activeProfileId) {
        const activeProfile = config.profiles.find((profile) => profile.id === config.activeProfileId);
        if (activeProfile) {
            return activeProfile;
        }
    }

    return config.profiles[0] ?? null;
}

async function ensureRuntimeConfigDirExists() {
    await fs.mkdir(path.dirname(runtimeConfigPath), { recursive: true });
}

export async function readRuntimeConfig(): Promise<StoredRuntimeConfig> {
    try {
        const contents = await fs.readFile(runtimeConfigPath, 'utf8');
        const parsed = JSON.parse(contents) as unknown;

        return normalizeStoredRuntimeConfig(parsed);
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return {};
        }

        throw error;
    }
}

export async function writeRuntimeConfig(config: StoredRuntimeConfig): Promise<void> {
    const normalizedConfig = normalizeStoredRuntimeConfig(config);

    if (!normalizedConfig.profiles?.length) {
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
    const activeProfile = getActiveProfile(runtimeConfig);
    const envApiKey = normalizeOptionalString(process.env.OPENAI_API_KEY);
    const envBaseURL = normalizeOptionalString(process.env.OPENAI_API_BASE_URL);

    const apiKey = activeProfile?.apiKey ?? envApiKey;
    const baseURL = activeProfile?.baseURL ?? envBaseURL;

    return {
        apiKey,
        baseURL,
        apiKeySource: activeProfile?.apiKey ? 'runtime' : envApiKey ? 'env' : 'none',
        baseURLSource: activeProfile?.baseURL ? 'runtime' : envBaseURL ? 'env' : 'default',
        activeProfileId: activeProfile?.id ?? null,
        activeProfileName: activeProfile?.name ?? null
    };
}

export async function getRuntimeConfigStatus(): Promise<RuntimeConfigStatus> {
    const runtimeConfig = await readRuntimeConfig();
    const effectiveConfig = await getEffectiveOpenAIConfig();
    const activeProfile = getActiveProfile(runtimeConfig);
    const activeProfileId = activeProfile?.id ?? null;

    return {
        apiKeyConfigured: Boolean(effectiveConfig.apiKey),
        apiKeySource: effectiveConfig.apiKeySource,
        maskedApiKey: effectiveConfig.apiKey ? maskSecret(effectiveConfig.apiKey) : null,
        baseURL: effectiveConfig.baseURL ?? '',
        baseURLSource: effectiveConfig.baseURLSource,
        runtimeApiKeyConfigured: Boolean(activeProfile?.apiKey),
        runtimeBaseURLConfigured: Boolean(activeProfile?.baseURL),
        runtimeOverridesActive: Boolean(runtimeConfig.profiles?.length),
        runtimeConfigPath,
        activeProfileId,
        activeProfileName: activeProfile?.name ?? null,
        profiles: (runtimeConfig.profiles ?? []).map((profile) => ({
            id: profile.id,
            name: profile.name,
            apiKeyConfigured: Boolean(profile.apiKey),
            maskedApiKey: profile.apiKey ? maskSecret(profile.apiKey) : null,
            baseURL: profile.baseURL ?? '',
            isActive: profile.id === activeProfileId
        }))
    };
}
