import crypto from 'crypto';

export function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export function isAppPasswordEnabled(): boolean {
    return Boolean(process.env.APP_PASSWORD?.trim());
}

export function validatePasswordHash(passwordHash: string | null | undefined): string | null {
    if (!isAppPasswordEnabled()) {
        return null;
    }

    if (!passwordHash) {
        return '未授权：缺少密码哈希。';
    }

    const expectedHash = sha256(process.env.APP_PASSWORD!);
    if (passwordHash !== expectedHash) {
        return '未授权：密码无效。';
    }

    return null;
}
