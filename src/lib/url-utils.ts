import { NextRequest } from 'next/server';

/**
 * Derives the base URL from the incoming request headers.
 * Prefers 'x-forwarded-host' if available (behind proxy), otherwise uses 'host'.
 * Defaults to https unless 'x-forwarded-proto' is 'http' or host starts with localhost.
 */
export function getBaseUrl(request: NextRequest): string {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;
    return baseUrl;
}
