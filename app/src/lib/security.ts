/**
 * Security utilities for URL validation and sanitization
 * Prevents SSRF (Server-Side Request Forgery) attacks
 */

// Allowed domains for avatar fetching
const ALLOWED_AVATAR_DOMAINS = [
  'googleusercontent.com',
  'lh3.google.com',
  'lh4.google.com',
  'lh5.google.com',
  'lh6.google.com',
  'gravatar.com',
  'secure.gravatar.com',
  'avatars.githubusercontent.com',
  'github.com',
];

// Blocked IP ranges (private networks)
const BLOCKED_IP_PATTERNS = [
  /^127\./,                    // Loopback
  /^10\./,                     // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
  /^192\.168\./,               // Class C private
  /^169\.254\./,               // Link-local
  /^0\.0\.0\.0/,               // All interfaces
  /^::1$/,                     // IPv6 loopback
  /^fc00:/i,                   // IPv6 private
  /^fe80:/i,                   // IPv6 link-local
];

/**
 * Validates if a URL is safe to fetch from (prevents SSRF)
 */
export function isValidUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Invalid protocol. Only http and https are allowed.' };
    }

    // Check for blocked IP patterns in hostname
    const hostname = url.hostname;
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Access to private IP addresses is not allowed.' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Validates if a URL is from allowed avatar domains
 */
export function isAllowedAvatarUrl(urlString: string): { valid: boolean; error?: string } {
  // First, basic URL validation
  const basicCheck = isValidUrl(urlString);
  if (!basicCheck.valid) {
    return basicCheck;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Check if hostname ends with any allowed domain
    const isAllowed = ALLOWED_AVATAR_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain not allowed. Allowed domains: ${ALLOWED_AVATAR_DOMAINS.join(', ')}`
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Sanitizes a filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators
  let sanitized = filename.replace(/[\/\\]/g, '');

  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove any leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/g, '');

  // Only allow alphanumeric, dash, underscore, and common image extensions
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.slice(0, -(ext.length + 1));
    sanitized = name.slice(0, 250 - ext.length) + '.' + ext;
  }

  // Ensure we have a valid filename
  if (!sanitized || sanitized === '.') {
    sanitized = 'download_' + Date.now();
  }

  return sanitized;
}

/**
 * Validates content type for images
 */
export function isValidImageContentType(contentType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
  ];

  const normalizedType = contentType.toLowerCase().split(';')[0].trim();
  return validTypes.includes(normalizedType);
}
