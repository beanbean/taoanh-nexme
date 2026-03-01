# SSRF Security Implementation - Code Review Report

**Date:** 2026-03-01
**Reviewer:** Code Review Agent
**Base SHA:** 023ca3f8bd6e38c8472d37ea0bf9b63f10decf87
**Head SHA:** c12b37e8e0b312d0526417f4f4ec368dcc144a6d

---

## Executive Summary

**Overall Assessment:** ✅ **STRONG** - Security implementation is comprehensive and well-structured with minor improvements recommended.

The SSRF protection implementation demonstrates strong security awareness with proper defense-in-depth approach. Code follows YAGNI, KISS, and DRY principles. Build passes without errors.

**Critical Issues:** 0
**High Priority:** 3
**Medium Priority:** 4
**Low Priority:** 3

---

## Files Reviewed

| File | Lines | Status | Security Score |
|------|-------|--------|----------------|
| `app/src/lib/security.ts` | 138 | New | A |
| `app/src/app/api/avatar/route.ts` | 80 | Modified | A- |
| `app/src/app/api/download/route.ts` | 114 | Modified | A- |

**Total:** 332 lines analyzed

---

## Critical Issues

### None Identified

No critical security vulnerabilities found.

---

## High Priority Findings

### 1. **DNS Rebinding Vulnerability** ⚠️

**Location:** `app/src/lib/security.ts:35-56`

**Issue:** Current implementation validates hostname at request time but doesn't account for DNS rebinding attacks where a domain resolves to a private IP after validation.

**Attack Vector:**
```javascript
// Attacker controls evil.com which initially resolves to public IP
// DNS changes mid-request to 192.168.1.1
// Validation passes, but request hits internal network
```

**Recommendation:**
```typescript
// In app/src/lib/security.ts
import { dnsLookup } from 'node:dns/promises'; // Or similar

export async function isSafeFromRebinding(urlString: string): Promise<{valid: boolean, error?: string}> {
  const basicCheck = isValidUrl(urlString);
  if (!basicCheck.valid) return basicCheck;

  try {
    const url = new URL(urlString);
    // Resolve to actual IPs
    const { addresses } = await dnsLookup(url.hostname);

    // Check all resolved IPs against blocked patterns
    for (const addr of addresses) {
      for (const pattern of BLOCKED_IP_PATTERNS) {
        if (pattern.test(addr)) {
          return { valid: false, error: 'DNS resolves to blocked IP range' };
        }
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'DNS resolution failed' };
  }
}
```

**Severity:** High (exploitable in certain network configurations)

---

### 2. **Content-Length Header Bypass** ⚠️

**Location:** Both API routes (lines 52-58 in avatar, 92-98 in download)

**Issue:** File size validation relies on `Content-Length` header which can be:
1. Omitted by malicious servers
2. Set to incorrect value
3. Changed mid-stream

**Current Code:**
```typescript
const contentLength = response.headers.get('content-length');
if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
  return NextResponse.json({ error: 'File too large' }, { status: 400 });
}
const blob = await response.blob(); // Still fetches full blob!
```

**Attack Vector:** Server sends `Content-Length: 100` but streams 5GB file.

**Recommendation:**
```typescript
// Enforce actual stream size limit
const MAX_SIZE_AVATAR = 5 * 1024 * 1024;

async function fetchWithSizeLimit(url: string, maxSize: number): Promise<Blob> {
  const response = await fetch(url);

  // Track bytes downloaded
  let bytesReceived = 0;
  const chunks: Uint8Array[] = [];

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesReceived += value.length;
    if (bytesReceived > maxSize) {
      reader.cancel();
      throw new Error('File size limit exceeded');
    }
    chunks.push(value);
  }

  return new Blob(chunks, { type: response.headers.get('content-type') || '' });
}
```

**Severity:** High (DoS vulnerability)

---

### 3. **Missing Rate Limiting** ⚠️

**Location:** Both API endpoints

