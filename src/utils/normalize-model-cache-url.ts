const CACHE_BUST_PARAMS = new Set(["cachebust_origin", "cachebust"])

export function normalizeModelCacheUrl(url: string) {
  try {
    const parsedUrl = new URL(url, globalThis.location?.href ?? "http://localhost")

    for (const param of CACHE_BUST_PARAMS) {
      parsedUrl.searchParams.delete(param)
    }

    const normalized = parsedUrl.toString()
    return parsedUrl.origin === "http://localhost"
      ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      : normalized
  } catch {
    return url.replace(/([?&])cachebust(?:_origin)?=[^&]*&?/g, "$1").replace(/[?&]$/, "")
  }
}
