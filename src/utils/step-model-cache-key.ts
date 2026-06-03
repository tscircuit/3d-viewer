export function getStepModelCacheKey(stepUrl: string): string {
  const hashIndex = stepUrl.indexOf("#")
  const urlWithoutHash =
    hashIndex === -1 ? stepUrl : stepUrl.slice(0, hashIndex)
  const hash = hashIndex === -1 ? "" : stepUrl.slice(hashIndex)
  const queryIndex = urlWithoutHash.indexOf("?")

  if (queryIndex === -1) {
    return stepUrl
  }

  const path = urlWithoutHash.slice(0, queryIndex)
  const query = urlWithoutHash.slice(queryIndex + 1)
  const filteredQuery = query
    .split("&")
    .filter((part) => part.split("=", 1)[0] !== "cachebust_origin")
    .join("&")

  if (!filteredQuery) {
    return `${path}${hash}`
  }

  return `${path}?${filteredQuery}${hash}`
}