**Issue:** No rate limiting allows:
- Resource exhaustion attacks
- Brute force domain enumeration
- Cost escalation (bandwidth/API calls)

**Recommendation:**
```typescript
// Simple in-memory rate limiter (production: use Redis)
const rateLimiter = new Map<string, {count: number, resetTime: number}>();

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

// In route handler:
const ip = request.headers.get('x-forwarded-for') || 'unknown';
if (!checkRateLimit(ip, 10, 60000)) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

**Severity:** High (DoS vulnerability)

---

## Medium Priority Improvements

### 4. **Filename Sanitization Edge Cases**

**Location:** `app/src/lib/security.ts:93-118`

**Issue:** Several edge cases in filename sanitization:

1. **Double extensions not handled:**
   ```typescript
   sanitizeFilename("evil.png.js") // Returns "evil.png.js" (not safe)
   ```

2. **Empty filename after sanitization uses timestamp** - Good but could be more descriptive:
   ```typescript
   // Current:
   sanitized = 'download_' + Date.now();

   // Better:
   sanitized = `image_${Date.now()}.png`;
   ```

3. **Unicode handling not specified:**
   ```typescript
   // "файл.png" becomes "_____.png" (information loss)
   ```

**Recommendation:**
```typescript
export function sanitizeFilename(filename: string): string {
  // Remove path separators
  let sanitized = filename.replace(/[\/\\]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove leading dots
  sanitized = sanitized.replace(/^\.+/g, '');

  // Whitelist approach - only safe chars
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent double extensions (common trick: exploit.png.php)
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    // Keep only first and last parts
    sanitized = `${parts.slice(0, -1).join('_')}.${parts[parts.length - 1]}`;
  }

  // Length limit (255 bytes for most filesystems)
  if (sanitized.length > 255) {
    const ext = sanitized.includes('.') ? sanitized.split('.').pop() : '';
    const maxNameLen = ext ? 250 - ext.length : 255;
    const name = sanitized.slice(0, -(ext.length + 1));
    sanitized = name.slice(0, maxNameLen) + (ext ? '.' + ext : '');
  }

  // Fallback
  if (!sanitized || sanitized.startsWith('.')) {
    sanitized = `image_${Date.now()}.png`;
  }

  return sanitized;
}
```

---

### 5. **SVG Content-Type Allows XSS**

**Location:** `app/src/lib/security.ts:124-138`

**Issue:** SVG files can contain malicious JavaScript:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert(document.cookie)</script>
</svg>
```

**Current code allows:** `'image/svg+xml'`

**Recommendation:**
```typescript
export function isValidImageContentType(contentType: string, allowSvg = false): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // 'image/svg+xml', // REMOVE - XSS risk
    'image/bmp',
    'image/x-icon',
  ];

  if (allowSvg) {
    validTypes.push('image/svg+xml');
  }

  const normalizedType = contentType.toLowerCase().split(';')[0].trim();
  return validTypes.includes(normalizedType);
}

// OR - add SVG sanitization
export async function sanitizeSvg(content: string): Promise<string> {
  // Use DOMPurify or similar library
  const DOMPurify = (await import('isomorphic-dompurify')).default;
  return DOMPurify.sanitize(content, {
    USE_PROFILES: { svg: true, svgFilters: true }
  });
}
```

**Severity:** Medium (XSS vulnerability if SVG displayed without sanitization)

---

### 6. **Error Messages Leak Information**

**Location:** Multiple locations

**Issue:** Error messages expose internal implementation details:

```typescript
// Avatar API line 16:
{ error: urlValidation.error || 'Invalid URL', dataUrl: '' }

// Download API line 37:
error: `Domain not allowed. Allowed domains: ${ALLOWED_DOWNLOAD_DOMAINS.join(', ')}`
```

**Security Concern:** Attackers can enumerate allowed domains and infrastructure.

**Recommendation:**
```typescript
// In production:
const isDev = process.env.NODE_ENV === 'development';

return NextResponse.json({
  error: isDev ? urlValidation.error : 'Invalid URL',
  dataUrl: ''
}, { status: 400 });
```

