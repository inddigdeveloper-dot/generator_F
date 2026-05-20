// SECURITY NOTE: This is a frontend demo cache using localStorage.
// In production, use Redis or a backend database for persistent caching.
// Never store sensitive user data or raw tokens in this cache.

const CACHE_NAMESPACE = 'inddig_admin_error_analysis_';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheTTL() {
  const stored = localStorage.getItem('adminCacheTTL');
  const hours = stored ? parseInt(stored, 10) : 24;
  return hours * 60 * 60 * 1000;
}

export function generateErrorHash(errorData) {
  const key = [
    errorData.errorMessage?.slice(0, 120) ?? '',
    errorData.source ?? '',
    errorData.endpoint ?? errorData.pageUrl ?? '',
    String(errorData.httpStatus ?? ''),
    errorData.stackTrace?.split('\n').slice(0, 3).join('|') ?? '',
  ].join('::');

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${CACHE_NAMESPACE}${Math.abs(hash).toString(36)}`;
}

export function getCachedAnalysis(hash) {
  try {
    const raw = localStorage.getItem(hash);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const ttl = getCacheTTL();
    const age = Date.now() - entry.savedAt;

    if (age > ttl) {
      localStorage.removeItem(hash);
      return { expired: true };
    }

    return {
      analysis: entry.analysis,
      savedAt: entry.savedAt,
      model: entry.model,
      age,
      expired: false,
    };
  } catch {
    return null;
  }
}

export function saveCachedAnalysis(hash, analysis, model) {
  try {
    const entry = {
      analysis,
      model: model ?? 'unknown',
      savedAt: Date.now(),
    };
    localStorage.setItem(hash, JSON.stringify(entry));
    return true;
  } catch (e) {
    // localStorage quota exceeded
    console.warn('Cache write failed:', e.message);
    return false;
  }
}

export function clearExpiredCache() {
  const ttl = getCacheTTL();
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_NAMESPACE)) continue;

    try {
      const raw = localStorage.getItem(key);
      const entry = JSON.parse(raw);
      if (Date.now() - entry.savedAt > ttl) {
        keysToRemove.push(key);
      }
    } catch {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(k => localStorage.removeItem(k));
  return keysToRemove.length;
}

export function clearAllAdminCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_NAMESPACE)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  return keysToRemove.length;
}

export function getCacheStats() {
  let total = 0;
  let expired = 0;
  const ttl = getCacheTTL();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_NAMESPACE)) continue;
    total++;
    try {
      const raw = localStorage.getItem(key);
      const entry = JSON.parse(raw);
      if (Date.now() - entry.savedAt > ttl) expired++;
    } catch {
      expired++;
    }
  }

  return { total, expired, active: total - expired };
}
