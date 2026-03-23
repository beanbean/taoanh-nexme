# Client-Side Runtime Error Analysis
**Report Date:** 2026-03-06 | **Project:** taoanh.nexme.vn

---

## Executive Summary

Codebase audit identified **8 critical and high-severity runtime errors** that can cause "Application error: a client-side exception has occurred" on Cloudflare Workers.

**Key Issues:**
1. Unsafe environment variable access without nullability checks
2. Missing error boundaries for critical async operations
3. Unhandled promise rejections in form interactions
4. Browser API calls on non-browser contexts
5. Canvas API calls that could fail silently
6. Image loading timing issues

---

## Critical Issues

### 1. **CRITICAL: Unsafe Environment Variable Access in `supabase.ts`**
**File:** `src/lib/supabase.ts`  
**Lines:** 4-5

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**Issue:** Non-null assertions (`!`) assume env vars always exist. On Cloudflare Workers, if vars aren't properly bound during deploy:
- Both will be `undefined` strings
- Supabase client initialization **crashes with "Cannot read property of undefined"**
- Affects **all client components** importing from supabase.ts

**Impact:** 💥 **BLOCKS all auth operations**, page loads fail immediately  
**Reproduction:** Deploy without env vars bound in wrangler.jsonc

**Root Cause:** wrangler.jsonc missing `env` section for Cloudflare environment variables

---

### 2. **CRITICAL: Missing Nullability Check on Avatar URL**
**File:** `src/app/dashboard/page.tsx`  
**Line:** 224

```typescript
async function avatarToBase64(url: string | null): Promise<string> {
  if (!url || url.trim() === '') return '';  // ← CRASH HERE if url is null
  try {
    const img = new Image();
    img.src = url;  // ← String method called on null
```