---

### 7. **Missing Input Length Validation**

**Location:** Both API routes

**Issue:** No validation on URL/filename parameter lengths allows DoS through large inputs.

**Recommendation:**
```typescript
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  // Validate URL length (max 2048 characters per RFC)
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (url.length > 2048) {
    return NextResponse.json({ error: 'URL too long' }, { status: 400 });
  }

  // ... rest of validation
}
```

---

## Low Priority Suggestions

### 8. **Code Duplication - DRY Violation**

**Location:** Both API routes define `ALLOWED_DOWNLOAD_DOMAINS`

**Issue:** Domain whitelist duplicated across files.

**Recommendation:**
```typescript
// In app/src/lib/security.ts:
export const ALLOWED_IMAGE_DOMAINS = [
  'googleusercontent.com',
  'lh3.google.com',
  // ... all domains
];

// In API routes:
import { ALLOWED_IMAGE_DOMAINS } from '@/lib/security';
```

---

### 9. **Inconsistent Error Handling**

**Location:** Avatar API line 77

**Issue:** Returns status 200 on error instead of error status:
```typescript
return NextResponse.json(
  { error: 'Failed to fetch avatar', details: String(error), dataUrl: '' },
  { status: 200 } // Should be 500!
);
```

**Recommendation:**
```typescript
return NextResponse.json(
  { error: 'Failed to fetch avatar', dataUrl: '' },
  { status: 500 }
);
```

---

### 10. **Missing Security Headers**

**Location:** Both API routes

**Issue:** Download API has `X-Content-Type-Options` but missing other security headers.

**Recommendation:**
```typescript
headers.set('X-Content-Type-Options', 'nosniff');
headers.set('Content-Security-Policy', "default-src 'none'");
headers.set('X-Frame-Options', 'DENY');
headers.set('Referrer-Policy', 'no-referrer');
```

---

## Positive Observations

✅ **Excellent structure:** Security module is well-organized and reusable

✅ **Defense in depth:** Multiple layers of validation (URL → IP → Content-Type → Size)

✅ **Good logging:** Security-relevant events logged for monitoring

✅ **Timeout protection:** AbortController prevents hanging requests

✅ **Type safety:** Return objects with `valid` and `error` properties

✅ **Private IP blocking:** Comprehensive regex patterns for internal networks

✅ **Protocol restriction:** Only HTTP/HTTPS allowed

✅ **Filename sanitization:** Path traversal protection well-implemented

✅ **Domain whitelisting:** Prevents access to arbitrary domains

✅ **Clean code:** Follows KISS principle, easy to understand

---

## Testing Recommendations

### Critical Tests Needed:

1. **SSRF bypass attempts:**
   - URL encoding tricks: `http://%31%37%32%2E%31%36%38%2E%31%2E%31`
   - IPv6 variations: `http://[::1]`
   - DNS rebinding simulation
   - Redirect chains: `http://allowed.com → http://internal-ip`

2. **Content-Type bypass:**
   - `image/jpeg; charset=ISO-8859-1`
   - `IMAGE/JPEG` (uppercase)
   - `image/svg+xml` with malicious payload

3. **Filename attacks:**
   - `../../etc/passwd`
   - `file.txt\x00.png`
   - `evil.png.php`
   - 10,000 character filenames

4. **Size limit bypass:**
   - No Content-Length header
   - Incorrect Content-Length
   - Chunked encoding abuse

