import { describe, it, expect } from 'vitest';
import { securityHeadersLabels } from '../lib/security-headers';

describe('Security Headers Verification', () => {
  it('should have CSP header defined', () => {
    const csp = securityHeadersLabels.find((h) => h.key === 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp?.value).toContain("default-src 'self'");
  });

  it('should have Anti-Clickjacking (X-Frame-Options) set to DENY', () => {
    const frameOptions = securityHeadersLabels.find((h) => h.key === 'X-Frame-Options');
    expect(frameOptions?.value).toBe('DENY');
  });

  it('should have HSTS configured with long max-age', () => {
    const hsts = securityHeadersLabels.find((h) => h.key === 'Strict-Transport-Security');
    expect(hsts?.value).toContain('max-age=63072000');
  });

  it('should have COOP and CORP isolation headers', () => {
    const coop = securityHeadersLabels.find((h) => h.key === 'Cross-Origin-Opener-Policy');
    const corp = securityHeadersLabels.find((h) => h.key === 'Cross-Origin-Resource-Policy');
    expect(coop?.value).toBe('same-origin');
    expect(corp?.value).toBe('same-origin');
  });
});