**Issue:** 
- `url.trim()` crashes if `url === null` (null doesn't have .trim())
- Early return check comes **after** potential null usage
- Called from line 316 in image generation loop

**Impact:** 💥 **Image generation fails silently**, rendering stops without user feedback

**Stack Trace Pattern:**
```
TypeError: Cannot read property 'trim' of null
  at avatarToBase64 (dashboard/page.tsx:224)
  at handleGenerateImages (dashboard/page.tsx:316)
```

---

### 3. **HIGH: Canvas Element Creation on Server Context**
**File:** `src/app/dashboard/page.tsx`  
**Lines:** 233-238

```typescript
const canvas = document.createElement('canvas');
canvas.width = img.naturalWidth;
canvas.height = img.naturalHeight;
const ctx = canvas.getContext('2d')!;  // ← Non-null assertion
ctx.drawImage(img, 0, 0);
return canvas.toDataURL('image/jpeg', 0.8);
```

**Issue:**
- `getContext('2d')` can return `null` on worker contexts or when canvas is detached
- Non-null assertion masks real failures
- `toDataURL()` may throw if canvas state is invalid
- Called inside try-catch but errors swallowed silently (returns `''`)

**Impact:** Avatar conversion silently fails, images generated without avatars

**Missing:** Nullability check for `ctx`

---

### 4. **HIGH: Unhandled Promise Rejection in Image Download**
**File:** `src/components/ImagePreview.tsx`  
**Lines:** 15-50

```typescript
async function downloadImage(url: string, filename: string) {
  try {
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const response = await fetch(downloadUrl);  // ← NO CATCH FOR NETWORK ERRORS

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      // ...
    }

    const contentType = response.headers.get('content-type') || '';
    // ...
  } catch (error) {
    console.error('Error downloading image:', error);
    alert('Lỗi khi tải ảnh. Vui lòng thử lại.');  // ← Only caught here
  }
}
```

**Issue:**
- `response.json()` on line 21 can throw if body is not valid JSON
- Error swallowed in `.catch(() => null)`
- Promise rejection may occur after try-catch scope
- Called in sequence loop (line 55-56) without per-iteration error handling

**Impact:** Multiple image downloads fail but loop continues, user sees partial success

---

### 5. **HIGH: Unhandled Promise Chain in Download All**
**File:** `src/components/ImagePreview.tsx`  
**Lines:** 52-59

```typescript
async function downloadAll() {
  setDownloading(true);
  for (const image of images) {
    await downloadImage(image.url, image.filename);
    await new Promise(r => setTimeout(r, 500));
  }
  setDownloading(false);  // ← Runs even if loop failed
}
```

**Issue:**
- If any `downloadImage()` throws, the loop breaks but `setDownloading(false)` still executes
- State becomes inconsistent
- No error handling at loop level
- User sees "Done" but only 1 of N images downloaded

**Impact:** Silent failures in batch downloads

---

### 6. **HIGH: DOM API Usage Without Context Check**
**File:** `src/components/ImagePreview.tsx`  
**Lines:** 38-43

```typescript
const link = document.createElement('a');
link.href = blobUrl;
link.download = filename;
document.body.appendChild(link);  // ← May fail on SSR/worker context
link.click();
document.body.removeChild(link);
```

**Issue:**
- `document` is undefined during SSR or in worker contexts
- No typeof check before access
- Line 36: `URL.createObjectURL()` can fail if blob is invalid

**Impact:** Download fails with "document is not defined"

**Missing:** 
```typescript
if (typeof document === 'undefined') return;
```

---

### 7. **HIGH: Image Load Timeout Not Handled**
**File:** `src/app/dashboard/page.tsx`  
**Lines:** 226-232

```typescript
const img = new Image();
img.crossOrigin = 'anonymous';
await new Promise<void>((resolve, reject) => {
  img.onload = () => resolve();
  img.onerror = () => reject(new Error('Failed to load image'));
  img.src = url;
});
```

**Issue:**
- No timeout mechanism: if image never loads, promise hangs forever
- `onerror` only fires on HTTP errors, not CORS violations
- CORS preflight failures may not trigger onerror
- Hung promise blocks entire render operation

**Impact:** Users see "Application error" if external image unreachable

---

### 8. **MEDIUM: Unsafe Window.location.reload()**
**File:** `src/app/dashboard/page.tsx`  
**Lines:** 565, 621

```typescript
onClick={() => window.location.reload()}
```

**Issue:**
- No typeof guard: `window` may be undefined in worker context
- Hard reload discards all unsaved state
- Better to use Next.js router

**Impact:** Page reload fails silently, "Check again" button doesn't work

---

## Environment Variable Issues

### **Problem: Missing Cloudflare Env Binding**
**File:** `app/wrangler.jsonc`

```jsonc
// Current config - NO ENV SECTION
{
  "main": ".open-next/worker.js",
  "name": "app",
  // Missing:
  // "env": {
  //   "production": {
  //     "vars": {
  //       "NEXT_PUBLIC_SUPABASE_URL": "...",
  //       "NEXT_PUBLIC_SUPABASE_ANON_KEY": "..."
  //     }
  //   }
  // }
}
```

**Impact:** Process.env vars in `supabase.ts` become undefined, entire app crashes on worker init

---

## Missing Error Boundaries

**No Error Boundary Component Found**

The app lacks a top-level error boundary. React errors anywhere crash entire app:

```typescript
// Missing: src/components/ErrorBoundary.tsx or similar
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div>Application error occurred</div>;
    }
    return this.props.children;
  }
}
```

**Impact:** Single error crashes entire page, no graceful fallback

---

## Unhandled Promise Rejections

### In `page.tsx` - handleGenerateImages()
**Lines:** 293-395

```typescript
async function handleGenerateImages() {
  // ... validation ...
  setRendering(true);
  try {
    // Image generation loop - individual failures not caught
    for (const player of selectedPlayersList) {
      const avatarDataUrl = await avatarToBase64(player.avatar_url);  // ← May throw
      // ... render request ...
      const result: RenderResponse = await response.json();  // ← May throw
    }
  } catch (error) {
    console.error('Error generating images:', error);
    alert('Lỗi khi tạo ảnh. Vui lòng thử lại.');
  } finally {
    setRendering(false);
  }
}
```

**Issue:**
- Render API errors not differentiated (network vs. API error)
- If one player fails, entire generation aborts
- No retry logic or per-player error tracking

---

## Hydration Issues

### Potential Issues (Not Direct Bugs, But High Risk)

1. **Image Preview Modal** (`ImagePreview.tsx`):
   - Uses `useState(0)` for image index
   - If images array changes during render, index could be out of bounds
   - Line 135: `images[currentImageIndex]` could throw

2. **Dynamic Rendering**:
   - Dashboard has conditional rendering based on `approvalStatus`
   - If loading state changes mid-render, hydration mismatch occurs

---

## Browser API Incompatibilities on Cloudflare

| API | File | Line | Issue |
|-----|------|------|-------|
| `document.createElement()` | `ImagePreview.tsx` | 38 | SSR incompatible |
| `document.body` | `ImagePreview.tsx` | 41 | May be null |
| `window.location.reload()` | `dashboard/page.tsx` | 565 | SSR incompatible |
| `URL.createObjectURL()` | `ImagePreview.tsx` | 36 | May fail on blob |
| `canvas.getContext('2d')` | `dashboard/page.tsx` | 236 | Can return null |

---

## Summary Table

| Severity | Issue | File | Line | Type |
|----------|-------|------|------|------|
| 🔴 CRITICAL | Env vars undefined | supabase.ts | 4-5 | Env Config |
| 🔴 CRITICAL | null.trim() crash | dashboard/page.tsx | 224 | Null Check |
| 🟠 HIGH | Canvas context null | dashboard/page.tsx | 236 | Null Check |
| 🟠 HIGH | Promise rejection | ImagePreview.tsx | 21 | Error Handling |
| 🟠 HIGH | Download loop error | ImagePreview.tsx | 55-56 | Error Handling |
| 🟠 HIGH | DOM access | ImagePreview.tsx | 38-43 | SSR Safety |
| 🟠 HIGH | Image load timeout | dashboard/page.tsx | 228 | Timeout |
| 🟡 MEDIUM | window undefined | dashboard/page.tsx | 565 | SSR Safety |
| 🟡 MEDIUM | No error boundary | - | - | Architecture |

---

## Recommendations

### Immediate Fixes (Blocking Production)

1. **Fix env var access:**
   ```typescript
   // supabase.ts
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   
   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase env vars');
   }
   ```

2. **Fix null.trim() crash:**
   ```typescript
   if (!url) return '';
   const trimmed = typeof url === 'string' ? url.trim() : '';
   if (trimmed === '') return '';
   ```

3. **Add context check to canvas:**
   ```typescript
   const ctx = canvas.getContext('2d');
   if (!ctx) throw new Error('Failed to get canvas context');
   ```

4. **Add timeout to image loading:**
   ```typescript
   const timeoutPromise = new Promise<void>((_, reject) =>
     setTimeout(() => reject(new Error('Image load timeout')), 5000)
   );
   await Promise.race([loadPromise, timeoutPromise]);
   ```

### High Priority

5. Add error boundary component at app root
6. Update wrangler.jsonc with env section
7. Add typeof guards before DOM access
8. Implement per-item error tracking in batch operations

---

## Unresolved Questions

- Is the render API timeout (30s) sufficient for complex images?
- Should avatar loading failures block entire image generation?
- Is 5000ms avatar timeout appropriate for all network conditions?
- Should failed downloads skip with warning or abort batch?

