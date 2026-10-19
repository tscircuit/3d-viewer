declare global {
  interface Window {
    TSCIRCUIT_JSCDN_BASE_URL?: string
  }
}

export function getRuntimeAssetUrl(
  packageName: string,
  version: string,
  path: string,
): string {
  const baseUrl =
    typeof window !== "undefined" ? window.TSCIRCUIT_JSCDN_BASE_URL : undefined
  if (!baseUrl) {
    return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`
  }

  return new URL(
    `${baseUrl.replace(/\/+$/, "")}/${packageName}/${version}/${path}`,
    window.location.href,
  ).href
}
