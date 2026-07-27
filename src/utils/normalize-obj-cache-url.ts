/**
 * Returns a stable key for OBJ/WRL model fetch+parse caching.
 * EasyEDA CDN URLs often differ only by `cachebust_origin=...`, which should not
 * split the cache (same bytes, redundant loads).
 */
export function normalizeObjCacheUrl(url: string): string {
  const trimmed = url.replace(/&cachebust_origin=$/, "")
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      parsed.searchParams.delete("cachebust_origin")
      return parsed.toString()
    }
  } catch {
    // non-absolute URL or invalid
  }
  return trimmed
}
