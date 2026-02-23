/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config';

describe('Security Headers Verification', () => {
    it('should have CSP header defined', async () => {
        const headers = await (nextConfig as any).headers?.();
        const securityHeaders = headers.find((h: any) => h.source === '/(.*)').headers;
        const csp = securityHeaders.find((h: any) => h.key === 'Content-Security-Policy');
        expect(csp).toBeDefined();
        expect(csp.value).toContain("default-src 'self'");
    });

    it('should have Anti-Clickjacking (X-Frame-Options) set to DENY', async () => {
        const headers = await (nextConfig as any).headers?.();
        const securityHeaders = headers.find((h: any) => h.source === '/(.*)').headers;
        const frameOptions = securityHeaders.find((h: any) => h.key === 'X-Frame-Options');
        expect(frameOptions.value).toBe('DENY');
    });

    it('should have HSTS configured with long max-age', async () => {
        const headers = await (nextConfig as any).headers?.();
        const securityHeaders = headers.find((h: any) => h.source === '/(.*)').headers;
        const hsts = securityHeaders.find((h: any) => h.key === 'Strict-Transport-Security');
        expect(hsts.value).toContain('max-age=63072000');
    });

    it('should have COOP and CORP isolation headers', async () => {
        const headers = await (nextConfig as any).headers?.();
        const securityHeaders = headers.find((h: any) => h.source === '/(.*)').headers;
        const coop = securityHeaders.find((h: any) => h.key === 'Cross-Origin-Opener-Policy');
        const corp = securityHeaders.find((h: any) => h.key === 'Cross-Origin-Resource-Policy');
        expect(coop.value).toBe('same-origin');
        expect(corp.value).toBe('same-origin');
    });
});