### Suggested Test File:
```typescript
// app/src/lib/security.test.ts
import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  isAllowedAvatarUrl,
  sanitizeFilename,
  isValidImageContentType
} from './security';

describe('Security Utils', () => {
  describe('isValidUrl', () => {
    it('blocks private IPs', () => {
      expect(isValidUrl('http://127.0.0.1').valid).toBe(false);
      expect(isValidUrl('http://192.168.1.1').valid).toBe(false);
      expect(isValidUrl('http://10.0.0.1').valid).toBe(false);
    });

    it('allows public IPs', () => {
      expect(isValidUrl('http://1.1.1.1').valid).toBe(true);
      expect(isValidUrl('https://example.com').valid).toBe(true);
    });

    it('blocks non-http protocols', () => {
      expect(isValidUrl('file:///etc/passwd').valid).toBe(false);
      expect(isValidUrl('ftp://example.com').valid).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('prevents path traversal', () => {
      expect(sanitizeFilename('../../etc/passwd')).not.toContain('..');
      expect(sanitizeFilename('file.txt\x00.png')).not.toContain('\x00');
    });

    it('handles edge cases', () => {
      expect(sanitizeFilename('')).toMatch(/^image_\d+\.png$/);
      expect(sanitizeFilename('a'.repeat(1000))).toHaveLength(255);
    });
  });

  // Add more tests...
});
```

---

## Recommended Actions

### Immediate (Before Deploy):

1. ✅ **Fix Content-Length bypass** - Implement stream size tracking
2. ✅ **Add rate limiting** - Prevent abuse
3. ✅ **Remove SVG or add sanitization** - XSS protection
4. ✅ **Fix Avatar API error status** - Return 500 not 200 on errors

### Short Term:

5. **Add DNS rebinding protection** - If infrastructure allows
6. **Add input length validation** - URL/filename length limits
7. **Consolidate domain whitelist** - Remove duplication
8. **Add comprehensive test suite** - Security-focused tests

### Long Term:

9. **Add security headers** - CSP, X-Frame-Options, etc.
10. **Implement monitoring** - Alert on suspicious patterns
11. **Document security model** - Architecture decision records
12. **Security audit** - Professional penetration testing

---

## Security Checklist

| Control | Status | Notes |
|---------|--------|-------|
| SSRF Protection | ✅ Implemented | DNS rebinding risk remains |
| Private IP Blocking | ✅ Implemented | Comprehensive patterns |
| Domain Whitelisting | ✅ Implemented | Duplication needs fix |
| Path Traversal Protection | ✅ Implemented | Good sanitization |
| Content-Type Validation | ✅ Implemented | SVG XSS risk |
| File Size Limits | ⚠️ Partial | Header-only validation |
| Rate Limiting | ❌ Missing | DoS vulnerability |
| Input Length Validation | ❌ Missing | Add URL length checks |
| Error Handling | ⚠️ Partial | Status code issue |
| Security Headers | ⚠️ Partial | Add CSP/X-Frame-Options |
| Logging | ✅ Implemented | Good observability |
| Timeout Protection | ✅ Implemented | AbortController used |
| Tests | ❌ Missing | Critical gap |

---

## Metrics

- **Type Coverage:** ✅ Build passes, full TypeScript coverage
- **Test Coverage:** ❌ 0% (no tests present)
- **Linting Issues:** 0 (build clean)
- **Security Score:** B+ (strong foundation, gaps identified)
- **Code Quality:** A (clean, maintainable, follows principles)

---

## Unresolved Questions

1. **Infrastructure capabilities:** Does the deployment environment support DNS resolution checks for rebinding protection?

2. **SVG use case:** Are SVG files actually needed? If not, simpler to block entirely.

3. **Rate limiting backend:** Is Redis/shared cache available for distributed rate limiting?

4. **Monitoring setup:** Are security events logged to external monitoring system?

5. **Domain whitelist source:** How are `ALLOWED_*_DOMAINS` maintained? Need update process?

---

## Conclusion

The SSRF protection implementation demonstrates **strong security fundamentals** with a defense-in-depth approach. The code is clean, well-structured, and follows best practices. However, **critical gaps** in file size enforcement and rate limiting must be addressed before production deployment.

**Recommended Deployment Timeline:**
- **Immediate fixes:** 1-2 days (Content-Length, rate limit, SVG, error status)
- **Short-term improvements:** 1 week (DNS rebinding, input validation, tests)
- **Production-ready:** After immediate fixes + security audit

**Overall Grade:** B+ (Strong foundation, production-ready after critical fixes)
