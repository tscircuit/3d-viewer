export const normalizeModelCacheUrl = (url: string): string => {
  return url
    .replace(/([?&])cachebust_origin=[^&#]*(&)?/g, (_match, separator, hasMore) =>
      separator === "?" && hasMore ? "?" : hasMore ? "&" : "",
    )
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "")
}
