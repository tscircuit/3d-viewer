/**
 * Returns a normalized cache key for a 3D model URL.
 *
 * Strips the `cachebust_origin` query parameter wherever it appears in the
 * query string, regardless of whether it has a value. `cachebust_origin`
 * records the consumer's origin and is not meaningful to the underlying
 * model — two URLs that differ only in `cachebust_origin` must hit the
 * same cache entry, otherwise the same model is fetched and parsed twice.
 *
 * Without this normalization the in-place regex previously used in
 * `useGlobalObjLoader` only matched the trailing empty form
 * (`&cachebust_origin=`) and missed the filled form
 * (`&cachebust_origin=https%3A%2F%2Ftscircuit.com`), which is what real
 * fixtures send (see `stories/assets/complex-board.json`,
 * `nine-key-keyboard.json`, etc.).
 */
export function get3DModelCacheKey(url: string): string {
  if (!url) return url

  const hashIndex = url.indexOf("#")
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : ""
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url

  const queryIndex = beforeHash.indexOf("?")
  if (queryIndex < 0) return beforeHash + hash

  const base = beforeHash.slice(0, queryIndex)
  const query = beforeHash.slice(queryIndex + 1)

  const filteredQuery = query
    .split("&")
    .filter(
      (pair) =>
        pair !== "cachebust_origin" && !pair.startsWith("cachebust_origin="),
    )
    .join("&")

  return filteredQuery ? `${base}?${filteredQuery}${hash}` : `${base}${hash}`
}
