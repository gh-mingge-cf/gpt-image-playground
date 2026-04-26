import { NextResponse } from 'next/server';
import { isAppPasswordEnabled } from '@/lib/server/auth';

export async function GET() {
    return NextResponse.json({ passwordRequired: isAppPasswordEnabled() });
}
