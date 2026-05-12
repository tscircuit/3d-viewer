export function getModelCacheKey(url: string): string {
  try {
    const parsedUrl = new URL(url, "http://tscircuit.local")
    parsedUrl.searchParams.delete("cachebust_origin")

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return parsedUrl.toString()
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  } catch {
    return url.replace(
      /([?&])cachebust_origin=[^&#]*(&?)/,
      (_match, prefix, suffix) => {
        if (prefix === "?" && suffix) return "?"
        if (prefix === "?" && !suffix) return ""
        if (prefix === "&" && suffix) return "&"
        return ""
      },
    )
  }
}
