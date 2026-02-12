import { NextRequest } from 'next/server';

/**
 * Derives the base URL from the incoming request headers.
 * Prefers 'x-forwarded-host' if available (behind proxy), otherwise uses 'host'.
 * Defaults to https unless 'x-forwarded-proto' is 'http' or host starts with localhost.
 */
export function getBaseUrl(request: NextRequest): string {
    // 1. Check environment variables first (if not localhost)
    const envUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
    }

    // 2. Try headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';

    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        return `${protocol}://${host}`;
    }

    // 3. Fallback to env var even if localhost (dev environment)
    if (envUrl) return envUrl;

    // 4. Ultimate fallback
    return 'http://localhost:3000';
}
