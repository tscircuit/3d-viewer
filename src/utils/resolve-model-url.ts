const EASYEDA_PART_PROXY_RE = /^\/easyeda\/([^/?#]+)$/
const EASYEDA_MODEL_PROXY_RE = /^\/easyeda-models\/([^/?#]+)$/

export const resolveModelUrl = (
  modelUrl: string | undefined,
  resolveStaticAsset?: (modelUrl: string) => string,
) => {
  if (!modelUrl) return undefined
  if (resolveStaticAsset) return resolveStaticAsset(modelUrl)

  const easyedaPartMatch = modelUrl.match(EASYEDA_PART_PROXY_RE)
  if (easyedaPartMatch?.[1]) {
    return `https://modelcdn.tscircuit.com/easyeda_models/download?pn=${encodeURIComponent(easyedaPartMatch[1])}`
  }

  const easyedaModelMatch = modelUrl.match(EASYEDA_MODEL_PROXY_RE)
  if (easyedaModelMatch?.[1]) {
    return `https://modules.easyeda.com/3dmodel/${easyedaModelMatch[1]}`
  }

  return modelUrl
}
