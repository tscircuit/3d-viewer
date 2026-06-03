export function getGlobalObjLoaderCacheKey(url: string): string {
  try {
    const parsedUrl = new URL(url, "https://tscircuit.local")
    const isAbsoluteUrl = /^[a-z][a-z\d+\-.]*:/i.test(url)
    const isProtocolRelativeUrl = url.startsWith("//")
    const isRootRelativeUrl = url.startsWith("/")

    parsedUrl.searchParams.delete("cachebust_origin")

    if (isAbsoluteUrl) {
      return parsedUrl.toString()
    }

    const pathAndQuery = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`

    if (isProtocolRelativeUrl) {
      return `//${parsedUrl.host}${pathAndQuery}`
    }

    if (isRootRelativeUrl) {
      return pathAndQuery
    }

    return pathAndQuery.replace(/^\//, "")
  } catch {
    return url
  }
}
