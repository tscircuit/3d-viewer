export function normalizeLoaderUrl(url: string) {
  const [withoutHash, hash = ""] = url.split("#")
  const [path, query = ""] = withoutHash.split("?")

  const searchParams = new URLSearchParams(query)
  searchParams.delete("cachebust_origin")

  const normalizedQuery = searchParams.toString()
  const normalizedUrl = normalizedQuery ? `${path}?${normalizedQuery}` : path

  return hash ? `${normalizedUrl}#${hash}` : normalizedUrl
}
